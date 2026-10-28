import { seedRecipes } from "../recipes/seed";
import { G9RecipeSchema, type G9Recipe } from "../recipes/schema";

/** Minimal Postgres-compatible interface so seed behavior can be tested in PGlite. */
export interface SeedQueryClient {
  query<T = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
}

const categoryNames: Record<string, string> = {
  "colour-negative": "Colour Negative",
  "classic-colour": "Classic Colour",
  cinematic: "Cinematic",
  monochrome: "Monochrome",
};

function tagSlug(tag: string) {
  return tag.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

export async function seedRecipeCatalog(
  client: SeedQueryClient,
  sources: readonly G9Recipe[] = seedRecipes,
  adminEmails: readonly string[] = [],
) {
  let inserted = 0;
  let existing = 0;
  let authorizedAdmins = 0;

  for (const [slug, name] of Object.entries(categoryNames)) {
    await client.query("INSERT INTO recipe_categories (slug, name) VALUES ($1,$2) ON CONFLICT (slug) DO NOTHING", [slug, name]);
  }

  for (const source of sources) {
    const recipe = G9RecipeSchema.parse(source);
    const result = await client.query<{ slug: string }>(
      `INSERT INTO recipes (id, slug, title, description, category_id, settings, document, camera_model, firmware_minimum, validation_status, published, featured, sort_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,'DC-G9',$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (slug) DO NOTHING
       RETURNING slug`,
      [recipe.id, recipe.slug, recipe.title, recipe.description, recipe.category, JSON.stringify(recipe.settings), JSON.stringify(recipe), recipe.firmwareMinimum, recipe.validationStatus, recipe.published, recipe.featured, recipe.sortOrder, recipe.createdAt, recipe.updatedAt],
    );
    if (!result.rowCount) {
      existing += 1;
      continue;
    }
    inserted += 1;
    for (const tag of recipe.tags) {
      const slug = tagSlug(tag);
      if (!slug) continue;
      await client.query("INSERT INTO recipe_tags (slug, name) VALUES ($1,$2) ON CONFLICT (slug) DO NOTHING", [slug, tag]);
      await client.query("INSERT INTO recipe_tag_relations (recipe_slug, tag_slug) VALUES ($1,$2) ON CONFLICT DO NOTHING", [recipe.slug, slug]);
    }
  }

  for (const sourceEmail of adminEmails) {
    const email = sourceEmail.trim().toLowerCase();
    if (!email) continue;
    const result = await client.query("INSERT INTO admin_users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING RETURNING email", [email]);
    authorizedAdmins += result.rowCount ?? 0;
  }

  return { inserted, existing, authorizedAdmins };
}
