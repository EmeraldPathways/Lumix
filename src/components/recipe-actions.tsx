"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Copy, Download, Printer, Share2, SlidersHorizontal } from "lucide-react";
import type { G9Recipe } from "@/lib/recipes/schema";
import { FavoriteButton } from "./favorite-button";
import { recordRecentlyViewed } from "@/lib/local-library";

export function RecipeActions({ recipe }: { recipe: G9Recipe }) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    void recordRecentlyViewed(recipe.slug).then(() => window.dispatchEvent(new Event("g9-film-lab:recent-change"))).catch(() => undefined);
  }, [recipe.slug]);

  async function copySettings() {
    const settings = recipe.settings;
    const content = [
      recipe.title,
      `Photo Style: ${settings.photoStyle}`,
      `Contrast: ${settings.contrast > 0 ? "+" : ""}${settings.contrast}`,
      `Sharpness: ${settings.sharpness > 0 ? "+" : ""}${settings.sharpness}`,
      `Noise Reduction: ${settings.noiseReduction > 0 ? "+" : ""}${settings.noiseReduction}`,
      ...(settings.saturation === undefined ? [] : [`Saturation: ${settings.saturation > 0 ? "+" : ""}${settings.saturation}`]),
      ...(settings.colorTone === undefined ? [] : [`Color Tone: ${settings.colorTone > 0 ? "+" : ""}${settings.colorTone}`]),
      ...(settings.filterEffect ? [`Filter Effect: ${settings.filterEffect}`] : []),
      ...(settings.grainEffect ? [`Grain Effect: ${settings.grainEffect}`] : []),
      ...(settings.highlightShadow ? [`Highlight Shadow: ${settings.highlightShadow}`] : []),
      `White Balance: ${settings.whiteBalance.mode}${settings.whiteBalance.kelvin ? `, ${settings.whiteBalance.kelvin} K` : ""}`,
      ...(settings.suggestedExposureCompensation === undefined ? [] : [`Suggested exposure compensation: ${settings.suggestedExposureCompensation > 0 ? "+" : ""}${settings.suggestedExposureCompensation} EV`]),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(content);
      setMessage("Camera settings copied.");
    } catch {
      setMessage("Could not access the clipboard. Select and copy the settings card instead.");
    }
  }

  async function shareRecipe() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: recipe.title, url });
      else await navigator.clipboard.writeText(url);
      setMessage("Recipe link ready to share.");
    } catch {
      setMessage("Sharing was cancelled.");
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(recipe, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${recipe.slug}.json`;
    anchor.click();
    URL.revokeObjectURL(href);
    setMessage("Recipe JSON downloaded.");
  }

  return (
    <div className="recipe-actions-wrap">
      <div className="recipe-actions">
        <FavoriteButton slug={recipe.slug} />
        <button type="button" className="outline-button" onClick={copySettings}><Copy size={16} /> Copy settings</button>
        <Link className="outline-button" href={`/studio?recipe=${recipe.slug}`}><SlidersHorizontal size={16} /> Open in Studio</Link>
        <button type="button" className="outline-button" onClick={shareRecipe}><Share2 size={16} /> Share</button>
        <button type="button" className="outline-button" onClick={() => window.print()}><Printer size={16} /> Print</button>
        <button type="button" className="outline-button" onClick={exportJson}><Download size={16} /> Export JSON</button>
      </div>
      <p className="sr-only" aria-live="polite">{message}</p>
    </div>
  );
}
