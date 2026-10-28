"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Download, FileUp, Heart, Printer, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { RecipeArtwork } from "@/components/recipe-artwork";
import { deletePersonalRecipe, exportPersonalCollection, getCameraSlots, getFavorites, getPersonalRecipes, getRecentlyViewed, importPersonalCollection, savePersonalRecipe, assignCameraSlot, type CameraSlot } from "@/lib/local-library";
import type { G9Recipe } from "@/lib/recipes/schema";
import { RecipeCard } from "./recipe-card";

type Tab = "favourites" | "personal" | "recent" | "slots";
const favoriteEvent = "g9-film-lab:favorites-change";
const collectionEvent = "g9-film-lab:local-recipes-change";
const slotEvent = "g9-film-lab:slots-change";
const recentEvent = "g9-film-lab:recent-change";

function PersonalRecipeCard({ recipe, onRefresh, onMessage }: { recipe: G9Recipe; onRefresh: () => void; onMessage: (message: string) => void }) {
  async function duplicate() {
    try {
      const existing = await getPersonalRecipes();
      const baseSlug = `${recipe.slug}-copy`;
      let slug = baseSlug;
      let suffix = 2;
      while (existing.some((item) => item.slug === slug)) { slug = `${baseSlug}-${suffix}`; suffix += 1; }
      const now = new Date().toISOString();
      await savePersonalRecipe({ ...recipe, id: `local-${slug}`, slug, title: `${recipe.title} copy`, createdAt: now, updatedAt: now, published: false, featured: false, validationStatus: "experimental", testEvidence: undefined });
      onMessage("Recipe duplicated in My Recipes.");
      window.dispatchEvent(new Event(collectionEvent));
      onRefresh();
    } catch { onMessage("Could not duplicate this recipe in local storage."); }
  }

  async function remove() {
    if (!window.confirm(`Delete “${recipe.title}” from this device?`)) return;
    try {
      await deletePersonalRecipe(recipe.slug);
      onMessage("Personal recipe deleted.");
      window.dispatchEvent(new Event(collectionEvent));
      onRefresh();
    } catch { onMessage("Could not delete this recipe."); }
  }

  return <article className="personal-recipe-card"><Link className="personal-recipe-image" href={`/studio?recipe=${recipe.slug}`}><RecipeArtwork recipe={recipe} splitEffect /></Link><div className="personal-recipe-content"><span className="eyebrow">{recipe.colorMode === "colour" ? "Colour" : "Monochrome"} · Local</span><h3><Link href={`/studio?recipe=${recipe.slug}`}>{recipe.title}</Link></h3><p>{recipe.description}</p><div className="personal-recipe-actions"><Link href={`/studio?recipe=${recipe.slug}`}>Edit <SlidersHorizontal size={13} /></Link><button type="button" onClick={duplicate}>Duplicate</button><button type="button" className="danger-text" onClick={remove}><Trash2 size={13} /> Delete</button></div></div></article>;
}

