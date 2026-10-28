import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, HardDrive } from "lucide-react";
import { MyRecipesDashboard } from "@/components/my-recipes-dashboard";
import { getPublishedRecipes } from "@/lib/db/recipes";

export const metadata: Metadata = {
  title: "My Recipes",
  description: "Access locally saved original Lumix G9 recipes, favourites, recent looks and your four-slot camera plan.",
  alternates: { canonical: "/my-recipes" },
};

export default function MyRecipesPage() {
  return (
    <main className="page-container myrecipes-page">
      <div className="page-kicker"><span className="eyebrow-line" /> YOUR LOCAL RECIPE BOOK</div>
      <section className="myrecipes-hero"><div><p className="eyebrow">Saved on this device</p><h1>Your recipes,<br /><em>close at hand.</em></h1></div><div><p>Favourites and personal recipes stay in this browser, with export and import so you can keep a backup. No account needed.</p><Link className="text-link" href="/studio">Create a recipe in Studio <ArrowUpRight size={14} /></Link></div></section>
      <div className="local-storage-banner"><HardDrive size={17} /><p><strong>Stored locally in your browser.</strong> Clearing site data can remove your personal recipes. Use Export collection to back them up.</p></div>
      <Suspense fallback={<div className="empty-state">Opening your recipe book…</div>}><MyRecipesContent /></Suspense>
    </main>
  );
}

async function MyRecipesContent() {
  const publishedRecipes = await getPublishedRecipes();
  return <MyRecipesDashboard publishedRecipes={publishedRecipes} />;
}
