import type { G9Recipe } from "../recipes/schema";

/** Resolve a shareable setup link against server recipes, then the user's local library. */
export async function resolveSetupRecipe(
  slug: string | undefined,
  publishedRecipe: G9Recipe | undefined,
  findLocal: (slug: string) => Promise<G9Recipe | undefined>,
): Promise<G9Recipe | undefined> {
  if (!slug) return undefined;
  if (publishedRecipe?.slug === slug) return publishedRecipe;
  const localRecipe = await findLocal(slug);
  return localRecipe?.slug === slug ? localRecipe : undefined;
}
