"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, RotateCcw } from "lucide-react";
import { firmwareAtLeast } from "@/lib/camera/g9";
import type { G9Recipe } from "@/lib/recipes/schema";

type Quality = "JPEG" | "RAW+JPEG";
type StillMode = "P" | "A" | "S" | "M";
type WizardState = {
  completed: number[];
  firmware: string;
  quality: Quality;
  mode: StillMode;
  slot: "Custom1" | "Custom2" | "Custom3" | "Custom4";
  modelConfirmed: boolean;
};

const defaultState: WizardState = Object.freeze({ completed: [], firmware: "2.7", quality: "RAW+JPEG", mode: "A", slot: "Custom1", modelConfirmed: false });
const versions = ["1.0", "1.1", "1.2", "1.3", "2.0", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7"];
const modes: StillMode[] = ["P", "A", "S", "M"];
const stepTitles = ["Confirm your camera", "Check firmware", "Choose image quality", "Select a photo mode", "Open Photo Style", "Choose a base style", "Enter picture-quality values", "Check Highlight Shadow", "Set White Balance", "Review optional guidance", "Save to a Photo Style slot", "Shoot a test JPEG"];
const snapshots = new Map<string, { raw: string | null; value: WizardState }>();
const eventName = (key: string) => `g9-film-lab:setup-change:${key}`;

function parseWizardState(value: unknown): WizardState {
  if (!value || typeof value !== "object") return defaultState;
  const candidate = value as Partial<WizardState>;
  return {
    completed: Array.isArray(candidate.completed) ? candidate.completed.filter((item): item is number => Number.isInteger(item) && item >= 0 && item < stepTitles.length) : [],
    firmware: typeof candidate.firmware === "string" && versions.includes(candidate.firmware) ? candidate.firmware : defaultState.firmware,
    quality: candidate.quality === "JPEG" || candidate.quality === "RAW+JPEG" ? candidate.quality : defaultState.quality,
    mode: modes.includes(candidate.mode as StillMode) ? candidate.mode as StillMode : defaultState.mode,
    slot: ["Custom1", "Custom2", "Custom3", "Custom4"].includes(candidate.slot ?? "") ? candidate.slot as WizardState["slot"] : defaultState.slot,
    modelConfirmed: candidate.modelConfirmed === true,
  };
}

function getWizardSnapshot(key: string): WizardState {
  try {
    const raw = localStorage.getItem(key);
    const cached = snapshots.get(key);
    if (cached?.raw === raw) return cached.value;
    let value = defaultState;
    if (raw) {
      try { value = parseWizardState(JSON.parse(raw) as unknown); } catch { value = defaultState; }
    }
    snapshots.set(key, { raw, value });
    return value;
  } catch {
    return snapshots.get(key)?.value ?? defaultState;
  }
}

function subscribeWizard(key: string, onChange: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === key) onChange(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(eventName(key), onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(eventName(key), onChange);
  };
}

function writeWizardState(key: string, update: (current: WizardState) => WizardState) {
  const value = update(getWizardSnapshot(key));
  let raw: string | null = null;
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    raw = serialized;
  } catch {
    // Keep the checklist available in memory when browser storage is disabled.
  }
  snapshots.set(key, { raw, value });
  window.dispatchEvent(new Event(eventName(key)));
}

function resetWizardState(key: string) {
  try { localStorage.removeItem(key); } catch { /* The in-memory checklist is still reset. */ }
  snapshots.set(key, { raw: null, value: defaultState });
  window.dispatchEvent(new Event(eventName(key)));
}

