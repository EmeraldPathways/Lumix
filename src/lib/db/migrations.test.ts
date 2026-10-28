import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { seedRecipes } from "../recipes/seed";
import { seedRecipeCatalog } from "./seed";

const migrationPath = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
let database: PGlite | undefined;

afterEach(async () => {
  await database?.close();
  database = undefined;
});

describe("Neon PostgreSQL migrations", () => {
  it("apply cleanly and create protected catalog, identity, evidence and revision tables", async () => {
    database = new PGlite();
    const files = (await readdir(migrationPath)).filter((name) => name.endsWith(".sql")).sort();
    for (const file of files) await database.exec(await readFile(join(migrationPath, file), "utf8"));

    const tables = await database.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
    );
    expect(tables.rows.map(({ table_name }) => table_name)).toEqual(expect.arrayContaining([
      "user", "session", "account", "verification", "admin_users", "recipes", "recipe_categories", "recipe_tags", "recipe_tag_relations", "recipe_images", "recipe_tests", "recipe_revisions", "site_settings",
    ]));

    const rls = await database.query<{ relname: string; relrowsecurity: boolean }>(
      "SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('recipes', 'recipe_images', 'recipe_tests', 'admin_users') ORDER BY relname",
    );
    expect(rls.rows).toEqual([
      { relname: "admin_users", relrowsecurity: true },
      { relname: "recipe_images", relrowsecurity: true },
      { relname: "recipe_tests", relrowsecurity: true },
      { relname: "recipes", relrowsecurity: true },
    ]);
  });

  it("rejects a non-original camera model and a verified record without evidence", async () => {
    database = new PGlite();
    const files = (await readdir(migrationPath)).filter((name) => name.endsWith(".sql")).sort();
    for (const file of files) await database.exec(await readFile(join(migrationPath, file), "utf8"));
    const recipe = seedRecipes[0];
    await database.query("INSERT INTO recipe_categories (slug, name) VALUES ($1,$2)", [recipe.category, "Colour Negative"]);
    const valid = { ...recipe, id: "valid-recipe-id" };
    const values = [valid.id, valid.slug, valid.title, valid.description, valid.category, JSON.stringify(valid.settings), JSON.stringify(valid), valid.firmwareMinimum, valid.validationStatus, valid.published, valid.featured, valid.sortOrder, valid.createdAt, valid.updatedAt];
    await database.query(
      "INSERT INTO recipes (id,slug,title,description,category_id,settings,document,camera_model,firmware_minimum,validation_status,published,featured,sort_order,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,'DC-G9',$8,$9,$10,$11,$12,$13,$14)",
      values,
    );

    const wrongCamera = { ...recipe, id: "wrong-camera-id", slug: `${recipe.slug}-wrong-camera` };
    await expect(database.query(
      "INSERT INTO recipes (id,slug,title,description,category_id,settings,document,camera_model,firmware_minimum,validation_status,published,featured,sort_order,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,'DC-G9 II',$8,$9,$10,$11,$12,$13,$14)",
      [wrongCamera.id, wrongCamera.slug, wrongCamera.title, wrongCamera.description, wrongCamera.category, JSON.stringify(wrongCamera.settings), JSON.stringify(wrongCamera), wrongCamera.firmwareMinimum, wrongCamera.validationStatus, wrongCamera.published, wrongCamera.featured, wrongCamera.sortOrder, wrongCamera.createdAt, wrongCamera.updatedAt],
    )).rejects.toThrow();

    const verifiedSlug = `${recipe.slug}-verified`;
    const verified = { ...recipe, id: `${recipe.id}-verified`, slug: verifiedSlug, validationStatus: "camera-verified" as const, preview: { ...recipe.preview, authenticity: "g9-tested" as const } };
    await expect(database.query(
      "INSERT INTO recipes (id,slug,title,description,category_id,settings,document,camera_model,firmware_minimum,validation_status,published,featured,sort_order,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,'DC-G9',$8,$9,$10,$11,$12,$13,$14)",
      [verified.id, `${verified.slug}-verified`, verified.title, verified.description, verified.category, JSON.stringify(verified.settings), JSON.stringify(verified), verified.firmwareMinimum, verified.validationStatus, verified.published, verified.featured, verified.sortOrder, verified.createdAt, verified.updatedAt],
    )).rejects.toThrow();
  });

  it("seeds recipes idempotently without replacing edited catalogue content", async () => {
    database = new PGlite();
    const files = (await readdir(migrationPath)).filter((name) => name.endsWith(".sql")).sort();
    for (const file of files) await database.exec(await readFile(join(migrationPath, file), "utf8"));
    const client = database as unknown as Parameters<typeof seedRecipeCatalog>[0];
    const twoRecipes = seedRecipes.slice(0, 2);
    await database.query("BEGIN");
    const first = await seedRecipeCatalog(client, twoRecipes, ["admin@example.com"]);
    await database.query("COMMIT");
    expect(first).toEqual({ inserted: 2, existing: 0, authorizedAdmins: 1 });

    await database.query("UPDATE recipes SET title=$2, document=jsonb_set(document, '{title}', to_jsonb($2::text)) WHERE slug=$1", [twoRecipes[0].slug, "Edited in production"]);
    await database.query("BEGIN");
    const repeated = await seedRecipeCatalog(client, twoRecipes, ["admin@example.com"]);
    await database.query("COMMIT");

    expect(repeated).toEqual({ inserted: 0, existing: 2, authorizedAdmins: 0 });
    const stored = await database.query<{ title: string; document: { title: string } }>("SELECT title, document FROM recipes WHERE slug=$1", [twoRecipes[0].slug]);
    expect(stored.rows[0]).toEqual({ title: "Edited in production", document: expect.objectContaining({ title: "Edited in production" }) });
  });

  it("limits a non-owner catalogue reader to published recipes and denies writes", async () => {
    database = new PGlite();
    const files = (await readdir(migrationPath)).filter((name) => name.endsWith(".sql")).sort();
    for (const file of files) await database.exec(await readFile(join(migrationPath, file), "utf8"));
    const client = database as unknown as Parameters<typeof seedRecipeCatalog>[0];
    const published = seedRecipes[0];
    const draft = { ...seedRecipes[1], published: false };
    await seedRecipeCatalog(client, [published, draft]);
    await database.exec("CREATE ROLE g9_catalog_reader; GRANT SELECT ON recipes TO g9_catalog_reader; SET ROLE g9_catalog_reader");

    const visible = await database.query<{ slug: string }>("SELECT slug FROM recipes ORDER BY slug");
    expect(visible.rows.map(({ slug }) => slug)).toEqual([published.slug]);
    await expect(database.query("UPDATE recipes SET published=true WHERE slug=$1", [draft.slug])).rejects.toThrow();
  });
});
