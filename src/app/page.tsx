import Link from "next/link";
import { Suspense } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Camera, Check, ChevronRight, CircleHelp, Film, SlidersHorizontal, Sparkles } from "lucide-react";
import { RecipeCard } from "@/components/recipe-card";
import { RecipeArtwork } from "@/components/recipe-artwork";
import { RecipePreviewCompare } from "@/components/recipe-preview-compare";
import { getPublishedRecipes } from "@/lib/db/recipes";
import { getSeedRecipeBySlug } from "@/lib/recipes/seed";

export default function HomePage() {
  return <Suspense fallback={<HomeFallback />}><HomeContent /></Suspense>;
}

function HomeFallback() {
  const recipe = getSeedRecipeBySlug("gold-200-sunny-day");
  return <main><section className="hero-section"><div className="hero-inner page-container"><div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line" /> A small lab for the original Lumix G9</p><h1>Classic film character.<br /><em>Straight from your</em> G9.</h1><p className="hero-description">Discover film-inspired recipes designed for the original Panasonic Lumix G9. Dial in your favourite look, shoot JPEGs and enjoy the results straight from your camera.</p><div className="hero-actions"><Link className="button button-dark" href="/recipes">Explore film recipes <ArrowRight size={16} /></Link><Link className="button button-outline" href="/studio">Create your own recipe <SlidersHorizontal size={16} /></Link></div></div>{recipe && <div className="hero-visual"><RecipeArtwork recipe={recipe} priority className="hero-photo" /><div className="hero-photo-caption"><span>01 / FIELD NOTES</span><span>Illustrative sample</span></div></div>}</div></section><div className="page-container loading-note">Opening the recipe library…</div></main>;
}

