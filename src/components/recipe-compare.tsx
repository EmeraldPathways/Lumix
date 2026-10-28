"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Plus, X } from "lucide-react";
import type { G9Recipe } from "@/lib/recipes/schema";
import { RecipeArtwork } from "./recipe-artwork";

type RecipeCompareProps = { recipes: G9Recipe[]; initialSlugs?: string[] };
type Row = { label: string; value: (recipe: G9Recipe) => string };

const rows: Row[] = [
  { label: "Photo Style", value: (recipe) => recipe.settings.photoStyle },
  { label: "Contrast", value: (recipe) => `${recipe.settings.contrast > 0 ? "+" : ""}${recipe.settings.contrast}` },
  { label: "Sharpness", value: (recipe) => `${recipe.settings.sharpness > 0 ? "+" : ""}${recipe.settings.sharpness}` },
  { label: "Noise Reduction", value: (recipe) => `${recipe.settings.noiseReduction > 0 ? "+" : ""}${recipe.settings.noiseReduction}` },
  { label: "Saturation", value: (recipe) => recipe.settings.saturation === undefined ? "Not applicable" : `${recipe.settings.saturation > 0 ? "+" : ""}${recipe.settings.saturation}` },
  { label: "Monochrome tone", value: (recipe) => recipe.settings.colorTone === undefined ? "—" : `${recipe.settings.colorTone > 0 ? "+" : ""}${recipe.settings.colorTone}` },
  { label: "Filter effect", value: (recipe) => recipe.settings.filterEffect ?? "—" },
  { label: "Grain effect", value: (recipe) => recipe.settings.grainEffect ?? "Off / not specified" },
  { label: "Highlight Shadow", value: (recipe) => recipe.settings.highlightShadow ?? "Standard / not specified" },
  { label: "White Balance", value: (recipe) => `${recipe.settings.whiteBalance.mode}${recipe.settings.whiteBalance.kelvin ? ` · ${recipe.settings.whiteBalance.kelvin} K` : ""}` },
  { label: "Colour mode", value: (recipe) => recipe.colorMode === "colour" ? "Colour" : "Monochrome" },
  { label: "Best for", value: (recipe) => recipe.suitability.join(", ") },
  { label: "Validation", value: (recipe) => recipe.validationStatus === "experimental" ? "Experimental" : recipe.validationStatus },
];

export function RecipeCompare({ recipes, initialSlugs = [] }: RecipeCompareProps) {
  const recipeBySlug = useMemo(() => new Map(recipes.map((recipe) => [recipe.slug, recipe])), [recipes]);
  const starting = initialSlugs.filter((slug) => recipeBySlug.has(slug)).slice(0, 4);
  const [selections, setSelections] = useState<(string | null)[]>([...starting, ...Array(Math.max(0, 4 - starting.length)).fill(null)]);
  const selectedRecipes = selections.map((slug) => slug ? recipeBySlug.get(slug) ?? null : null);
  const currentRecipes = selectedRecipes.filter((recipe): recipe is G9Recipe => Boolean(recipe));
  const completedRows = rows.filter((row) => new Set(currentRecipes.map(row.value)).size > 1);

  function setSelection(index: number, slug: string) {
    setSelections((current) => current.map((item, position) => position === index ? slug || null : item));
  }

  return (
    <div className="compare-tool">
      <div className="compare-selectors">
        {selections.map((selection, index) => (
          <label key={index} className="compare-select-card"><span>Recipe {index + 1}</span><select aria-label={`Choose recipe ${index + 1}`} value={selection ?? ""} onChange={(event) => setSelection(index, event.target.value)}>
            <option value="">Choose a recipe…</option>
            {recipes.map((recipe) => <option key={recipe.slug} value={recipe.slug} disabled={selections.some((slug, position) => position !== index && slug === recipe.slug)}>{recipe.title}</option>)}
          </select></label>
        ))}
      </div>

      {currentRecipes.length === 0 ? <div className="empty-state compare-empty"><Plus size={22} /><h2>Choose up to four recipes.</h2><p>Pick a few looks to compare their camera settings and shared-scene previews.</p></div> : <>
        <div className="compare-photo-grid" style={{ "--compare-count": currentRecipes.length } as React.CSSProperties}>
          {selectedRecipes.map((recipe, index) => recipe ? <article className="compare-photo-card" key={recipe.slug}>
            <div className="compare-photo"><RecipeArtwork recipe={recipe} /><button type="button" className="remove-compare" aria-label={`Remove ${recipe.title}`} onClick={() => setSelection(index, "")}><X size={16} /></button><span className="compare-image-label">Illustrative browser preview</span></div>
            <div className="compare-photo-title"><p className="eyebrow">{recipe.category.replaceAll("-", " ")}</p><h2>{recipe.title}</h2><Link href={`/recipes/${recipe.slug}`}>Open recipe <ArrowUpRight size={14} /></Link></div>
          </article> : <div key={`empty-${index}`} className="compare-placeholder"><Plus size={18} /><span>Add a recipe</span></div>)}
        </div>

        <section className="settings-differences" aria-labelledby="differences-title"><div className="block-heading"><div><p className="eyebrow">At a glance</p><h2 id="differences-title">Settings that differ</h2></div><span className="difference-count">{completedRows.length} differences</span></div>
          {completedRows.length ? <div className="difference-list">{completedRows.map((row) => <div className="difference-row" key={row.label}><h3>{row.label}</h3><div className="difference-values">{currentRecipes.map((recipe) => <div className="difference-value" key={recipe.slug}><span>{recipe.title}</span><strong>{row.value(recipe)}</strong></div>)}</div></div>)}</div> : <p className="no-differences">Choose at least two recipes with different settings to see what changes.</p>}
        </section>
      </>}
      <p className="preview-disclaimer">Every preview in this comparison uses the same original vector scene and an approximate browser effect. None represents a photograph captured on an original G9.</p>
    </div>
  );
}
