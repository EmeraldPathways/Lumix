import "server-only";
import type { PoolClient } from "pg";
import { G9RecipeSchema, type G9Recipe } from "../recipes/schema";
import { hasControlledEvidencePair, RecipeTestRecordSchema, type RecipeTestRecord } from "../admin/test-record";
import type { AdminActor } from "../admin/recipe-service";
import { getDatabasePool } from "./pool";

const CATEGORY_NAMES: Record<G9Recipe["category"], string> = {
  "colour-negative": "Colour Negative",
  "classic-colour": "Classic Colour",
  cinematic: "Cinematic",
  monochrome: "Monochrome",
};

export class AdminRecipeNotFoundError extends Error {
  constructor(slug: string) { super(`Recipe “${slug}” was not found.`); this.name = "AdminRecipeNotFoundError"; }
}

export class AdminRecipeConflictError extends Error {
  constructor() { super("This recipe changed in another session. Reload it before saving."); this.name = "AdminRecipeConflictError"; }
}

export class AdminRecipeEvidenceError extends Error {
  constructor() { super("Choose uploaded control and result JPEGs from the same original-G9 controlled pair before recording this test."); this.name = "AdminRecipeEvidenceError"; }
}

type AdminRecipeRow = { document: unknown; archived_at: Date | string | null };

function readDocument(input: unknown): G9Recipe | undefined {
  let document = input;
  if (typeof document === "string") {
    try { document = JSON.parse(document) as unknown; } catch { return undefined; }
  }
  const parsed = G9RecipeSchema.safeParse(document);
  return parsed.success ? parsed.data : undefined;
}

export async function listAdminRecipes(): Promise<Array<{ recipe: G9Recipe; archivedAt: string | null }>> {
  const { rows } = await getDatabasePool().query<AdminRecipeRow>(
    "SELECT document, archived_at FROM recipes ORDER BY archived_at NULLS FIRST, featured DESC, updated_at DESC, slug ASC",
  );
  return rows.flatMap(({ document, archived_at }) => {
    const recipe = readDocument(document);
    if (!recipe) {
      console.error("Skipping an invalid recipe document in the administrator catalogue.");
      return [];
    }
    return [{ recipe, archivedAt: archived_at ? new Date(archived_at).toISOString() : null }];
  });
}

export async function getAdminRecipeBySlug(slug: string): Promise<G9Recipe | undefined> {
  const { rows } = await getDatabasePool().query<{ document: unknown }>("SELECT document FROM recipes WHERE slug=$1 LIMIT 1", [slug]);
  return rows[0] ? readDocument(rows[0].document) : undefined;
}

