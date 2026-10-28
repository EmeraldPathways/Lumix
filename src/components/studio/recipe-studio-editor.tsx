"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, Check, Copy, Download, FileUp, RotateCcw, Save, Trash2 } from "lucide-react";
import {
  G9_HIGHLIGHT_SHADOW_PRESETS,
  getPhotoStyleControls,
  getSupportedPhotoStyles,
  getWhiteBalanceModes,
  validateG9Recipe,
  type G9PhotoStyle,
  type G9RecipeSettings,
} from "@/lib/camera/g9";
import { deletePersonalRecipe, getPersonalRecipe, getPersonalRecipes, savePersonalRecipe } from "@/lib/local-library";
import { G9RecipeSchema, type G9Recipe, type RecipeCategory, type RecipeUseCase } from "@/lib/recipes/schema";
import { formatSigned } from "@/lib/format";
import { seedRecipes } from "@/lib/recipes/seed";
import { PreviewWorkbench } from "./preview-workbench";

const useCases: RecipeUseCase[] = ["portrait", "street", "landscape", "travel", "night"];
const stylesByFirmware = (firmware: string) => getSupportedPhotoStyles(firmware);
const monochromeStyles = ["Monochrome", "L.Monochrome", "L.Monochrome D"];
const sampleAlt = "Original vector illustration of a coastal street; not a photograph captured with a Lumix G9.";

function blankSettings(): G9RecipeSettings {
  return { cameraModel: "DC-G9", photoStyle: "Natural", contrast: 0, sharpness: 0, noiseReduction: 0, saturation: 0, whiteBalance: { mode: "AWB" } };
}

function makeDraft(source: G9Recipe = seedRecipes[0], personal = false): G9Recipe {
  const stamp = source.createdAt;
  return {
    ...source,
    id: personal ? source.id : `draft-${source.slug}`,
    slug: personal ? source.slug : `${source.slug}-copy`,
    title: personal ? source.title : `${source.title} · Personal copy`,
    description: personal ? source.description : `${source.description} Personal adjustments saved locally in this browser.`,
    filmCharacter: personal ? source.filmCharacter : `${source.filmCharacter} This is your personal starting copy.`,
    settings: { ...source.settings, whiteBalance: { ...source.settings.whiteBalance } },
    createdAt: stamp,
    updatedAt: stamp,
    published: false,
    featured: false,
  };
}

function makeFreshDraft(): G9Recipe {
  const draft = makeDraft(seedRecipes[0]);
  return {
    ...draft,
    id: "draft-new-g9-recipe",
    slug: "new-g9-recipe",
    title: "New G9 Recipe",
    description: "A personal JPEG recipe for the original Lumix G9.",
    filmCharacter: "A personal colour and tone direction made with supported original G9 Photo Style controls.",
    category: "cinematic",
    colorMode: "colour",
    temperature: "neutral",
    contrastCharacter: "medium",
    saturationCharacter: "natural",
    grainCharacter: "Off",
    suitability: ["street"],
    settings: blankSettings(),
    tags: ["personal"],
  };
}

function slugify(value: string) {
  return value.toLocaleLowerCase("en-IE").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
}

function minimumFirmware(settings: G9RecipeSettings) {
  if (settings.whiteBalance.mode === "AWBw") return "2.0";
  if (settings.photoStyle === "L.Monochrome D" || settings.grainEffect !== undefined) return "1.1";
  return "1.0";
}

function contrastDescriptor(value: number): G9Recipe["contrastCharacter"] { return value <= -2 ? "soft" : value >= 2 ? "high" : "medium"; }
function saturationDescriptor(value: number): G9Recipe["saturationCharacter"] { return value <= -2 ? "muted" : value >= 2 ? "vivid" : "natural"; }
function temperatureDescriptor(settings: G9RecipeSettings): G9Recipe["temperature"] {
  const mode = settings.whiteBalance.mode;
  if (mode === "Incandescent" || mode === "Cloudy" || mode === "Shade" || mode === "AWBw") return "warm";
  if (mode === "Color Temperature") return (settings.whiteBalance.kelvin ?? 5600) > 6100 ? "warm" : (settings.whiteBalance.kelvin ?? 5600) < 4900 ? "cool" : "neutral";
  return "neutral";
}