export function MyRecipesDashboard({ publishedRecipes }: { publishedRecipes: G9Recipe[] }) {
  const [personalRecipes, setPersonalRecipes] = useState<G9Recipe[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [slots, setSlots] = useState<CameraSlot[]>(["Custom1", "Custom2", "Custom3", "Custom4"].map((slot) => ({ slot: slot as CameraSlot["slot"], slug: null })));
  const [tab, setTab] = useState<Tab>("favourites");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    let active = true;
    void Promise.all([getPersonalRecipes(), getFavorites(), getRecentlyViewed(), getCameraSlots()]).then(([local, favs, views, cameraSlots]) => {
      if (!active) return;
      setPersonalRecipes(local);
      setFavorites(favs);
      setRecent(views);
      setSlots(cameraSlots);
      setLoaded(true);
      setError("");
    }).catch(() => {
      if (active) { setLoaded(true); setError("Your local browser library is unavailable. Your published recipes are still online."); }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const stop = refresh();
    window.addEventListener(favoriteEvent, refresh);
    window.addEventListener(collectionEvent, refresh);
    window.addEventListener(slotEvent, refresh);
    window.addEventListener(recentEvent, refresh);
    return () => {
      stop?.();
      window.removeEventListener(favoriteEvent, refresh);
      window.removeEventListener(collectionEvent, refresh);
      window.removeEventListener(slotEvent, refresh);
      window.removeEventListener(recentEvent, refresh);
    };
  }, [refresh]);

  const bySlug = useMemo(() => new Map(publishedRecipes.map((recipe) => [recipe.slug, recipe])), [publishedRecipes]);
  const favoriteRecipes = favorites.map((slug) => bySlug.get(slug)).filter((recipe): recipe is G9Recipe => Boolean(recipe));
  const recentRecipes = recent.map((slug) => bySlug.get(slug)).filter((recipe): recipe is G9Recipe => Boolean(recipe));
  const availableRecipes = [...personalRecipes, ...publishedRecipes];
  const queryLower = query.trim().toLocaleLowerCase("en-IE");
  const filterByQuery = (items: G9Recipe[]) => queryLower ? items.filter((recipe) => `${recipe.title} ${recipe.description} ${recipe.tags.join(" ")}`.toLocaleLowerCase("en-IE").includes(queryLower)) : items;
  const activeRecipes = tab === "favourites" ? filterByQuery(favoriteRecipes) : tab === "personal" ? filterByQuery(personalRecipes) : filterByQuery(recentRecipes);
  const slotRecipes = slots.map((slot) => ({ ...slot, recipe: availableRecipes.find((recipe) => recipe.slug === slot.slug) }));

  async function exportCollection() {
    try {
      const json = await exportPersonalCollection();
      downloadFile(json, "g9-film-lab-collection.json", "application/json");
      setMessage("Your local collection was exported."); setError("");
    } catch { setError("Could not export the local collection."); }
  }

  async function importCollection(file?: File) {
    if (!file) return;
    try {
      const result = await importPersonalCollection(await file.text());
      setMessage(`Imported ${result.recipes} recipe${result.recipes === 1 ? "" : "s"}.`);
      setError("");
      window.dispatchEvent(new Event(collectionEvent));
      window.dispatchEvent(new Event(favoriteEvent));
      window.dispatchEvent(new Event(slotEvent));
      refresh();
    } catch { setError("This collection is invalid or contains unsupported G9 settings. No data was imported."); }
  }

  async function assignSlot(slot: CameraSlot["slot"], slug: string) {
    try {
      await assignCameraSlot(slot, slug || null);
      window.dispatchEvent(new Event(slotEvent));
      setMessage(`${slot} planning slot updated.`);
      setError("");
      refresh();
    } catch { setError("Could not update this planning slot."); }
  }

  function printSlots() {
    document.body.classList.add("print-slot-mode");
    const cleanup = () => document.body.classList.remove("print-slot-mode");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(() => window.print(), 40);
  }

  function exportSlots() {
    const printable = slotRecipes.map(({ slot, recipe }) => ({ slot, recipe: recipe ? { name: recipe.title, photoStyle: recipe.settings.photoStyle, contrast: recipe.settings.contrast, sharpness: recipe.settings.sharpness, noiseReduction: recipe.settings.noiseReduction, saturation: recipe.settings.saturation ?? null, colorTone: recipe.settings.colorTone ?? null, grainEffect: recipe.settings.grainEffect ?? "Off", whiteBalance: recipe.settings.whiteBalance } : null }));
    downloadFile(JSON.stringify({ cameraModel: "DC-G9", photoStyleSlots: printable }, null, 2), "g9-custom-photo-style-slots.json", "application/json");
  }

  const tabs: Array<[Tab, string, number]> = [["favourites", "Favourites", favoriteRecipes.length], ["personal", "My recipes", personalRecipes.length], ["recent", "Recently viewed", recentRecipes.length], ["slots", "My four slots", 4]];

  return <>
    <div className="myrecipes-dashboard">
      <div className="myrecipes-toolbar"><div className="myrecipes-tabs" role="tablist" aria-label="My recipe collections">{tabs.map(([id, label, count]) => <button type="button" key={id} role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => { setTab(id); setQuery(""); }}>{label}<span>{count}</span></button>)}</div><div className="collection-tools"><label className="myrecipes-search"><Search size={15} /><span className="sr-only">Search the active collection</span><input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search this collection" /></label><button type="button" className="outline-button" onClick={exportCollection}><Download size={14} /> Export collection</button><label className="outline-button import-collection"><FileUp size={14} /> Import JSON<input aria-label="Import recipe collection JSON" type="file" accept="application/json,.json" onChange={(event) => void importCollection(event.currentTarget.files?.[0])} /></label></div></div>
      {error && <p className="collection-feedback error-feedback" role="alert">{error}</p>}{message && <p className="collection-feedback success-feedback" role="status">{message}</p>}
      {!loaded ? <div className="empty-state">Opening your local recipe book…</div> : tab === "slots" ? <section className="slots-workspace"><div className="slot-controls-heading"><div><p className="eyebrow">Camera planning</p><h2>Four looks. Your call.</h2><p>Assign recipes to virtual DC-G9 Custom1–Custom4 slots. This is a planning aid only; it does not synchronise with your camera.</p></div><div className="slot-actions"><button type="button" className="outline-button" onClick={printSlots}><Printer size={14} /> Print setup sheet</button><button type="button" className="outline-button" onClick={exportSlots}><Download size={14} /> Export slots</button></div></div>
          <div className="slot-plan-grid">{slotRecipes.map(({ slot, slug, recipe }) => <article className="slot-plan-card" key={slot}><div className="slot-plan-top"><span className="slot-circle">{slot.replace("Custom", "C")}</span><span className="eyebrow">Photo Style slot</span></div><label><span className="sr-only">Assign recipe to {slot}</span><select value={slug ?? ""} onChange={(event) => void assignSlot(slot, event.currentTarget.value)}><option value="">Choose a recipe…</option>{availableRecipes.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select></label>{recipe ? <><div className="slot-recipe-summary"><strong>{recipe.title}</strong><span>{recipe.settings.photoStyle} · {recipe.colorMode}</span></div><dl className="slot-settings-summary"><div><dt>Contrast</dt><dd>{recipe.settings.contrast > 0 ? "+" : ""}{recipe.settings.contrast}</dd></div><div><dt>Sharpness</dt><dd>{recipe.settings.sharpness > 0 ? "+" : ""}{recipe.settings.sharpness}</dd></div><div><dt>NR</dt><dd>{recipe.settings.noiseReduction > 0 ? "+" : ""}{recipe.settings.noiseReduction}</dd></div><div><dt>White Balance</dt><dd>{recipe.settings.whiteBalance.mode}{recipe.settings.whiteBalance.kelvin ? ` · ${recipe.settings.whiteBalance.kelvin} K` : ""}</dd></div></dl><Link className="text-link" href={recipe.published ? `/recipes/${recipe.slug}` : `/studio?recipe=${recipe.slug}`}>Open recipe <ArrowUpRight size={14} /></Link></> : <p className="slot-empty-note">No recipe assigned yet.</p>}</article>)}</div>
          {slotRecipes.some((slot) => slot.recipe) && <section className="slot-print-sheet"><p className="eyebrow">G9 FILM LAB · ORIGINAL DC-G9</p><h1>My four Photo Style slots</h1><p className="print-note">Manual setup plan · this sheet does not transfer settings to the camera.</p><div className="print-slot-grid">{slotRecipes.map(({ slot, recipe }) => <article key={slot}><span>{slot}</span><h2>{recipe?.title ?? "Unassigned"}</h2>{recipe && <dl>{[["Photo Style", recipe.settings.photoStyle], ["Contrast", recipe.settings.contrast], ["Sharpness", recipe.settings.sharpness], ["Noise Reduction", recipe.settings.noiseReduction], ["Saturation", recipe.settings.saturation ?? "—"], ["Grain Effect", recipe.settings.grainEffect ?? "Off"], ["White Balance", `${recipe.settings.whiteBalance.mode}${recipe.settings.whiteBalance.kelvin ? ` ${recipe.settings.whiteBalance.kelvin} K` : ""}`]].map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}</article>)}</div></section>}
        </section> : activeRecipes.length ? <div className="myrecipes-content-grid">{tab === "personal" ? personalRecipes.filter((recipe) => activeRecipes.some((active) => active.slug === recipe.slug)).map((recipe) => <PersonalRecipeCard key={recipe.slug} recipe={recipe} onRefresh={refresh} onMessage={setMessage} />) : activeRecipes.map((recipe) => <RecipeCard key={recipe.slug} recipe={recipe} />)}</div> : <div className="empty-state"><Heart size={22} /><h2>{tab === "personal" ? "No personal recipes yet." : tab === "recent" ? "Nothing here just yet." : "No favourites yet."}</h2><p>{tab === "personal" ? "Build a look in Studio, then save it on this device." : tab === "recent" ? "Open a recipe and it will appear here for quick access." : "Save a published recipe with the heart button to keep it close."}</p><Link href={tab === "personal" ? "/studio" : "/recipes"} className="button button-dark">{tab === "personal" ? "Create a recipe" : "Explore recipes"}</Link></div>}
      <div className="myrecipes-bottom-tools"><p>Local recipes and favourites stay in this browser. They are not synced to a cloud account.</p><Link href="/studio">Open Recipe Studio <ArrowUpRight size={14} /></Link></div>
    </div>
    <section className="slot-print-sheet print-only-slot-sheet"><p className="eyebrow">G9 FILM LAB · ORIGINAL DC-G9</p><h1>My four Photo Style slots</h1><p className="print-note">Manual setup plan · this sheet does not transfer settings to the camera.</p><div className="print-slot-grid">{slotRecipes.map(({ slot, recipe }) => <article key={slot}><span>{slot}</span><h2>{recipe?.title ?? "Unassigned"}</h2>{recipe && <dl>{[["Photo Style", recipe.settings.photoStyle], ["Contrast", recipe.settings.contrast], ["Sharpness", recipe.settings.sharpness], ["Noise Reduction", recipe.settings.noiseReduction], ["Saturation", recipe.settings.saturation ?? "—"], ["Grain Effect", recipe.settings.grainEffect ?? "Off"], ["White Balance", `${recipe.settings.whiteBalance.mode}${recipe.settings.whiteBalance.kelvin ? ` ${recipe.settings.whiteBalance.kelvin} K` : ""}`]].map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}</article>)}</div></section>
  </>;
}

function downloadFile(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