export async function createAdminRecipe(recipe: G9Recipe, actor: AdminActor): Promise<G9Recipe> {
  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    await ensureCategory(client, recipe.category);
    await client.query(
      `INSERT INTO recipes (id, slug, title, description, category_id, settings, document, firmware_minimum, validation_status, published, featured, sort_order, created_by, updated_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13,$13,$14,$15)`,
      [recipe.id, recipe.slug, recipe.title, recipe.description, recipe.category, JSON.stringify(recipe.settings), JSON.stringify(recipe), recipe.firmwareMinimum, recipe.validationStatus, recipe.published, recipe.featured, recipe.sortOrder, actor.userId, recipe.createdAt, recipe.updatedAt],
    );
    await syncTags(client, recipe);
    await recordRevision(client, recipe, actor.userId, "Created recipe", 1);
    await client.query("COMMIT");
    return recipe;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAdminRecipe(existingSlug: string, input: G9Recipe, actor: AdminActor, changeNotes: string, expectedUpdatedAt?: string): Promise<G9Recipe> {
  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ document: unknown; updated_at: Date | string }>(
      "SELECT document, updated_at FROM recipes WHERE slug = $1 FOR UPDATE",
      [existingSlug],
    );
    if (!current.rows[0]) throw new AdminRecipeNotFoundError(existingSlug);
    const previous = readDocument(current.rows[0].document);
    if (!previous) throw new Error("The stored recipe document is invalid and cannot be edited safely.");
    const previousUpdatedAt = new Date(current.rows[0].updated_at).toISOString();
    if (expectedUpdatedAt && expectedUpdatedAt !== previous.updatedAt && expectedUpdatedAt !== previousUpdatedAt) throw new AdminRecipeConflictError();

    const recipe: G9Recipe = {
      ...input,
      id: previous.id,
      createdAt: previous.createdAt,
      updatedAt: new Date().toISOString(),
      testEvidence: input.testEvidence ?? previous.testEvidence,
    };
    await ensureCategory(client, recipe.category);
    const version = await nextRevision(client, existingSlug);
    await recordRevision(client, previous, actor.userId, changeNotes, version);
    await client.query(
      `UPDATE recipes SET slug=$2, title=$3, description=$4, category_id=$5, settings=$6::jsonb, document=$7::jsonb, firmware_minimum=$8, validation_status=$9, published=$10, featured=$11, sort_order=$12, archived_at=NULL, updated_by=$13, updated_at=$14 WHERE slug=$1`,
      [existingSlug, recipe.slug, recipe.title, recipe.description, recipe.category, JSON.stringify(recipe.settings), JSON.stringify(recipe), recipe.firmwareMinimum, recipe.validationStatus, recipe.published, recipe.featured, recipe.sortOrder, actor.userId, recipe.updatedAt],
    );
    if (recipe.slug !== existingSlug) {
      await recordRevision(client, recipe, actor.userId, `Recipe renamed from ${existingSlug}: ${changeNotes}`, await nextRevision(client, recipe.slug));
    }
    await syncTags(client, recipe);
    await client.query("COMMIT");
    return recipe;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function archiveAdminRecipe(slug: string, actor: AdminActor): Promise<void> {
  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ document: unknown }>("SELECT document FROM recipes WHERE slug=$1 FOR UPDATE", [slug]);
    if (!current.rows[0]) throw new AdminRecipeNotFoundError(slug);
    const previous = readDocument(current.rows[0].document);
    if (!previous) throw new Error("The stored recipe document is invalid and cannot be archived safely.");
    const recipe = { ...previous, published: false, featured: false, updatedAt: new Date().toISOString() };
    await recordRevision(client, previous, actor.userId, "Archived recipe", await nextRevision(client, slug));
    await client.query("UPDATE recipes SET published=false, featured=false, archived_at=now(), document=$2::jsonb, updated_by=$3, updated_at=$4 WHERE slug=$1", [slug, JSON.stringify(recipe), actor.userId, recipe.updatedAt]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function unarchiveAdminRecipe(slug: string, actor: AdminActor): Promise<void> {
  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ document: unknown }>("SELECT document FROM recipes WHERE slug=$1 AND archived_at IS NOT NULL FOR UPDATE", [slug]);
    if (!current.rows[0]) throw new AdminRecipeNotFoundError(slug);
    const previous = readDocument(current.rows[0].document);
    if (!previous) throw new Error("The stored recipe document is invalid and cannot be restored safely.");
    const recipe = { ...previous, updatedAt: new Date().toISOString() };
    await recordRevision(client, previous, actor.userId, "Restored archived recipe as unpublished", await nextRevision(client, slug));
    await client.query("UPDATE recipes SET archived_at=NULL, document=$2::jsonb, updated_by=$3, updated_at=$4 WHERE slug=$1", [slug, JSON.stringify(recipe), actor.userId, recipe.updatedAt]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function deleteAdminRecipe(slug: string, actor: AdminActor): Promise<void> {
  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ document: unknown }>("SELECT document FROM recipes WHERE slug=$1 FOR UPDATE", [slug]);
    if (!current.rows[0]) throw new AdminRecipeNotFoundError(slug);
    const previous = readDocument(current.rows[0].document);
    if (previous) await recordRevision(client, previous, actor.userId, "Deleted recipe", await nextRevision(client, slug));
    await client.query("DELETE FROM recipes WHERE slug=$1", [slug]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function saveRecipeImage(input: {
  recipeSlug: string;
  storagePath: string;
  imageUrl: string;
  imageType: "hero" | "camera-jpeg" | "control" | "experimental-result";
  authenticityType: "illustrative" | "g9-capture" | "controlled-pair";
  photographer: string;
  licence: string;
  metadata: Record<string, unknown>;
}, actor: AdminActor) {
  const { rows } = await getDatabasePool().query(
    `INSERT INTO recipe_images (recipe_slug, storage_path, image_url, image_type, authenticity_type, photographer, licence, metadata, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
     RETURNING id, recipe_slug, storage_path, image_url, image_type, authenticity_type, photographer, licence, metadata, created_at`,
    [input.recipeSlug, input.storagePath, input.imageUrl, input.imageType, input.authenticityType, input.photographer, input.licence, JSON.stringify(input.metadata), actor.userId],
  );
  return rows[0];
}

export async function listRecipeImages(recipeSlug: string) {
  const { rows } = await getDatabasePool().query(
    "SELECT id, recipe_slug, storage_path, image_url, image_type, authenticity_type, photographer, licence, metadata, created_at FROM recipe_images WHERE recipe_slug=$1 ORDER BY created_at DESC",
    [recipeSlug],
  );
  return rows;
}

export async function deleteRecipeImage(imageId: number) {
  const { rows } = await getDatabasePool().query<{ storage_path: string; image_url: string }>(
    "DELETE FROM recipe_images WHERE id=$1 RETURNING storage_path, image_url",
    [imageId],
  );
  return rows[0];
}

export async function getRecipeImageById(imageId: number) {
  const { rows } = await getDatabasePool().query<{ storage_path: string; image_url: string }>(
    "SELECT storage_path, image_url FROM recipe_images WHERE id=$1 LIMIT 1",
    [imageId],
  );
  return rows[0];
}

export async function recordAdminCameraTest(slug: string, input: RecipeTestRecord, actor: AdminActor) {
  const record = RecipeTestRecordSchema.parse(input);
  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ document: unknown }>("SELECT document FROM recipes WHERE slug=$1 FOR UPDATE", [slug]);
    if (!current.rows[0]) throw new AdminRecipeNotFoundError(slug);
    const previous = readDocument(current.rows[0].document);
    if (!previous) throw new Error("The stored recipe document is invalid and cannot be tested safely.");
    const evidenceRows = await client.query<{ image_url: string; image_type: string; authenticity_type: string; metadata: unknown }>(
      "SELECT image_url, image_type, authenticity_type, metadata FROM recipe_images WHERE recipe_slug=$1 AND image_url=ANY($2::text[]) FOR SHARE",
      [slug, [record.evidence.controlJpegUrl, record.evidence.resultJpegUrl]],
    );
    const evidenceImages = evidenceRows.rows.map((row) => ({ imageUrl: row.image_url, imageType: row.image_type, authenticityType: row.authenticity_type, metadata: row.metadata }));
    if (!hasControlledEvidencePair(evidenceImages, record.evidence)) throw new AdminRecipeEvidenceError();
    const revisionResult = await client.query<{ version: number }>("SELECT COALESCE(MAX(version), 1) AS version FROM recipe_revisions WHERE recipe_slug=$1", [slug]);
    const revision = Number(revisionResult.rows[0].version);
    await client.query(
      `INSERT INTO recipe_tests (recipe_slug, revision, firmware_version, test_conditions, findings, evidence, verification_status, tested_by, tested_at, created_by)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6::jsonb,$7,$8,$9,$10)`,
      [slug, revision, record.firmwareVersion, JSON.stringify({ cameraModel: record.cameraModel, lens: record.lens, lightingConditions: record.lightingConditions, whiteBalance: record.whiteBalance, exposureDetails: record.exposureDetails }), record.findings, JSON.stringify(record.evidence), record.verificationStatus, record.evidence.photographer, record.testedAt, actor.userId],
    );

    if (record.verificationStatus !== "rejected") {
      const recipe = G9RecipeSchema.parse({
        ...previous,
        validationStatus: record.verificationStatus,
        preview: {
          ...previous.preview,
          src: record.evidence.resultJpegUrl,
          alt: `Original DC-G9 controlled result for ${previous.title}, compared against the same-scene control photograph.`,
          authenticity: "g9-tested",
          photographer: record.evidence.photographer,
          licence: previous.preview.licence,
        },
        testEvidence: {
          firmwareVersion: record.firmwareVersion,
          testedAt: record.testedAt,
          lens: record.lens,
          testNotes: record.findings,
          controlJpegUrl: record.evidence.controlJpegUrl,
          resultJpegUrl: record.evidence.resultJpegUrl,
          sameScenePair: true,
          photographer: record.evidence.photographer,
        },
        updatedAt: new Date().toISOString(),
      });
      await recordRevision(client, previous, actor.userId, `Recorded ${record.verificationStatus} test`, await nextRevision(client, slug));
      await client.query(
        "UPDATE recipes SET document=$2::jsonb, validation_status=$3, updated_by=$4, updated_at=$5 WHERE slug=$1",
        [slug, JSON.stringify(recipe), recipe.validationStatus, actor.userId, recipe.updatedAt],
      );
    }
    await client.query("COMMIT");
    return record;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function listRecipeTests(slug: string) {
  const { rows } = await getDatabasePool().query(
    "SELECT id, recipe_slug, revision, firmware_version, test_conditions, findings, evidence, verification_status, tested_by, tested_at FROM recipe_tests WHERE recipe_slug=$1 ORDER BY tested_at DESC",
    [slug],
  );
  return rows;
}

export async function listRecipeRevisions(slug: string) {
  const { rows } = await getDatabasePool().query(
    "SELECT id, recipe_slug, version, settings_snapshot, document_snapshot, change_notes, changed_by, created_at FROM recipe_revisions WHERE recipe_slug=$1 ORDER BY version DESC",
    [slug],
  );
  return rows;
}

async function ensureCategory(client: PoolClient, category: G9Recipe["category"]) {
  await client.query(
    "INSERT INTO recipe_categories (slug, name) VALUES ($1,$2) ON CONFLICT (slug) DO NOTHING",
    [category, CATEGORY_NAMES[category]],
  );
}

async function syncTags(client: PoolClient, recipe: G9Recipe) {
  await client.query("DELETE FROM recipe_tag_relations WHERE recipe_slug=$1", [recipe.slug]);
  for (const tag of recipe.tags) {
    const slug = tag.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
    if (!slug) continue;
    await client.query("INSERT INTO recipe_tags (slug, name) VALUES ($1,$2) ON CONFLICT (slug) DO NOTHING", [slug, tag]);
    await client.query("INSERT INTO recipe_tag_relations (recipe_slug, tag_slug) VALUES ($1,$2) ON CONFLICT DO NOTHING", [recipe.slug, slug]);
  }
}

async function nextRevision(client: PoolClient, slug: string) {
  const { rows } = await client.query<{ version: number }>("SELECT COALESCE(MAX(version), 0) + 1 AS version FROM recipe_revisions WHERE recipe_slug=$1", [slug]);
  return Number(rows[0].version);
}

async function recordRevision(client: PoolClient, recipe: G9Recipe, adminUserId: string, notes: string, version?: number) {
  const resolvedVersion = version ?? await nextRevision(client, recipe.slug);
  await client.query(
    "INSERT INTO recipe_revisions (recipe_slug, version, settings_snapshot, document_snapshot, change_notes, changed_by) VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6)",
    [recipe.slug, resolvedVersion, JSON.stringify(recipe.settings), JSON.stringify(recipe), notes.slice(0, 1000), adminUserId],
  );
}