export function RecipeStudioEditor({ recipes, initialSlug }: { recipes: G9Recipe[]; initialSlug?: string }) {
  const router = useRouter();
  const defaultSource = initialSlug ? recipes.find((recipe) => recipe.slug === initialSlug) : undefined;
  const [draft, setDraft] = useState<G9Recipe>(() => defaultSource ? makeDraft(defaultSource) : makeFreshDraft());
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [firmware, setFirmware] = useState("2.7");
  const [success, setSuccess] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    let active = true;
    const loadDraft = async () => {
      if (!initialSlug) return;
      try {
        const personal = await getPersonalRecipe(initialSlug);
        if (active && personal) {
          setDraft(personal);
          setEditingSlug(personal.slug);
          setFirmware(personal.firmwareMinimum);
          setSuccess(`Editing your local copy: ${personal.title}`);
          return;
        }
        const source = recipes.find((recipe) => recipe.slug === initialSlug);
        if (active && source) {
          setDraft(makeDraft(source));
          setEditingSlug(null);
          setFirmware(source.firmwareMinimum);
        }
      } catch {
        if (active) setLocalError("Could not open local recipe storage. You can still experiment, but saving may be unavailable.");
      }
    };
    void loadDraft();
    return () => { active = false; };
  }, [initialSlug, recipes]);

  const currentSlug = editingSlug ?? (slugify(draft.title) || "new-g9-recipe");
  const monochrome = monochromeStyles.includes(draft.settings.photoStyle);
  const candidate = useMemo<G9Recipe>(() => ({
    ...draft,
    id: editingSlug ? draft.id : `local-${currentSlug}`,
    slug: currentSlug,
    title: draft.title.trim(),
    category: monochrome ? "monochrome" : draft.category === "monochrome" ? "cinematic" : draft.category,
    colorMode: monochrome ? "monochrome" : "colour",
    contrastCharacter: contrastDescriptor(draft.settings.contrast),
    saturationCharacter: monochrome ? "not-applicable" : saturationDescriptor(draft.settings.saturation ?? 0),
    temperature: temperatureDescriptor(draft.settings),
    grainCharacter: draft.settings.grainEffect ?? "Off",
    firmwareMinimum: minimumFirmware(draft.settings),
    preview: { ...draft.preview, src: "/g9-sample-scene.svg", alt: sampleAlt, authenticity: "illustrative", photographer: "Original G9 Film Lab illustration", licence: "Original project artwork" },
    published: false,
    featured: false,
    validationStatus: "experimental",
    testEvidence: undefined,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    sortOrder: 0,
  }), [currentSlug, draft, editingSlug, monochrome]);

  const settingsValidation = validateG9Recipe(candidate.settings, firmware);
  const schemaValidation = G9RecipeSchema.safeParse(candidate);
  const validationMessages = [
    ...settingsValidation.errors.map((issue) => issue.message),
    ...(!schemaValidation.success ? schemaValidation.error.issues.map((issue) => issue.message) : []),
  ];
  const styleOptions = stylesByFirmware(firmware);
  const controls = getPhotoStyleControls(draft.settings.photoStyle, firmware);
  const wbModes = getWhiteBalanceModes(firmware);

  function updateDraft(patch: Partial<G9Recipe>) {
    setSuccess("");
    setDraft((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }));
  }

  function updateSettings(patch: Partial<G9RecipeSettings>) {
    updateDraft({ settings: { ...draft.settings, ...patch, cameraModel: "DC-G9" } });
  }

  function changePhotoStyle(style: G9PhotoStyle) {
    const settings = { ...draft.settings, photoStyle: style };
    const isMono = monochromeStyles.includes(style);
    if (isMono) {
      delete settings.saturation;
      if (style === "L.Monochrome D") { delete settings.colorTone; delete settings.filterEffect; }
    } else {
      delete settings.colorTone;
      delete settings.filterEffect;
      delete settings.grainEffect;
      settings.saturation ??= 0;
    }
    updateDraft({
      settings,
      colorMode: isMono ? "monochrome" : "colour",
      category: isMono ? "monochrome" : draft.category === "monochrome" ? "cinematic" : draft.category,
      saturationCharacter: isMono ? "not-applicable" : "natural",
    });
  }

  function selectSource(slug: string) {
    if (!slug) {
      setDraft(makeFreshDraft());
      setEditingSlug(null);
      setFirmware("2.7");
      setSuccess("");
      setLocalError("");
      return;
    }
    const source = recipes.find((recipe) => recipe.slug === slug) ?? seedRecipes[0];
    setDraft(makeDraft(source));
    setEditingSlug(null);
    setFirmware(source.firmwareMinimum);
    setSuccess("");
    setLocalError("");
  }

  function resetToDefaults() {
    const base = { ...draft, title: "New G9 Recipe", description: "A personal JPEG recipe for my original Lumix G9.", filmCharacter: "A personal colour and tone direction made with supported original G9 controls.", settings: blankSettings(), colorMode: "colour" as const, category: "cinematic" as const, saturationCharacter: "natural" as const, grainCharacter: "Off" as const, temperature: "neutral" as const, contrastCharacter: "medium" as const };
    setDraft({ ...base, updatedAt: new Date().toISOString() });
    setEditingSlug(null);
    setSuccess("");
    setLocalError("");
  }

  async function saveDraft(): Promise<G9Recipe | null> {
    setSuccess("");
    setLocalError("");
    const now = new Date().toISOString();
    const latest = { ...candidate, createdAt: editingSlug ? draft.createdAt : now, updatedAt: now };
    const parsed = G9RecipeSchema.safeParse(latest);
    const camera = validateG9Recipe(latest.settings, firmware);
    if (!parsed.success || !camera.valid) {
      setLocalError("Resolve the recipe validation issues before saving.");
      return null;
    }
    try {
      let slug = currentSlug;
      if (!editingSlug) {
        const savedRecipes = await getPersonalRecipes();
        let suffix = 2;
        while (savedRecipes.some((recipe) => recipe.slug === slug)) { slug = `${currentSlug}-${suffix}`; suffix += 1; }
      }
      const recipe = await savePersonalRecipe({ ...parsed.data, id: editingSlug ? parsed.data.id : `local-${slug}`, slug, published: false, featured: false });
      setDraft(recipe);
      setEditingSlug(recipe.slug);
      setSuccess("Saved on this device. Export a backup if you want to keep it elsewhere.");
      window.dispatchEvent(new Event("g9-film-lab:local-recipes-change"));
      return recipe;
    } catch {
      setLocalError("This browser could not save the recipe. Check local storage availability and try again.");
      return null;
    }
  }

  async function applyDraft() {
    const recipe = await saveDraft();
    if (recipe) router.push(`/guide?recipe=${encodeURIComponent(recipe.slug)}`);
  }

  function duplicateDraft() {
    const copy = makeDraft({ ...candidate, id: candidate.id, slug: candidate.slug });
    setDraft({ ...copy, title: `${candidate.title} copy`, slug: `${candidate.slug}-copy` });
    setEditingSlug(null);
    setSuccess("Duplicate created in the editor. Save it to add it to My Recipes.");
    setLocalError("");
  }

  async function deleteDraft() {
    if (!editingSlug || !window.confirm(`Delete “${draft.title}” from this device?`)) return;
    try {
      await deletePersonalRecipe(editingSlug);
      setDraft(makeFreshDraft());
      setEditingSlug(null);
      setSuccess("Personal recipe deleted from this device.");
      setLocalError("");
      window.dispatchEvent(new Event("g9-film-lab:local-recipes-change"));
    } catch {
      setLocalError("Could not delete this local recipe.");
    }
  }

  function exportDraft() {
    const blob = new Blob([JSON.stringify(candidate, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${candidate.slug}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setSuccess("Recipe JSON downloaded.");
  }

  async function importDraft(file?: File) {
    if (!file) return;
    try {
      const value: unknown = JSON.parse(await file.text());
      const recipe = G9RecipeSchema.parse(value);
      setDraft({ ...recipe, published: false, featured: false });
      setEditingSlug(null);
      setSuccess("Recipe imported into Studio. Review the settings before saving.");
      setLocalError("");
    } catch {
      setLocalError("This file is not a valid G9 recipe JSON document.");
    }
  }

  function toggleUseCase(useCase: RecipeUseCase) {
    const next = draft.suitability.includes(useCase) ? draft.suitability.filter((item) => item !== useCase) : [...draft.suitability, useCase];
    updateDraft({ suitability: next.length ? next : [useCase] });
  }

  return (
    <>
    <div className="studio-layout">
      <section className="studio-settings-panel" aria-labelledby="studio-settings-heading">
        <div className="studio-panel-heading"><div><p className="eyebrow">01 / Camera controls</p><h2 id="studio-settings-heading">Build the look.</h2></div><button className="small-text-button" type="button" onClick={resetToDefaults}><RotateCcw size={13} /> Reset</button></div>
        <details className="studio-control-disclosure" open>
          <summary>Camera settings</summary>
          <div className="studio-control-fields">
        <label className="studio-field"><span>Start from a published recipe</span><select value={recipes.some((recipe) => recipe.slug === initialSlug) ? initialSlug : ""} onChange={(event) => selectSource(event.currentTarget.value)}><option value="">Start with a fresh look</option>{recipes.map((recipe) => <option key={recipe.slug} value={recipe.slug}>{recipe.title}</option>)}</select></label>
        <label className="studio-field"><span>Camera firmware</span><select value={firmware} onChange={(event) => setFirmware(event.currentTarget.value)}>{["1.0", "1.1", "1.2", "1.3", "2.0", "2.7"].map((version) => <option key={version}>{version}</option>)}</select></label>
        <label className="studio-field"><span>Photo Style</span><select value={draft.settings.photoStyle} onChange={(event) => changePhotoStyle(event.currentTarget.value as G9PhotoStyle)}>{!styleOptions.includes(draft.settings.photoStyle) && <option value={draft.settings.photoStyle} disabled>{draft.settings.photoStyle} · firmware unavailable</option>}{styleOptions.map((style) => <option value={style} key={style}>{style}</option>)}</select></label>
        <div className="studio-controls">
          {controls.map((control) => {
            if (control.kind === "range") {
              const settingName = control.id as "contrast" | "sharpness" | "noiseReduction" | "saturation" | "colorTone";
              const value = draft.settings[settingName] ?? 0;
              return <label className="range-setting" key={control.id}><span><span>{control.label}</span><strong>{formatSigned(value)}</strong></span><input aria-label={control.label} type="range" min={control.min} max={control.max} step={control.step} value={value} onChange={(event) => updateSettings({ [settingName]: Number(event.currentTarget.value) })} /><small>−5 <span>0</span> +5</small></label>;
            }
            if (control.id === "filterEffect") return <label className="studio-field" key={control.id}><span>{control.label}</span><select aria-label={control.label} value={draft.settings.filterEffect ?? "Off"} onChange={(event) => updateSettings({ filterEffect: event.currentTarget.value as G9RecipeSettings["filterEffect"] })}>{control.options?.map((option) => <option key={option}>{option}</option>)}</select></label>;
            if (control.id === "grainEffect") return <label className="studio-field" key={control.id}><span>{control.label} · monochrome only</span><select aria-label={control.label} value={draft.settings.grainEffect ?? "Off"} onChange={(event) => updateSettings({ grainEffect: event.currentTarget.value === "Off" ? undefined : event.currentTarget.value as G9RecipeSettings["grainEffect"] })}>{control.options?.map((option) => <option key={option}>{option}</option>)}</select></label>;
            return null;
          })}
        </div>
        <label className="studio-field"><span>Highlight Shadow</span><select value={draft.settings.highlightShadow ?? "Standard"} onChange={(event) => updateSettings({ highlightShadow: event.currentTarget.value as G9RecipeSettings["highlightShadow"] })}>{G9_HIGHLIGHT_SHADOW_PRESETS.map((preset) => <option key={preset}>{preset}</option>)}</select></label>
        <div className="studio-subhead"><p className="eyebrow">White Balance</p></div>
        <label className="studio-field"><span>Mode</span><select value={draft.settings.whiteBalance.mode} onChange={(event) => {
          const mode = event.currentTarget.value as G9RecipeSettings["whiteBalance"]["mode"];
          updateSettings({ whiteBalance: mode === "Color Temperature" ? { mode, kelvin: draft.settings.whiteBalance.kelvin ?? 5600 } : { mode } });
        }}>{!wbModes.includes(draft.settings.whiteBalance.mode) && <option value={draft.settings.whiteBalance.mode} disabled>{draft.settings.whiteBalance.mode} · firmware 2.0+</option>}{wbModes.map((mode) => <option value={mode} key={mode}>{mode}</option>)}</select></label>
        {draft.settings.whiteBalance.mode === "Color Temperature" && <label className="studio-field"><span>Kelvin</span><input type="number" min="2500" max="10000" step="100" value={draft.settings.whiteBalance.kelvin ?? 5600} onChange={(event) => updateSettings({ whiteBalance: { ...draft.settings.whiteBalance, mode: "Color Temperature", kelvin: Number(event.currentTarget.value) } })} /></label>}
        <div className="studio-wb-note"><span>WB fine shift</span><strong>Centre · 0 / 0</strong><small>Recipe data uses centred A/B and G/M axes. The numeric camera range is not documented here.</small></div>
        <label className="range-setting"><span><span>Suggested exposure</span><strong>{draft.settings.suggestedExposureCompensation === undefined ? "—" : `${formatSigned(draft.settings.suggestedExposureCompensation)} EV`}</strong></span><input aria-label="Suggested exposure compensation" type="range" min="-3" max="3" step="0.333333" value={draft.settings.suggestedExposureCompensation ?? 0} onChange={(event) => updateSettings({ suggestedExposureCompensation: Number(event.currentTarget.value) })} /><small>Optional shooting guidance</small></label>
          </div>
        </details>
      </section>

      <section className="studio-preview-panel" aria-label="Photo preview and comparison">
        <PreviewWorkbench settings={draft.settings} />
        <div className="preview-meta-row"><span>CAMERA MODEL <strong>DC-G9 · original</strong></span><span>VALIDATION <strong className="experimental-label"><i /> Experimental</strong></span></div>
      </section>

      <aside className="studio-info-panel">
        <div className="studio-panel-heading"><div><p className="eyebrow">02 / Recipe notes</p><h2>Give it a name.</h2></div><span className="local-chip">Local</span></div>
        <label className="studio-field"><span>Recipe name</span><input maxLength={80} value={draft.title} onChange={(event) => updateDraft({ title: event.currentTarget.value })} /></label>
        <label className="studio-field"><span>Short description</span><textarea rows={3} maxLength={320} value={draft.description} onChange={(event) => updateDraft({ description: event.currentTarget.value })} /></label>
        <label className="studio-field"><span>Film character notes</span><textarea rows={4} maxLength={800} value={draft.filmCharacter} onChange={(event) => updateDraft({ filmCharacter: event.currentTarget.value })} /></label>
        <label className="studio-field"><span>Character category</span><select value={monochrome ? "monochrome" : draft.category} disabled={monochrome} onChange={(event) => updateDraft({ category: event.currentTarget.value as RecipeCategory })}><option value="colour-negative">Colour negative</option><option value="classic-colour">Classic colour</option><option value="cinematic">Cinematic</option><option value="monochrome">Monochrome</option></select></label>
        <label className="studio-field"><span>Tags · comma separated</span><input value={draft.tags.join(", ")} onChange={(event) => updateDraft({ tags: event.currentTarget.value.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 12) })} /></label>
        <fieldset className="use-case-picker"><legend>Good for</legend><div>{useCases.map((useCase) => <label key={useCase}><input type="checkbox" checked={draft.suitability.includes(useCase)} onChange={() => toggleUseCase(useCase)} /><span>{useCase}</span></label>)}</div></fieldset>
        <div className="studio-validation"><div><span className={validationMessages.length ? "validation-mark invalid" : "validation-mark"}>{validationMessages.length ? "!" : <Check size={13} />}</span><strong>{validationMessages.length ? `${validationMessages.length} issue${validationMessages.length === 1 ? "" : "s"} to review` : "Valid original G9 recipe"}</strong></div>{validationMessages.length > 0 && <ul>{[...new Set(validationMessages)].map((message) => <li key={message}>{message}</li>)}</ul>}</div>
        <div className="studio-save-actions"><button type="button" className="button button-dark" onClick={() => void saveDraft()} disabled={validationMessages.length > 0}><Save size={15} /> {editingSlug ? "Save changes" : "Save to My Recipes"}</button><div className="studio-secondary-actions"><button type="button" className="outline-button" onClick={duplicateDraft}><Copy size={14} /> Duplicate</button><button type="button" className="outline-button" onClick={exportDraft}><Download size={14} /> Export JSON</button><label className="outline-button import-recipe"><FileUp size={14} /> Import<input aria-label="Import a recipe JSON" type="file" accept="application/json,.json" onChange={(event) => void importDraft(event.currentTarget.files?.[0])} /></label></div>{editingSlug && <div className="studio-saved-actions"><Link href={`/guide?recipe=${encodeURIComponent(editingSlug)}`} className="text-link"><ArrowDownToLine size={14} /> Open camera setup guide</Link><button type="button" className="small-text-button danger-text" onClick={deleteDraft}><Trash2 size={13} /> Delete local recipe</button></div>}</div>
        {success && <p className="studio-feedback success-feedback" role="status">{success}</p>}{localError && <p className="studio-feedback error-feedback" role="alert">{localError}</p>}
        <p className="local-storage-note">Saved recipes live only in this browser. Clearing browser data can remove them; use Export JSON for a backup.</p>
      </aside>
    </div>
    <div className="studio-mobile-actions" aria-label="Save and apply recipe">
      <button type="button" className="outline-button" onClick={() => void saveDraft()} disabled={validationMessages.length > 0}><Save size={15} /> Save</button>
      <button type="button" className="button button-dark" onClick={() => void applyDraft()} disabled={validationMessages.length > 0}><ArrowDownToLine size={15} /> Save &amp; apply</button>
    </div>
    </>
  );
}
