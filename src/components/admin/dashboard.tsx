"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Archive, ArrowUpRight, Check, Copy, Download, FileUp, ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { G9RecipeSchema, type G9Recipe } from "@/lib/recipes/schema";
import type { RecipeTestRecord } from "@/lib/admin/test-record";

type Entry = { recipe: G9Recipe; archivedAt: string | null };
type ImageRow = {
  id: number;
  recipe_slug: string;
  image_url: string;
  image_type: string;
  authenticity_type: string;
  photographer: string;
  licence: string;
  metadata: Record<string, unknown>;
  created_at: string;
};
type TestRow = { id: number; firmware_version: string; findings: string; verification_status: string; tested_by: string; tested_at: string };
type RevisionRow = { id: number; version: number; change_notes: string; changed_by: string | null; created_at: string; document_snapshot: G9Recipe };

export function AdminDashboard({ initialRecipes, template }: { initialRecipes: Entry[]; template: G9Recipe }) {
  const [entries, setEntries] = useState(initialRecipes);
  const [selectedSlug, setSelectedSlug] = useState(initialRecipes[0]?.recipe.slug ?? "");
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selected = entries.find((entry) => entry.recipe.slug === selectedSlug);
  const visibleEntries = useMemo(() => entries.filter((entry) => {
    if (Boolean(entry.archivedAt) !== showArchived) return false;
    const value = `${entry.recipe.title} ${entry.recipe.slug} ${entry.recipe.category}`.toLocaleLowerCase("en-IE");
    return value.includes(query.trim().toLocaleLowerCase("en-IE"));
  }), [entries, query, showArchived]);

  async function reload(nextSelected?: string) {
    setError("");
    try {
      const response = await fetch("/api/admin/recipes", { cache: "no-store" });
      const body = await response.json() as { recipes?: Entry[]; error?: string };
      if (!response.ok || !body.recipes) throw new Error(body.error ?? "Could not reload recipes.");
      setEntries(body.recipes);
      const next = nextSelected ?? selectedSlug;
      if (body.recipes.some((entry) => entry.recipe.slug === next)) {
        setSelectedSlug(next);
        setCreating(false);
      } else if (body.recipes[0]) {
        setSelectedSlug(body.recipes[0].recipe.slug);
        setCreating(false);
      } else {
        setSelectedSlug("");
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not reload recipes."); }
  }

  function beginNew() {
    setSelectedSlug("");
    setCreating(true);
    setMessage("");
    setError("");
  }

  return <section className="admin-workspace">
    <aside className="admin-recipe-sidebar">
      <div className="admin-sidebar-heading"><div><p className="eyebrow">Catalogue</p><h2>Recipes</h2></div><button type="button" className="button button-dark admin-create-button" onClick={beginNew}><Plus size={14} /> New</button></div>
      <label className="admin-search"><span className="sr-only">Search admin recipes</span><input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search recipes" /></label>
      <label className="admin-archive-toggle"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.currentTarget.checked)} /> Show archived</label>
      <nav aria-label="Recipes to manage" className="admin-recipe-list">
        {visibleEntries.map(({ recipe, archivedAt }) => <button type="button" key={recipe.slug} className={`admin-recipe-list-item ${selectedSlug === recipe.slug && !creating ? "active" : ""}`} onClick={() => { setSelectedSlug(recipe.slug); setCreating(false); setMessage(""); setError(""); }}>
          <span className="admin-recipe-list-title">{recipe.title}</span><span className="admin-recipe-list-meta">{archivedAt ? "Archived" : recipe.published ? "Published" : "Draft"} · {recipe.validationStatus.replaceAll("-", " ")}</span>
        </button>)}
        {!visibleEntries.length && <p className="admin-list-empty">No recipes in this view.</p>}
      </nav>
    </aside>
    <div className="admin-editor-column">
      {(message || error) && <p className={`admin-feedback ${error ? "error-feedback" : "success-feedback"}`} role={error ? "alert" : "status"}>{error || message}</p>}
      {creating || !selected ? <AdminRecipeEditor key="new" entry={null} template={template} onSaved={(recipe) => { setMessage(`Saved “${recipe.title}”.`); void reload(recipe.slug); }} onMessage={setMessage} /> : <AdminRecipeEditor key={selected.recipe.slug} entry={selected} template={template} onSaved={(recipe) => { setMessage(`Saved “${recipe.title}”.`); void reload(recipe.slug); }} onMessage={setMessage} onChanged={() => void reload()} />}
    </div>
  </section>;
}