async function HomeContent() {
  const recipes = await getPublishedRecipes();
  const featured = recipes.filter((recipe) => recipe.featured).slice(0, 3);
  const comparison = recipes.find((recipe) => recipe.slug === "gold-200-sunny-day") ?? recipes[0];

  return (
    <main>
      <section className="hero-section">
        <div className="hero-inner page-container">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-line" /> A small lab for the original Lumix G9</p>
            <h1>Classic film character.<br /><em>Straight from your</em> G9.</h1>
            <p className="hero-description">Discover film-inspired recipes designed for the original Panasonic Lumix G9. Dial in your favourite look, shoot JPEGs and enjoy the results straight from your camera.</p>
            <div className="hero-actions"><Link className="button button-dark" href="/recipes">Explore film recipes <ArrowRight size={16} /></Link><Link className="button button-outline" href="/studio">Create your own recipe <SlidersHorizontal size={16} /></Link></div>
            <a href="#how-it-works" className="hero-secondary">How it works <ArrowDown size={14} /></a>
            <div className="hero-proof"><span className="proof-icon"><Check size={13} /></span><span>Built around genuine DC-G9 controls</span><span className="proof-divider" /><span>Manual setup, camera in hand</span></div>
          </div>
          <div className="hero-visual">
            <RecipeArtwork recipe={comparison} priority className="hero-photo" />
            <div className="hero-photo-caption"><span>01 / FIELD NOTES</span><span>Reference photograph · illustrative only</span></div>
            <div className="hero-stamp"><span>G9</span><small>FILM LAB<br />VOL. 01</small></div>
          </div>
          <div className="hero-index">01 — 25 EXPERIMENTAL LOOKS</div>
        </div>
        <div className="hero-rule" />
      </section>

      <section className="section-pad featured-section">
        <div className="page-container">
          <div className="section-heading"><div><p className="eyebrow">A good place to begin</p><h2>Find your kind of light.</h2></div><Link className="text-link section-link" href="/recipes">Browse all recipes <ArrowUpRight size={16} /></Link></div>
          <div className="recipe-grid featured-grid">{featured.map((recipe) => <RecipeCard recipe={recipe} key={recipe.slug} />)}</div>
        </div>
      </section>

      <section className="category-section section-pad">
        <div className="page-container">
          <div className="section-heading"><div><p className="eyebrow">Browse by feeling</p><h2>What are you in the mood for?</h2></div><p className="section-intro">Different light, different film character. Start with a feeling and find a recipe to take out.</p></div>
          <div className="category-grid">
            {[
              { name: "Colour negative", slug: "colour-negative", note: "Warm, familiar, everyday colour", look: "colour" },
              { name: "Classic colour", slug: "classic-colour", note: "Slide-film clarity and depth", look: "slide" },
              { name: "Cinematic", slug: "cinematic", note: "Quiet tones, considered contrast", look: "cinema" },
              { name: "Monochrome", slug: "monochrome", note: "Shape, texture and silver tones", look: "mono" },
            ].map((category, index) => {
              const imageRecipe = recipes.filter((recipe) => recipe.category === category.slug)[0] ?? recipes[index];
              return <Link className={`category-card category-${category.look}`} key={category.slug} href={`/recipes?category=${category.slug}`}>
                <div className="category-image"><RecipeArtwork recipe={imageRecipe} /><span className="category-number">0{index + 1}</span><span className="category-arrow"><ArrowUpRight size={17} /></span></div>
                <div className="category-copy"><h3>{category.name}</h3><p>{category.note}</p></div>
              </Link>;
            })}
          </div>
        </div>
      </section>

      <section className="section-pad compare-section">
        <div className="page-container compare-home-layout">
          <div className="compare-home-copy"><p className="eyebrow">A closer look</p><h2>One scene.<br /><em>A different point of view.</em></h2><p>See how a recipe might shift the mood of a photograph. Every recipe here uses the same sample scene so you can compare fairly.</p><Link className="button button-dark" href="/compare">Compare recipes <ArrowRight size={16} /></Link></div>
          {comparison && <RecipePreviewCompare recipe={comparison} compact />}
        </div>
      </section>

      <section className="section-pad how-section" id="how-it-works">
        <div className="page-container"><div className="section-heading"><div><p className="eyebrow">Made for the camera you own</p><h2>From idea to in-camera JPEG.</h2></div><p className="section-intro">A recipe is just a set of settings. The G9 does the rendering, and you stay in control.</p></div>
          <div className="steps-grid">
            <article className="how-step"><span className="step-number">01</span><div className="step-icon"><Film size={22} /></div><h3>Find a starting point</h3><p>Browse by colour, contrast, subject or the feeling you want from a day out.</p><Link href="/recipes">Discover recipes <ChevronRight size={15} /></Link></article>
            <article className="how-step"><span className="step-number">02</span><div className="step-icon"><SlidersHorizontal size={22} /></div><h3>Make it yours</h3><p>Adjust the G9-supported settings in Studio and save a recipe in your browser.</p><Link href="/studio">Open Studio <ChevronRight size={15} /></Link></article>
            <article className="how-step"><span className="step-number">03</span><div className="step-icon"><Camera size={22} /></div><h3>Set up your G9</h3><p>Follow the camera-side guide, then shoot a test JPEG and tune it for your light.</p><Link href="/guide">See the G9 guide <ChevronRight size={15} /></Link></article>
          </div>
        </div>
      </section>

      <section className="custom-slots-section">
        <div className="page-container custom-slots-inner"><div className="slot-mark"><span>01</span><span>02</span><span>03</span><span>04</span></div><div><p className="eyebrow">A useful camera detail</p><h2>Four Custom Photo Style slots.<br /><em>Four looks, ready when you are.</em></h2><p>Register a modified Photo Style as Custom1–Custom4. These are separate from the G9’s custom shooting modes and saved camera configurations.</p><Link href="/guide#custom-styles" className="text-link">Understand the four slots <ArrowUpRight size={15} /></Link></div><div className="slot-graphic" aria-hidden="true"><div className="slot-dial"><span>PHOTO<br />STYLE</span><strong>C1</strong></div><span className="slot-caption">YOUR CUSTOM LOOKS</span></div></div>
      </section>

      <section className="section-pad latest-section"><div className="page-container"><div className="section-heading"><div><p className="eyebrow">Fresh from the recipe book</p><h2>Recently added.</h2></div><Link className="text-link section-link" href="/recipes?sort=newest">See all recipes <ArrowUpRight size={16} /></Link></div><div className="recipe-grid">{recipes.slice(-3).reverse().map((recipe) => <RecipeCard recipe={recipe} key={recipe.slug} />)}</div></div></section>

      <section className="compatibility-section section-pad"><div className="page-container compatibility-inner"><div><p className="eyebrow">A note on compatibility</p><h2>Recipes, not camera files.</h2><p>The original Lumix DC-G9 uses configurable Photo Styles. It does not support the G9 II’s REAL TIME LUT system or third-party app installation. Our previews are illustrative; setup is manual.</p><Link className="text-link" href="/guide">Read the compatibility guide <ArrowUpRight size={15} /></Link></div><div className="compatibility-checks"><p><Check size={17} /> Built around documented original G9 controls</p><p><Check size={17} /> All starter recipes labelled experimental</p><p><CircleHelp size={17} /> No synthetic camera preset files</p></div></div></section>

      <section className="faq-section section-pad"><div className="page-container faq-layout"><div><p className="eyebrow">Frequently asked</p><h2>A few things worth knowing.</h2></div><div className="faq-list">
        <details><summary>Can I install a recipe directly into my G9?<span>+</span></summary><p>No. Enter the Photo Style settings manually on the camera. We do not provide a camera installer or synthetic SD card preset.</p></details>
        <details><summary>Are these exact film simulations?<span>+</span></summary><p>No. They are creative starting points inspired by film character, built from the original G9’s settings. They are not exact reproductions of any film stock.</p></details>
        <details><summary>Have these recipes been tested on a G9?<span>+</span></summary><p>The initial collection is experimental and has not been physically verified. We will only mark a recipe camera verified after documenting a controlled test on original DC-G9 hardware.</p></details>
        <details><summary>Does the original G9 support LUTs?<span>+</span></summary><p>No arbitrary REAL TIME LUT import system is documented for the original DC-G9. The G9 II is a different camera model with different capabilities.</p></details>
      </div></div></section>

      <section className="closing-cta"><div className="page-container closing-inner"><div><Sparkles size={20} /><p className="eyebrow">YOUR NEXT GOOD FRAME</p><h2>Make a look that feels like yours.</h2></div><Link className="button button-light" href="/studio">Open Recipe Studio <ArrowRight size={16} /></Link></div></section>
    </main>
  );
}
