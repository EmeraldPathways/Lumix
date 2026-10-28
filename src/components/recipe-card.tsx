import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { G9Recipe } from "@/lib/recipes/schema";
import { RecipeArtwork } from "./recipe-artwork";
import { FavoriteButton } from "./favorite-button";

export function RecipeCard({ recipe }: { recipe: G9Recipe }) {
  return (
    <article className="recipe-card">
      <div className="recipe-card-image"><Link href={`/recipes/${recipe.slug}`} aria-label={`Open ${recipe.title}`}><RecipeArtwork recipe={recipe} /></Link><FavoriteButton slug={recipe.slug} compact /></div>
      <div className="recipe-card-body">
        <div className="card-meta"><span>{recipe.colorMode === "monochrome" ? "Monochrome" : "Colour"}</span><span>{recipe.temperature}</span><span className="status-dot">Experimental</span></div>
        <h3><Link href={`/recipes/${recipe.slug}`}>{recipe.title}</Link></h3>
        <p>{recipe.description}</p>
        <div className="recipe-card-bottom"><span className="character-pill">{recipe.contrastCharacter} contrast · {recipe.saturationCharacter === "not-applicable" ? "tonal" : recipe.saturationCharacter}</span><Link className="text-link" href={`/recipes/${recipe.slug}`}>View recipe <ArrowUpRight size={15} /></Link></div>
      </div>
    </article>
  );
}