function makeNewRecipe(template: G9Recipe): G9Recipe {
  const now = new Date().toISOString();
  return {
    ...template,
    id: "new-g9-recipe",
    slug: "new-g9-recipe",
    title: "New G9 Recipe",
    description: "An experimental JPEG look for the original Lumix G9.",
    filmCharacter: "Describe the intended colours, contrast, highlight rendering, skin tones and overall mood of this original G9 recipe.",
    validationStatus: "experimental",
    preview: { ...template.preview, authenticity: "illustrative", alt: "Illustrative recipe preview on the shared sample scene; not a DC-G9 capture." },
    testEvidence: undefined,
    settings: { cameraModel: "DC-G9", photoStyle: "Natural", contrast: 0, sharpness: 0, noiseReduction: 0, saturation: 0, whiteBalance: { mode: "AWB" } },
    published: false,
    featured: false,
    createdAt: now,
    updatedAt: now,
    sortOrder: 99,
  };
}

function AdminRecipeEditor({ entry, template, onSaved, onMessage, onChanged }: {
  entry: Entry | null;
  template: G9Recipe;
  onSaved: (recipe: G9Recipe) => void;
  onMessage: (message: string) => void;
  onChanged?: () => void;
}) {
  const [saveSlug, setSaveSlug] = useState(entry?.recipe.slug);
  const [json, setJson] = useState(() => JSON.stringify(entry?.recipe ?? makeNewRecipe(template), null, 2));
  const [changeNotes, setChangeNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [revisionTick, setRevisionTick] = useState(0);
  const parsed = useMemo(() => {
    try {
      const result = G9RecipeSchema.safeParse(JSON.parse(json) as unknown);
      return result.success ? { recipe: result.data, error: "" } : { recipe: undefined, error: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") };
    } catch { return { recipe: undefined, error: "Recipe JSON must be valid before it can be saved." }; }
  }, [json]);

  function setPublished(published: boolean) {
    if (!parsed.recipe) return;
    setJson(JSON.stringify({ ...parsed.recipe, published }, null, 2));
  }

  function duplicate() {
    if (!parsed.recipe) return;
    const now = new Date().toISOString();
    const duplicateRecipe = {
      ...parsed.recipe,
      id: `${parsed.recipe.slug}-copy`,
      slug: `${parsed.recipe.slug}-copy`,
      title: `${parsed.recipe.title} copy`,
      published: false,
      featured: false,
      validationStatus: "experimental" as const,
      preview: { ...parsed.recipe.preview, src: "/g9-sample-scene.svg", authenticity: "illustrative" as const, alt: "Illustrative preview on the shared original vector scene; not a DC-G9 photograph." },
      testEvidence: undefined,
      createdAt: now,
      updatedAt: now,
    };
    setSaveSlug(undefined);
    setJson(JSON.stringify(duplicateRecipe, null, 2));
    onMessage("Duplicate created as an unpublished experimental draft.");
  }

  async function save() {
    if (!parsed.recipe) return;
    setBusy(true); setValidationMessage("");
    try {
      const response = await fetch(saveSlug ? `/api/admin/recipes/${encodeURIComponent(saveSlug)}` : "/api/admin/recipes", {
        method: saveSlug ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe: parsed.recipe, changeNotes: changeNotes || (saveSlug ? "Edited recipe in admin" : "Created recipe"), expectedUpdatedAt: entry?.recipe.updatedAt }),
      });
      const body = await response.json() as { recipe?: G9Recipe; error?: string };
      if (!response.ok || !body.recipe) throw new Error(body.error ?? "Could not save this recipe.");
      setSaveSlug(body.recipe.slug);
      setJson(JSON.stringify(body.recipe, null, 2));
      setChangeNotes("");
      setRevisionTick((value) => value + 1);
      onSaved(body.recipe);
    } catch (cause) { setValidationMessage(cause instanceof Error ? cause.message : "Could not save this recipe."); }
    finally { setBusy(false); }
  }

  async function archive() {
    if (!entry || !saveSlug) return;
    const archived = !entry.archivedAt;
    if (archived && !window.confirm(`Archive “${entry.recipe.title}”? It will no longer appear in the public catalogue.`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/recipes/${encodeURIComponent(saveSlug)}/archive`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archived }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not update archive status.");
      onMessage(archived ? "Recipe archived." : "Recipe restored as an unpublished draft.");
      setRevisionTick((value) => value + 1);
      onChanged?.();
    } catch (cause) { setValidationMessage(cause instanceof Error ? cause.message : "Could not update archive status."); }
    finally { setBusy(false); }
  }

  async function deleteRecipe() {
    if (!entry || !saveSlug || !window.confirm(`Permanently delete “${entry.recipe.title}” and its attached photographs?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/recipes/${encodeURIComponent(saveSlug)}`, { method: "DELETE" });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not delete this recipe.");
      onMessage("Recipe deleted. Its revision record remains available for audit.");
      onChanged?.();
    } catch (cause) { setValidationMessage(cause instanceof Error ? cause.message : "Could not delete this recipe."); }
    finally { setBusy(false); }
  }

  function exportRecipe() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${parsed.recipe?.slug ?? "g9-recipe"}.json`; anchor.click(); URL.revokeObjectURL(url);
  }

  async function importRecipe(file?: File) {
    if (!file) return;
    try {
      const candidate: unknown = JSON.parse(await file.text());
      const recipe = G9RecipeSchema.parse(candidate);
      setJson(JSON.stringify(recipe, null, 2));
      setSaveSlug(undefined);
      onMessage("Recipe imported as a draft. Review validation and save it to Neon.");
    } catch { setValidationMessage("The import is not a valid original-G9 recipe document."); }
  }

  return <article className="admin-editor-card">
    <div className="admin-editor-heading"><div><p className="eyebrow">{saveSlug ? "Recipe editor" : "New draft"}</p><h2>{parsed.recipe?.title ?? "Recipe details"}</h2></div><span className={`admin-status-chip ${parsed.recipe?.published ? "published" : "draft"}`}>{entry?.archivedAt && saveSlug === entry.recipe.slug ? "Archived" : parsed.recipe?.published ? "Published" : "Draft"}</span></div>
    {entry?.archivedAt && saveSlug === entry.recipe.slug && <p className="admin-archive-note">This recipe is archived and will not be shown publicly. Restoring it keeps it unpublished until you publish it again.</p>}
    <label className="admin-form-field"><span>Change note · saved into revision history</span><input value={changeNotes} onChange={(event) => setChangeNotes(event.currentTarget.value)} placeholder="What changed?" maxLength={1000} /></label>
    <label className="admin-form-field admin-json-field"><span>Validated recipe document · original DC-G9 controls only</span><textarea spellCheck={false} aria-label="Recipe JSON document" value={json} onChange={(event) => setJson(event.currentTarget.value)} rows={26} /></label>
    <div className={`admin-validation ${parsed.error ? "invalid" : "valid"}`}><span>{parsed.error ? "Review validation" : "Valid G9 recipe document"}</span>{parsed.error && <p>{parsed.error}</p>}</div>
    {validationMessage && <p className="admin-feedback error-feedback" role="alert">{validationMessage}</p>}
    <div className="admin-editor-actions">
      <button type="button" className="button button-dark" onClick={() => void save()} disabled={busy || !parsed.recipe}><Save size={14} /> {busy ? "Saving…" : saveSlug ? "Save changes" : "Save new recipe"}</button>
      {parsed.recipe && <button type="button" className="outline-button" onClick={() => setPublished(!parsed.recipe!.published)} disabled={busy}>{parsed.recipe.published ? "Unpublish" : "Publish"}</button>}
      {entry && saveSlug && <button type="button" className="outline-button" onClick={duplicate} disabled={!parsed.recipe}><Copy size={14} /> Duplicate</button>}
      <button type="button" className="outline-button" onClick={exportRecipe} disabled={!parsed.recipe}><Download size={14} /> Export JSON</button>
      <label className="outline-button admin-import-button"><FileUp size={14} /> Import JSON<input aria-label="Import recipe JSON" type="file" accept="application/json,.json" onChange={(event) => void importRecipe(event.currentTarget.files?.[0])} /></label>
      {entry && saveSlug && <button type="button" className="outline-button" onClick={() => void archive()} disabled={busy}><Archive size={14} /> {entry.archivedAt ? "Restore draft" : "Archive"}</button>}
      {entry && saveSlug && <button type="button" className="outline-button danger-text" onClick={() => void deleteRecipe()} disabled={busy}><Trash2 size={14} /> Delete permanently</button>}
    </div>
    {saveSlug && parsed.recipe && <>
      <EditorialPhotoManager recipe={parsed.recipe} onUseHero={(url) => {
        if (parsed.recipe!.validationStatus !== "experimental") {
          setValidationMessage("The tested preview stays attached to a hardware-validated recipe. The uploaded image remains in its gallery.");
          return;
        }
        const next = { ...parsed.recipe!, preview: { ...parsed.recipe!.preview, src: url, authenticity: "illustrative" as const, alt: `Approved illustrative image for ${parsed.recipe!.title}; not a recipe-tested original G9 JPEG.` } };
        setJson(JSON.stringify(next, null, 2));
      }} onMessage={onMessage} />
      <CameraTestRecorder recipe={parsed.recipe} onRecorded={() => { onMessage("Camera test evidence saved. Recipe validation status has been updated where applicable."); setRevisionTick((value) => value + 1); onChanged?.(); }} />
      <RecipeRevisionHistory key={`${saveSlug}-${revisionTick}`} slug={saveSlug} />
    </>}
    {parsed.recipe && <a className="admin-public-link" href={parsed.recipe.published ? `/recipes/${parsed.recipe.slug}` : "/recipes"} target="_blank" rel="noreferrer">Open public recipe view <ArrowUpRight size={14} /></a>}
  </article>;
}

function RecipeRevisionHistory({ slug }: { slug: string }) {
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/admin/recipes/${encodeURIComponent(slug)}/revisions`, { cache: "no-store" });
        const body = await response.json() as { revisions?: RevisionRow[] };
        if (active && body.revisions) setRevisions(body.revisions);
      } catch { /* Revision history is an optional panel while the database is unavailable. */ }
    }
    void load();
    return () => { active = false; };
  }, [slug]);
  return <section className="admin-subsection"><div className="admin-subsection-title"><div><p className="eyebrow">Change history</p><h3>Recipe revisions</h3></div><span>{revisions.length} versions</span></div>
    {!revisions.length ? <p className="admin-help-note">No stored revisions yet. Saving a recipe or recording a physical camera test creates a revision snapshot.</p> : <div className="admin-revision-list">{revisions.map((revision) => <details key={revision.id}><summary><strong>v{revision.version}</strong><span>{revision.change_notes || "Recipe update"}</span><time dateTime={revision.created_at}>{new Date(revision.created_at).toLocaleString()}</time></summary><pre>{JSON.stringify(revision.document_snapshot, null, 2)}</pre></details>)}</div>}
  </section>;
}

function EditorialPhotoManager({ recipe, onUseHero, onMessage }: { recipe: G9Recipe; onUseHero: (url: string) => void; onMessage: (message: string) => void }) {
  const [images, setImages] = useState<ImageRow[]>([]);
  const [imageType, setImageType] = useState("hero");
  const [authenticityType, setAuthenticityType] = useState("illustrative");
  const [photographer, setPhotographer] = useState("");
  const [licence, setLicence] = useState("");
  const [firmwareVersion, setFirmwareVersion] = useState("");
  const [lens, setLens] = useState("");
  const [whiteBalance, setWhiteBalance] = useState("");
  const [exposureDetails, setExposureDetails] = useState("");
  const [lightingConditions, setLightingConditions] = useState("");
  const [pairId, setPairId] = useState("");
  const [confirmPublicAsset, setConfirmPublicAsset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadImages = useCallback(async () => {
    const response = await fetch(`/api/admin/images?recipeSlug=${encodeURIComponent(recipe.slug)}`, { cache: "no-store" });
    const body = await response.json() as { images?: ImageRow[]; error?: string };
    if (!response.ok || !body.images) throw new Error(body.error ?? "Could not load recipe images.");
    setImages(body.images);
  }, [recipe.slug]);

  useEffect(() => {
    let active = true;
    async function loadOnMount() {
      try {
        const response = await fetch(`/api/admin/images?recipeSlug=${encodeURIComponent(recipe.slug)}`, { cache: "no-store" });
        const body = await response.json() as { images?: ImageRow[] };
        if (active && body.images) setImages(body.images);
      } catch { /* The upload panel remains usable when no image service is configured. */ }
    }
    void loadOnMount();
    return () => { active = false; };
  }, [recipe.slug]);

  function changeImageType(value: string) {
    setImageType(value);
    setAuthenticityType(value === "camera-jpeg" ? "g9-capture" : value === "control" || value === "experimental-result" ? "controlled-pair" : "illustrative");
  }

  async function uploadImage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = (form.elements.namedItem("editorial-image") as HTMLInputElement | null)?.files?.[0];
    if (!file) { setError("Choose an image first."); return; }
    setBusy(true); setError("");
    try {
      const metadata = { recipeSlug: recipe.slug, imageType, authenticityType, photographer, licence, firmwareVersion, lens, whiteBalance, exposureDetails, lightingConditions, pairId, confirmPublicAsset };
      const data = new FormData(); data.append("image", file); data.append("metadata", JSON.stringify(metadata));
      const response = await fetch("/api/admin/images", { method: "POST", body: data });
      const body = await response.json() as { image?: ImageRow; error?: string };
      if (!response.ok || !body.image) throw new Error(body.error ?? "The image upload failed.");
      if (body.image.image_type === "hero" && body.image.authenticity_type === "illustrative") onUseHero(body.image.image_url);
      onMessage("Approved image uploaded to Vercel Blob with its attribution and authenticity details.");
      form.reset(); setPhotographer(""); setLicence("");
      await loadImages();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The image upload failed."); }
    finally { setBusy(false); }
  }

  async function removeImage(image: ImageRow) {
    if (!window.confirm(`Delete this image by ${image.photographer}?`)) return;
    try {
      const response = await fetch(`/api/admin/images/${image.id}`, { method: "DELETE" });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not delete the image.");
      await loadImages();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete the image."); }
  }

  return <section className="admin-subsection"><div className="admin-subsection-title"><div><p className="eyebrow">Approved photography</p><h3><ImagePlus size={17} /> Recipe images</h3></div><span>{images.length} attached</span></div>
    <p className="admin-help-note">Uploads become publicly addressable editorial images, limited to 3 MB JPEG, PNG or WebP. Metadata is not stripped automatically. Remove GPS/EXIF details you do not want public before uploading. A camera JPEG is never labelled as a controlled recipe result unless matching control and result photos share a pair ID.</p>
    <form className="admin-photo-form" onSubmit={uploadImage}>
      <div className="admin-photo-form-grid">
        <label className="admin-form-field"><span>Image</span><input required name="editorial-image" type="file" accept="image/jpeg,image/png,image/webp" /></label>
        <label className="admin-form-field"><span>Image role</span><select value={imageType} onChange={(event) => changeImageType(event.currentTarget.value)}><option value="hero">Hero</option><option value="camera-jpeg">Original G9 JPEG</option><option value="control">Control photograph</option><option value="experimental-result">Experimental result</option></select></label>
        <label className="admin-form-field"><span>Authenticity</span><select value={authenticityType} onChange={(event) => setAuthenticityType(event.currentTarget.value)}><option value="illustrative">Illustrative</option><option value="g9-capture">Original DC-G9 capture</option><option value="controlled-pair">Controlled same-scene pair</option></select></label>
        <label className="admin-form-field"><span>Photographer credit</span><input required value={photographer} onChange={(event) => setPhotographer(event.currentTarget.value)} maxLength={120} /></label>
        <label className="admin-form-field"><span>Licence / permission</span><input required value={licence} onChange={(event) => setLicence(event.currentTarget.value)} maxLength={240} placeholder="Permission granted / CC BY 4.0" /></label>
        {(imageType === "control" || imageType === "experimental-result") && <label className="admin-form-field"><span>Shared controlled-pair ID</span><input required value={pairId} onChange={(event) => setPairId(event.currentTarget.value)} maxLength={80} /></label>}
        <label className="admin-form-field"><span>G9 firmware</span><input value={firmwareVersion} onChange={(event) => setFirmwareVersion(event.currentTarget.value)} maxLength={20} placeholder="2.7" /></label>
        <label className="admin-form-field"><span>Lens</span><input value={lens} onChange={(event) => setLens(event.currentTarget.value)} maxLength={120} /></label>
        <label className="admin-form-field"><span>White balance</span><input value={whiteBalance} onChange={(event) => setWhiteBalance(event.currentTarget.value)} maxLength={120} /></label>
        <label className="admin-form-field"><span>Exposure details</span><input value={exposureDetails} onChange={(event) => setExposureDetails(event.currentTarget.value)} maxLength={240} /></label>
        <label className="admin-form-field admin-wide-field"><span>Lighting conditions</span><input value={lightingConditions} onChange={(event) => setLightingConditions(event.currentTarget.value)} maxLength={240} /></label>
      </div>
      <label className="admin-public-asset-confirm"><input type="checkbox" checked={confirmPublicAsset} onChange={(event) => setConfirmPublicAsset(event.currentTarget.checked)} required /><span>I have permission to publish this image and have removed any private location or camera metadata that should not be public.</span></label>
      <button type="submit" className="outline-button" disabled={busy || !confirmPublicAsset}><ImagePlus size={14} /> {busy ? "Uploading…" : "Upload and attach"}</button>
      {error && <p className="admin-feedback error-feedback" role="alert">{error}</p>}
    </form>
    <div className="admin-image-grid">{images.map((image) => <article className="admin-image-card" key={image.id}><div className="admin-image-thumb"><Image src={image.image_url} alt={`${image.image_type.replaceAll("-", " ")} · ${image.photographer}`} fill sizes="(max-width: 760px) 40vw, 160px" unoptimized /></div><div><strong>{image.image_type.replaceAll("-", " ")}</strong><span>{image.authenticity_type.replaceAll("-", " ")} · {image.photographer}</span><small>{image.licence}</small><button type="button" className="danger-text" onClick={() => void removeImage(image)}><Trash2 size={13} /> Delete image</button></div></article>)}</div>
    <button type="button" className="small-text-button" onClick={() => void loadImages().catch((cause) => setError(cause instanceof Error ? cause.message : "Could not refresh images."))}>Refresh image list</button>
  </section>;
}

function CameraTestRecorder({ recipe, onRecorded }: { recipe: G9Recipe; onRecorded: () => void }) {
  const [images, setImages] = useState<ImageRow[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [firmwareVersion, setFirmwareVersion] = useState("2.7");
  const [lens, setLens] = useState("");
  const [lightingConditions, setLightingConditions] = useState("");
  const [whiteBalance, setWhiteBalance] = useState("");
  const [exposureDetails, setExposureDetails] = useState("");
  const [findings, setFindings] = useState("");
  const [photographer, setPhotographer] = useState("");
  const [controlUrl, setControlUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<RecipeTestRecord["verificationStatus"]>("community-tested");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    const [imageResponse, testResponse] = await Promise.all([
      fetch(`/api/admin/images?recipeSlug=${encodeURIComponent(recipe.slug)}`, { cache: "no-store" }),
      fetch(`/api/admin/recipes/${encodeURIComponent(recipe.slug)}/tests`, { cache: "no-store" }),
    ]);
    const imageBody = await imageResponse.json() as { images?: ImageRow[] };
    const testBody = await testResponse.json() as { tests?: TestRow[] };
    if (imageBody.images) setImages(imageBody.images);
    if (testBody.tests) setTests(testBody.tests);
  }, [recipe.slug]);
  useEffect(() => {
    let active = true;
    async function loadOnMount() {
      try {
        const [imageResponse, testResponse] = await Promise.all([
          fetch(`/api/admin/images?recipeSlug=${encodeURIComponent(recipe.slug)}`, { cache: "no-store" }),
          fetch(`/api/admin/recipes/${encodeURIComponent(recipe.slug)}/tests`, { cache: "no-store" }),
        ]);
        const imageBody = await imageResponse.json() as { images?: ImageRow[] };
        const testBody = await testResponse.json() as { tests?: TestRow[] };
        if (active && imageBody.images) setImages(imageBody.images);
        if (active && testBody.tests) setTests(testBody.tests);
      } catch { /* The local editor still works without the admin database. */ }
    }
    void loadOnMount();
    return () => { active = false; };
  }, [recipe.slug]);

  const controlImages = images.filter((image) => image.image_type === "control" && image.authenticity_type === "controlled-pair");
  const selectedControl = controlImages.find((image) => image.image_url === controlUrl);
  const pairId = selectedControl?.metadata?.pairId;
  const resultImages = images.filter((image) => image.image_type === "experimental-result" && image.authenticity_type === "controlled-pair" && typeof pairId === "string" && image.metadata?.pairId === pairId);

  async function submitTest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const record: RecipeTestRecord = {
      cameraModel: "DC-G9", firmwareVersion, lens, lightingConditions, whiteBalance, exposureDetails, findings,
      evidence: { controlJpegUrl: controlUrl, resultJpegUrl: resultUrl, sameScenePair: true, photographer },
      verificationStatus, testedAt: new Date().toISOString(),
    };
    try {
      const response = await fetch(`/api/admin/recipes/${encodeURIComponent(recipe.slug)}/tests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(record) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not record the camera test.");
      setFindings(""); setLightingConditions(""); setExposureDetails("");
      await reload(); onRecorded();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not record the camera test."); }
    finally { setBusy(false); }
  }

  return <section className="admin-subsection"><div className="admin-subsection-title"><div><p className="eyebrow">Hardware evidence</p><h3><Check size={17} /> Camera testing</h3></div><span>{tests.length} records</span></div>
    <p className="admin-help-note">Only original DC-G9 tests with uploaded control and result JPEGs from the same recorded pair can change validation status. Browser previews alone never count as camera evidence.</p>
    <form className="admin-test-form" onSubmit={submitTest}>
      <div className="admin-photo-form-grid">
        <label className="admin-form-field"><span>Tested on</span><input value="Panasonic Lumix DC-G9" readOnly /></label>
        <label className="admin-form-field"><span>Firmware</span><input required value={firmwareVersion} onChange={(event) => setFirmwareVersion(event.currentTarget.value)} placeholder="2.7" /></label>
        <label className="admin-form-field"><span>Lens</span><input required value={lens} onChange={(event) => setLens(event.currentTarget.value)} /></label>
        <label className="admin-form-field"><span>Photographer</span><input required value={photographer} onChange={(event) => setPhotographer(event.currentTarget.value)} /></label>
        <label className="admin-form-field"><span>Control JPEG · matched pair</span><select required value={controlUrl} onChange={(event) => { setControlUrl(event.currentTarget.value); setResultUrl(""); }}><option value="">Choose control image</option>{controlImages.map((image) => <option key={image.id} value={image.image_url}>{String(image.metadata?.pairId ?? "Pair")} · {image.photographer}</option>)}</select></label>
        <label className="admin-form-field"><span>Result JPEG · same pair ID</span><select required value={resultUrl} onChange={(event) => setResultUrl(event.currentTarget.value)}><option value="">Choose result image</option>{resultImages.map((image) => <option key={image.id} value={image.image_url}>{String(image.metadata?.pairId ?? "Pair")} · {image.photographer}</option>)}</select></label>
        <label className="admin-form-field"><span>White balance</span><input required value={whiteBalance} onChange={(event) => setWhiteBalance(event.currentTarget.value)} /></label>
        <label className="admin-form-field"><span>Exposure settings</span><input required value={exposureDetails} onChange={(event) => setExposureDetails(event.currentTarget.value)} /></label>
        <label className="admin-form-field"><span>Lighting</span><input required value={lightingConditions} onChange={(event) => setLightingConditions(event.currentTarget.value)} /></label>
        <label className="admin-form-field"><span>Validation status</span><select value={verificationStatus} onChange={(event) => setVerificationStatus(event.currentTarget.value as RecipeTestRecord["verificationStatus"])}><option value="community-tested">Community tested</option><option value="camera-verified">Camera verified</option><option value="rejected">Rejected test</option></select></label>
        <label className="admin-form-field admin-wide-field"><span>Observed findings</span><textarea required minLength={20} value={findings} onChange={(event) => setFindings(event.currentTarget.value)} rows={3} /></label>
      </div>
      {error && <p className="admin-feedback error-feedback" role="alert">{error}</p>}
      <button className="outline-button" type="submit" disabled={busy || !controlUrl || !resultUrl || !lens || !photographer || findings.trim().length < 20}><Check size={14} /> {busy ? "Recording…" : "Record hardware test"}</button>
    </form>
    {tests.length > 0 && <div className="admin-test-history">{tests.map((test) => <article key={test.id}><strong>{test.verification_status.replaceAll("-", " ")} · FW {test.firmware_version}</strong><span>{test.tested_by} · {new Date(test.tested_at).toLocaleDateString()}</span><p>{test.findings}</p></article>)}</div>}
  </section>;
}
