import type { G9Recipe } from "@/lib/recipes/schema";

function signed(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

export function RecipeSettingsCard({ recipe }: { recipe: G9Recipe }) {
  const settings = recipe.settings;
  const rows: Array<[string, string]> = [
    ["Photo Style", settings.photoStyle],
    ["Contrast", signed(settings.contrast)],
    ["Sharpness", signed(settings.sharpness)],
    ["Noise Reduction", signed(settings.noiseReduction)],
  ];
  if (settings.saturation !== undefined) rows.push(["Saturation", signed(settings.saturation)]);
  if (settings.colorTone !== undefined) rows.push(["Color Tone", signed(settings.colorTone)]);
  if (settings.filterEffect) rows.push(["Filter Effect", settings.filterEffect]);
  if (settings.grainEffect) rows.push(["Grain Effect", settings.grainEffect]);
  if (settings.highlightShadow) rows.push(["Highlight Shadow", settings.highlightShadow]);
  rows.push([
    "White Balance",
    `${settings.whiteBalance.mode}${settings.whiteBalance.kelvin ? ` · ${settings.whiteBalance.kelvin} K` : ""}`,
  ]);

  return (
    <section className="settings-card" aria-labelledby="camera-settings-title">
      <div className="settings-card-header"><div><p className="eyebrow">Your G9 recipe</p><h2 id="camera-settings-title">Camera settings</h2></div><span className="setting-model">Original DC-G9</span></div>
      <dl className="settings-list">
        {rows.map(([label, value]) => <div className="setting-row" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <div className="settings-note"><strong>Firmware</strong><span>Minimum {recipe.firmwareMinimum}</span></div>
      {settings.suggestedExposureCompensation !== undefined && <div className="settings-note"><strong>Exposure suggestion</strong><span>{signed(settings.suggestedExposureCompensation)} EV · optional shooting guidance, scene dependent</span></div>}
      <p className="settings-footnote">No direct camera transfer is available. Enter these values manually and save the style in one of Custom1–Custom4.</p>
    </section>
  );
}
