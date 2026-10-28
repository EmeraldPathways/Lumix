import type { MetadataRoute } from "next";
import { getPublishedRecipes } from "@/lib/db/recipes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://g9-film-lab.vercel.app";
  const recipes = await getPublishedRecipes();
  const staticPaths = ["", "/recipes", "/guide", "/compare"];
  const now = new Date();

  return [
    ...staticPaths.map((path) => ({ url: new URL(path, siteUrl).toString(), lastModified: now, changeFrequency: path === "/" ? "weekly" as const : "monthly" as const, priority: path === "" ? 1 : 0.7 })),
    ...recipes.map((recipe) => ({ url: new URL(`/recipes/${recipe.slug}`, siteUrl).toString(), lastModified: new Date(recipe.updatedAt), changeFrequency: "monthly" as const, priority: recipe.featured ? 0.8 : 0.6 })),
  ];
}
