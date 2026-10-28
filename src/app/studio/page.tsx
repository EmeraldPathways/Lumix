import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, Camera } from "lucide-react";
import { RecipeStudioEditor } from "@/components/studio/recipe-studio-editor";
import { getPublishedRecipes } from "@/lib/db/recipes";

export const metadata: Metadata = {
  title: "Recipe Studio",
  description: "Build and preview a personal original Lumix G9 JPEG recipe using camera-supported controls.",
  alternates: { canonical: "/studio" },
};

export default function StudioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <main className="page-container studio-page">
      <div className="page-kicker"><span className="eyebrow-line" /> RECIPE STUDIO <span>·</span> ORIGINAL DC-G9
      </div>
      <section className="studio-hero"><div><p className="eyebrow">A little room to experiment</p><h1>Find the look<br /><em>that feels like yours.</em></h1></div><div><p>Adjust real G9 Photo Style controls, compare an illustrative preview and save your recipe locally. Nothing is uploaded unless you choose to export it.</p><Link href="/my-recipes" className="text-link">Open My Recipes <ArrowUpRight size={15} /></Link></div></section>
      <Suspense fallback={<div className="empty-state">Loading the recipe studio…</div>}><StudioContent searchParams={searchParams} /></Suspense>
      <section className="studio-capability-note"><Camera size={18} /><p><strong>Camera controls only.</strong> Browser preview effects are illustrative. RGB curves and other browser-only controls are not transferable to the original G9.</p><Link href="/guide">Camera setup guide <ArrowUpRight size={14} /></Link></section>
    </main>
  );
}

async function StudioContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [recipes, params] = await Promise.all([getPublishedRecipes(), searchParams]);
  return <RecipeStudioEditor recipes={recipes} initialSlug={typeof params.recipe === "string" ? params.recipe : undefined} />;
}
