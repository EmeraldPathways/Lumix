import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CircleAlert } from "lucide-react";
import { RecipeArtwork } from "@/components/recipe-artwork";
import { RecipeActions } from "@/components/recipe-actions";
import { RecipePreviewCompare } from "@/components/recipe-preview-compare";
import { RecipeSettingsCard } from "@/components/recipe-settings-card";
import { getPublishedRecipeBySlug } from "@/lib/db/recipes";
import type { G9Recipe } from "@/lib/recipes/schema";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getPublishedRecipeBySlug(slug);
  if (!recipe) return { title: "Recipe not found" };
  return {
    title: recipe.title,
    description: recipe.description,
    alternates: { canonical: `/recipes/${recipe.slug}` },
    openGraph: { title: recipe.title, description: recipe.description, images: [recipe.preview.src] },
  };
}

function FilmCharacter({ recipe }: { recipe: G9Recipe }) {
  const notes = recipe.filmCharacter;
  return <p>{notes}</p>;
}

export default function RecipeDetailPage({ params }: Props) {
  return <main className="page-container detail-page"><Suspense fallback={<div className="empty-state">Loading recipe…</div>}><RecipeDetailContent params={params} /></Suspense></main>;
}

async function RecipeDetailContent({ params }: Props) {
  const { slug } = await params;
  const recipe = await getPublishedRecipeBySlug(slug);
  if (!recipe) notFound();

  const monochrome = recipe.colorMode === "monochrome";
  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/recipes"><ArrowLeft size={14} /> Recipe library</Link><span>/</span><span>{recipe.title}</span></nav>
      <section className="detail-hero">
        <div className="detail-hero-copy"><div className="detail-badges"><span className="eyebrow">{recipe.category.replaceAll("-", " ")}</span><span className="validation-badge"><span /> Experimental</span></div><h1>{recipe.title}</h1><p className="detail-lede">{recipe.description}</p><div className="detail-tags"><span>{monochrome ? "Monochrome" : "Colour"}</span><span>{recipe.temperature} balance</span><span>{recipe.contrastCharacter} contrast</span><span>{recipe.suitability.join(" · ")}</span></div><p className="detail-authenticity"><CircleAlert size={15} /> Experimental recipe · not camera verified</p></div>
        <RecipeArtwork recipe={recipe} priority className="detail-hero-image" />
      </section>

      <div className="detail-columns">
        <div className="detail-main-column">
          <section className="detail-block"><p className="eyebrow">The film character</p><h2>A direction for the light.</h2><FilmCharacter recipe={recipe} /><div className="character-specs"><div><span>Colour</span><strong>{monochrome ? "Silver tones" : recipe.temperature}</strong></div><div><span>Contrast</span><strong>{recipe.contrastCharacter}</strong></div><div><span>Saturation</span><strong>{recipe.saturationCharacter}</strong></div></div></section>
          <section className="detail-block comparison-block"><div className="block-heading"><div><p className="eyebrow">Same scene, new character</p><h2>See the direction.</h2></div><span className="preview-kind"><span className="status-dot" /> Illustrative preview</span></div><RecipePreviewCompare recipe={recipe} /></section>
          <section className="detail-block"><p className="eyebrow">In the field</p><h2>When to try it.</h2><p>{recipe.shootingNotes}</p><div className="field-tags">{recipe.suitability.map((item) => <span key={item}>{item}</span>)}</div></section>
          <section className="detail-block validation-panel"><div className="validation-icon"><Check size={18} /></div><div><p className="eyebrow">Validation status</p><h2>Experimental</h2><p>This recipe has not yet been physically verified on an original DC-G9. It is based on supported controls and should be treated as a starting point. We do not claim exact film-stock reproduction.</p><p className="source-inline">Camera model: original Lumix DC-G9 · Minimum firmware {recipe.firmwareMinimum}</p></div></section>
        </div>
        <aside className="detail-side-column">
          <RecipeSettingsCard recipe={recipe} />
          <div className="apply-card"><p className="eyebrow">Take it to your camera</p><h2>Set it up on your G9.</h2><p>Follow a step-by-step guide while you enter the recipe manually.</p><Link href={`/guide?recipe=${recipe.slug}`} className="button button-dark">Set up on my G9 <ArrowRight size={16} /></Link></div>
          <div className="recommended-note"><strong>Recipe note</strong><p>This look is inspired by a film character. It does not reproduce a named stock exactly.</p></div>
        </aside>
      </div>
      <section className="detail-save-section"><div><p className="eyebrow">Keep this recipe close</p><h2>Save, share or customise.</h2></div><RecipeActions recipe={recipe} /></section>
      <div className="detail-bottom-link"><Link href="/recipes"><ArrowLeft size={14} /> Back to all recipes</Link><Link href={`/studio?recipe=${recipe.slug}`}>Adjust this look in Studio <ArrowRight size={14} /></Link></div>
      <div className="sr-only" aria-live="polite">Recipe details for {recipe.title}</div>
    </>
  );
}
