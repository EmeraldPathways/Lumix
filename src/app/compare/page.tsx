import type { Metadata } from "next";
import { Suspense } from "react";
import { RecipeCompare } from "@/components/recipe-compare";
import { getPublishedRecipes } from "@/lib/db/recipes";

export const metadata: Metadata = {
  title: "Compare G9 Recipes",
  description: "Compare original Lumix G9 recipe settings and illustrative previews using one shared sample scene.",
  alternates: { canonical: "/compare" },
};

export default function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <main className="page-container compare-page">
      <div className="page-kicker"><span className="eyebrow-line" /> SIDE BY SIDE <span>·</span> SAME SCENE</div>
      <section className="compare-hero"><div><p className="eyebrow">Compare recipes</p><h1>Choose a look.<br /><em>See what changes.</em></h1></div><p>Pick up to four recipes to compare their G9 settings and the way each approximate browser treatment moves the same sample scene.</p></section>
      <Suspense fallback={<div className="empty-state" aria-label="Loading recipe comparisons">Loading recipes…</div>}><CompareContent searchParams={searchParams} /></Suspense>
    </main>
  );
}

async function CompareContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [recipes, params] = await Promise.all([getPublishedRecipes(), searchParams]);
  const initialSlugs = typeof params.recipes === "string" ? params.recipes.split(",").filter(Boolean) : recipes.filter((recipe) => recipe.featured).slice(0, 2).map((recipe) => recipe.slug);
  return <RecipeCompare recipes={recipes} initialSlugs={initialSlugs} />;
}
