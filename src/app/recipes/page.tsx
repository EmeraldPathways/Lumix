import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { RecipeCard } from "@/components/recipe-card";
import { getPublishedRecipes } from "@/lib/db/recipes";
import { filterRecipes, parseRecipeFilters } from "@/lib/recipes/filter";

export const metadata: Metadata = {
  title: "G9 Film Recipes",
  description: "Browse experimental, film-inspired JPEG recipes for the original Panasonic Lumix DC-G9.",
  alternates: { canonical: "/recipes" },
};

type SearchParams = Record<string, string | string[] | undefined>;

export default function RecipesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <main className="page-container collection-page">
      <div className="page-kicker"><span className="eyebrow-line" /> THE RECIPE LIBRARY <span>·</span> ORIGINAL DC-G9</div>
      <div className="collection-heading"><div><p className="eyebrow">A catalogue of character</p><h1>Find a look<br /><em>worth taking out.</em></h1></div><p className="collection-intro">25 starting points, all built from settings the original Lumix G9 can make. Every recipe is experimental until it has been tested on camera.</p></div>
      <Suspense fallback={<div className="empty-state" aria-label="Loading recipes">Loading the recipe library…</div>}><RecipeCatalog searchParams={searchParams} /></Suspense>
    </main>
  );
}

async function RecipeCatalog({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const rawParams = await searchParams;
  const filters = parseRecipeFilters(rawParams);
  const recipes = filterRecipes(await getPublishedRecipes(), filters);

  return <>
    <form className="filter-panel" action="/recipes" method="get">
      <label className="search-field"><Search size={17} /><span className="sr-only">Search recipes</span><input name="q" type="search" placeholder="Search by look, film or feeling…" defaultValue={filters.query ?? ""} /></label>
      <div className="filter-selects">
        <label>Character<select name="category" defaultValue={filters.category ?? ""}><option value="">All characters</option><option value="colour-negative">Colour negative</option><option value="classic-colour">Classic colour</option><option value="cinematic">Cinematic</option><option value="monochrome">Monochrome</option></select></label>
        <label>Format<select name="color" defaultValue={filters.colorMode ?? ""}><option value="">Colour or mono</option><option value="colour">Colour</option><option value="monochrome">Monochrome</option></select></label>
        <label>Subject<select name="use" defaultValue={filters.useCase ?? ""}><option value="">Any subject</option><option value="portrait">Portraits</option><option value="street">Street</option><option value="landscape">Landscape</option><option value="travel">Travel</option><option value="night">Night</option></select></label>
        <label>Temperature<select name="temperature" defaultValue={filters.temperature ?? ""}><option value="">Any temperature</option><option value="warm">Warm</option><option value="cool">Cool</option><option value="neutral">Neutral</option></select></label>
        <label>Contrast<select name="contrast" defaultValue={filters.contrast ?? ""}><option value="">Any contrast</option><option value="soft">Soft</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        <label>Grain<select name="grain" defaultValue={filters.grain ?? ""}><option value="">Any grain</option><option value="Off">Off</option><option value="Low">Low</option><option value="Standard">Standard</option><option value="High">High</option></select></label>
        <label>Order<select name="sort" defaultValue={filters.sort ?? "featured"}><option value="featured">Featured</option><option value="newest">Newest</option><option value="alphabetical">A–Z</option></select></label>
      </div>
      <div className="filter-actions"><span><SlidersHorizontal size={15} /> {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}</span><div><Link href="/recipes">Clear filters</Link><button type="submit" className="button button-dark">Apply filters</button></div></div>
    </form>
    {recipes.length ? <div className="recipe-grid collection-grid">{recipes.map((recipe) => <RecipeCard key={recipe.slug} recipe={recipe} />)}</div> : <section className="empty-state"><span className="eyebrow">No recipes found</span><h2>Try a wider search.</h2><p>Clear a filter or search for another colour, subject or mood.</p><Link href="/recipes" className="button button-dark">Reset the library</Link></section>}
    <p className="library-note">All recipes use supported original DC-G9 Photo Style controls and are marked experimental. Browser previews are illustrative and do not represent the camera’s JPEG engine.</p>
  </>;
}