export function G9SetupWizard({ recipe }: { recipe?: G9Recipe }) {
  const key = `g9-film-lab:setup:${recipe?.slug ?? "general"}:v1`;
  const [step, setStep] = useState(0);
  const subscribe = useCallback((onChange: () => void) => subscribeWizard(key, onChange), [key]);
  const getSnapshot = useCallback(() => getWizardSnapshot(key), [key]);
  const state = useSyncExternalStore(subscribe, getSnapshot, () => defaultState);
  const titles = stepTitles;
  const currentSettings = recipe?.settings;

  function patchState(patch: Partial<WizardState>) {
    writeWizardState(key, (current) => ({ ...current, ...patch }));
  }
  function markStepComplete() {
    writeWizardState(key, (current) => ({ ...current, completed: [...new Set([...current.completed, step])] }));
  }
  function clearProgress() {
    resetWizardState(key);
    setStep(0);
  }

  function confirmCamera() {
    writeWizardState(key, (current) => ({ ...current, modelConfirmed: true, completed: [...new Set([...current.completed, step])] }));
  }

  const firmwareWarning = Boolean(recipe && !firmwareAtLeast(state.firmware, recipe.firmwareMinimum));
  const allDone = state.completed.length === titles.length;

  return (
    <section className="wizard-shell" aria-label="Camera setup wizard">
      <aside className="wizard-side">
        <div className="wizard-progress-top"><div><p className="eyebrow">Camera-side checklist</p><h2>Take it one step at a time.</h2></div><button type="button" className="icon-text-button" onClick={clearProgress}><RotateCcw size={14} /> Reset</button></div>
        <div className="wizard-progress-meter"><span style={{ width: `${(state.completed.length / titles.length) * 100}%` }} /></div>
        <p className="wizard-progress-copy">{state.completed.length} of {titles.length} steps complete · saved on this device</p>
        <ol className="wizard-step-nav">
          {titles.map((title, index) => <li key={title}><button type="button" className={step === index ? "active" : ""} onClick={() => setStep(index)} aria-current={step === index ? "step" : undefined}><span className="wizard-step-index">{state.completed.includes(index) ? <Check size={14} /> : String(index + 1).padStart(2, "0")}</span><span>{title}</span></button></li>)}
        </ol>
      </aside>
      <div className="wizard-main">
        <div className="wizard-step-count">STEP {String(step + 1).padStart(2, "0")} / {String(titles.length).padStart(2, "0")}</div>
        <div className="wizard-step-content">
          {step === 0 && <>
            <p className="eyebrow">Before you begin</p><h2>Are you using the original DC-G9?</h2><p>These recipes are designed for the 2017 Panasonic Lumix DC-G9. The G9 II (DC-G9M2) is a different camera with different controls.</p>
            <div className="choice-row"><button type="button" className={`choice-card ${state.modelConfirmed ? "selected" : ""}`} onClick={confirmCamera}><Check size={16} /><strong>Yes, original DC-G9</strong><span>Continue with this guide</span></button><button type="button" className="choice-card warning-choice" onClick={() => writeWizardState(key, (current) => ({ ...current, modelConfirmed: false, completed: current.completed.filter((item) => item !== 0) }))}><CircleAlert size={16} /><strong>No, I have a G9 II</strong><span>This recipe may not apply</span></button></div>
            {!state.modelConfirmed && <p className="inline-warning">Stop here if you have the G9 II. This guide covers the original DC-G9 only.</p>}
          </>}
          {step === 1 && <>
            <p className="eyebrow">Firmware check</p><h2>Which firmware is on your G9?</h2><p>Find the version under <strong>MENU → Setup → Version Disp.</strong> L.Monochrome D and Grain Effect require firmware 1.1 or later. AWBw requires 2.0 or later.</p>
            <label className="wizard-label" htmlFor="firmware-version">DC-G9 firmware<select id="firmware-version" value={state.firmware} onChange={(event) => patchState({ firmware: event.target.value })}>{versions.map((version) => <option key={version} value={version}>{version}{version === "2.7" ? " · latest listed by Panasonic" : ""}</option>)}</select></label>
            {firmwareWarning && <p className="inline-warning">This recipe asks for firmware {recipe?.firmwareMinimum} or later. Your selected version may not expose all these controls.</p>}
          </>}
          {step === 2 && <>
            <p className="eyebrow">JPEG setup</p><h2>Choose your image quality.</h2><p>Recipes affect the processed still JPEG. Pick JPEG for a ready-to-share file, or RAW+JPEG if you also want a RAW original for flexibility.</p>
            <div className="choice-row compact-choice"><button type="button" className={`choice-card ${state.quality === "JPEG" ? "selected" : ""}`} onClick={() => patchState({ quality: "JPEG" })}><strong>JPEG</strong><span>Finished in-camera file</span></button><button type="button" className={`choice-card ${state.quality === "RAW+JPEG" ? "selected" : ""}`} onClick={() => patchState({ quality: "RAW+JPEG" })}><strong>RAW + JPEG</strong><span>Processed file plus RAW capture</span></button></div><p className="menu-path">MENU → Rec → Quality</p>
          </>}
          {step === 3 && <>
            <p className="eyebrow">Still photography</p><h2>Choose a photo exposure mode.</h2><p>Set the mode dial to a still-photo exposure mode. P, A, S and M are practical choices while you configure and test a recipe.</p>
            <div className="mode-picker">{modes.map((mode) => <button type="button" key={mode} className={state.mode === mode ? "selected" : ""} onClick={() => patchState({ mode })}>{mode}<small>{({ P: "Program", A: "Aperture", S: "Shutter", M: "Manual" } as const)[mode]}</small></button>)}</div><p className="menu-path">Use the mode dial on top of the camera.</p>
          </>}
          {step === 4 && <>
            <p className="eyebrow">Camera menu</p><h2>Open Photo Style.</h2><p>Press MENU/SET and select the Recording menu. Choose <strong>Photo Style</strong> to open the original G9’s colour and monochrome styles.</p><div className="camera-menu-illustration"><span>MENU</span><span className="menu-chevron">›</span><span>Rec</span><span className="menu-chevron">›</span><strong>Photo Style</strong></div><p className="menu-path">MENU → Rec → Photo Style</p>
          </>}
          {step === 5 && <>
            <p className="eyebrow">Start with a base</p><h2>Choose the recipe’s Photo Style.</h2><p>{recipe ? <>Select <strong>{currentSettings?.photoStyle}</strong> as the base Photo Style. Recipe names such as “Muted Chrome” are descriptive inspiration, not camera modes.</> : <>Select a supported Photo Style such as Natural, Standard, Portrait or Monochrome. Recipe names are descriptive inspiration, not camera modes.</>}</p>{recipe && <div className="wizard-setting-highlight"><span>BASE PHOTO STYLE</span><strong>{currentSettings?.photoStyle}</strong></div>}<p className="supporting-note">Custom1–Custom4 are saved Photo Style slots. They are not the G9’s custom exposure modes.</p>
          </>}
          {step === 6 && <>
            <p className="eyebrow">Picture quality</p><h2>Enter the recipe values.</h2><p>Open each picture-quality item shown for the selected Photo Style and set its value. The G9 controls are available in whole steps from −5 to +5.</p>
            {recipe && <dl className="wizard-values">{[["Contrast", currentSettings?.contrast], ["Sharpness", currentSettings?.sharpness], ["Noise Reduction", currentSettings?.noiseReduction], ...(currentSettings?.saturation === undefined ? [] : [["Saturation", currentSettings.saturation]]), ...(currentSettings?.colorTone === undefined ? [] : [["Color Tone", currentSettings.colorTone]]), ...(currentSettings?.filterEffect ? [["Filter Effect", currentSettings.filterEffect]] : []), ...(currentSettings?.grainEffect ? [["Grain Effect", currentSettings.grainEffect]] : [])].map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{typeof value === "number" && value > 0 ? `+${value}` : value}</dd></div>)}</dl>}
            {!recipe && <p className="supporting-note">For monochrome styles, use the monochrome controls shown in the recipe card. Saturation is for colour Photo Styles.</p>}
          </>}
          {step === 7 && <>
            <p className="eyebrow">Tone curve</p><h2>Check Highlight Shadow.</h2><p>The G9’s separate Highlight Shadow adjustment is in the Recording menu. It adjusts bright and dark portions while you preview the image.</p>
            <div className="preset-list"><span>Standard</span><span>Raise the contrast</span><span>Lower the contrast</span><span>Brighten dark areas</span></div>
            {currentSettings?.highlightShadow ? <p className="wizard-setting-highlight"><span>THIS RECIPE</span><strong>{currentSettings.highlightShadow}</strong></p> : <p className="supporting-note">This recipe does not prescribe a Highlight Shadow change. Leave it at Standard for a neutral starting point.</p>}
            <p className="menu-path">MENU → Rec → Highlight Shadow</p>
          </>}
          {step === 8 && <>
            <p className="eyebrow">White balance</p><h2>Set the colour of the light.</h2>{recipe ? <p>Choose <strong>{currentSettings?.whiteBalance.mode}{currentSettings?.whiteBalance.kelvin ? ` · ${currentSettings.whiteBalance.kelvin} K` : ""}</strong> in White Balance.</p> : <p>Set the recipe’s White Balance mode and Kelvin value if one is specified.</p>}
            <div className="wb-directions"><span className="wb-top">G · Green</span><span className="wb-left">A · Amber</span><span className="wb-center">0<br /><small>centre</small></span><span className="wb-right">B · Blue</span><span className="wb-bottom">M · Magenta</span></div>
            <p>Fine adjustments use the camera’s A/B (amber/blue) and G/M (green/magenta) axes. This recipe has no WB axis shift specified, so leave the fine adjustment centred. Press DISP. to reset it to centre.</p><p className="menu-path">WB button → select a mode → fine adjustment</p>
          </>}
          {step === 9 && <>
            <p className="eyebrow">Shooting guidance</p><h2>Keep optional settings optional.</h2><p>{recipe?.shootingNotes ?? "Follow the recipe’s shooting notes and evaluate the first JPEG in the light you plan to use."}</p>
            {recipe?.settings.suggestedExposureCompensation !== undefined && <div className="wizard-setting-highlight"><span>OPTIONAL EXPOSURE SUGGESTION</span><strong>{recipe.settings.suggestedExposureCompensation > 0 ? "+" : ""}{recipe.settings.suggestedExposureCompensation} EV</strong></div>}
            <p className="supporting-note">Exposure compensation is a shooting suggestion, not part of the Photo Style. i.Dynamic and other camera settings are not included unless a recipe explicitly lists them.</p>
          </>}
          {step === 10 && <>
            <p className="eyebrow">Save the Photo Style</p><h2>Choose a Custom slot.</h2><p>Register the adjusted Photo Style into one of the four available user slots. This stores the modified Photo Style; it does not turn a custom exposure mode into a recipe.</p>
            <label className="wizard-label" htmlFor="custom-slot">Photo Style slot<select id="custom-slot" value={state.slot} onChange={(event) => patchState({ slot: event.target.value as WizardState["slot"] })}>{["Custom1", "Custom2", "Custom3", "Custom4"].map((slot) => <option key={slot}>{slot}</option>)}</select></label>
            <div className="slot-explainer"><div><strong>Custom Photo Style slots</strong><span>Custom1–Custom4 store adjusted Photo Styles.</span></div><div><strong>Custom exposure modes</strong><span>The mode dial’s C positions recall groups of camera settings.</span></div><div><strong>SD-card Save/Restore</strong><span>Stores broader camera configurations on slot 1; it is not a single-look installer.</span></div></div>
          </>}
          {step === 11 && <>
            <p className="eyebrow">First frame</p><h2>Shoot a test JPEG.</h2><p>Use a familiar scene with skin, sky and neutrals if possible. Check the JPEG on the camera, then make small changes to match your own light and taste.</p><div className="test-shot-card"><span>FINAL CHECK</span><p>{recipe ? recipe.title : "Your recipe"}</p><ul><li><Check size={14} /> Confirm colour and highlight detail</li><li><Check size={14} /> Note the light and exposure</li><li><Check size={14} /> Save the version you prefer</li></ul></div><p className="supporting-note">Progress stays in this browser on this device. It is not synced or backed up automatically.</p>
          </>}
        </div>
        <div className="wizard-footer"><button type="button" className="outline-button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}><ArrowLeft size={15} /> Previous</button><div>{state.completed.includes(step) ? <span className="step-complete-label"><Check size={14} /> Complete</span> : <button type="button" className="mark-complete" onClick={markStepComplete}>Mark step complete <Check size={14} /></button>}<button type="button" className="button button-dark" onClick={() => setStep((current) => Math.min(titles.length - 1, current + 1))} disabled={step === titles.length - 1 || (step === 0 && !state.modelConfirmed)}>Next <ArrowRight size={15} /></button></div></div>
        {allDone && <p className="wizard-done">Your checklist is complete. Take the recipe out and make something good.</p>}
      </div>
    </section>
  );
}
