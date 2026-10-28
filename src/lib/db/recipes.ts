import "server-only";
import { neon } from "@neondatabase/serverless";
import { connection } from "next/server";
import { seedRecipes } from "../recipes/seed";
import { G9RecipeSchema, type G9Recipe } from "../recipes/schema";

type RecipeRow = { document?: unknown };

function parseRecipeDocument(value: unknown): G9Recipe | undefined {
  const document = typeof value === "string" ? parseJson(value) : value;
  const parsed = G9RecipeSchema.safeParse(document);
  if (!parsed.success || !parsed.data.published) return undefined;
  return parsed.data;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

/** Read the public catalogue; use bundled recipes only when no database is configured. */
export async function getPublishedRecipes(): Promise<G9Recipe[]> {
  const connectionString = process.env.DATABASE_READONLY_URL ?? process.env.DATABASE_URL;
  if (!connectionString) return seedRecipes.filter((recipe) => recipe.published);

  await connection();
  const sql = neon(connectionString);
  const rows = await sql`
    SELECT document
    FROM recipes
    WHERE published = true AND archived_at IS NULL
    ORDER BY featured DESC, sort_order ASC, slug ASC
  `;

  return (rows as unknown as RecipeRow[]).flatMap((row) => {
    const recipe = parseRecipeDocument(row.document);
    if (!recipe) {
      console.error("Skipping a published recipe row with an invalid document.");
      return [];
    }
    return [recipe];
  });
}

export async function getPublishedRecipeBySlug(slug: string): Promise<G9Recipe | undefined> {
  const connectionString = process.env.DATABASE_READONLY_URL ?? process.env.DATABASE_URL;
  if (!connectionString) return seedRecipes.find((recipe) => recipe.published && recipe.slug === slug);

  await connection();
  const sql = neon(connectionString);
  const rows = await sql`
    SELECT document
    FROM recipes
    WHERE slug = ${slug} AND published = true AND archived_at IS NULL
    LIMIT 1
  `;
  const resultRows = rows as unknown as RecipeRow[];
  return resultRows.length ? parseRecipeDocument(resultRows[0].document) : undefined;
}
