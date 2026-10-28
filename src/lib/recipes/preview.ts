import type { G9Recipe } from "./schema";

const monochromeStyles = ["Monochrome", "L.Monochrome", "L.Monochrome D"];

function estimatedWhiteBalanceKelvin(recipe: G9Recipe): number {
  const whiteBalance = recipe.settings.whiteBalance;
  if (whiteBalance.mode === "Color Temperature") return whiteBalance.kelvin ?? 5600;
  const estimates: Record<string, number> = {
    AWB: 5600,
    AWBc: 5200,
    AWBw: 6000,
    Daylight: 5500,
    Cloudy: 6500,
    Shade: 7500,
    Incandescent: 3000,
    Flash: 5600,
  };
  return estimates[whiteBalance.mode] ?? 5600;
}

/** CSS approximation for screen preview only; it does not model Panasonic JPEG processing. */
export function getRecipeVisualTreatment(recipe: G9Recipe): { filter: string; grainOpacity: number } {
  const settings = recipe.settings;
  const monochrome = monochromeStyles.includes(settings.photoStyle);
  const saturation = monochrome ? 0 : 100 + (settings.saturation ?? 0) * 9;
  const presetContrast = settings.highlightShadow === "Raise the contrast" ? 9 : settings.highlightShadow === "Lower the contrast" ? -9 : 0;
  const contrast = 100 + settings.contrast * 5 + presetContrast;
  const exposure = 100 + (settings.suggestedExposureCompensation ?? 0) * 7;
  const kelvin = estimatedWhiteBalanceKelvin(recipe);
  const warmth = Math.max(-7, Math.min(7, (kelvin - 5600) / 500));
  const colorTone = settings.colorTone ?? 0;
  const sepia = Math.max(0, Math.min(24, Math.round(Math.abs(colorTone) * 2.5 + Math.max(0, warmth) * 1.2)));
  const hue = Math.round(-warmth * 1.3 + (settings.filterEffect === "Green" ? 5 : 0));
  const filter = [
    monochrome ? "grayscale(1)" : "",
    `contrast(${contrast}%)`,
    `saturate(${saturation}%)`,
    `sepia(${sepia}%)`,
    `hue-rotate(${hue}deg)`,
    `brightness(${exposure}%)`,
  ].filter(Boolean).join(" ");
  const grainStrength = settings.grainEffect ?? "Off";
  const grainOpacity = monochrome
    ? ({ Off: 0, Low: 0.08, Standard: 0.14, High: 0.2 } as const)[grainStrength]
    : 0;

  return { filter, grainOpacity };
}
