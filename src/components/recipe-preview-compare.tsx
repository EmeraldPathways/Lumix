"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { getRecipeVisualTreatment } from "@/lib/recipes/preview";
import type { G9Recipe } from "@/lib/recipes/schema";

export function RecipePreviewCompare({ recipe, compact = false }: { recipe: G9Recipe; compact?: boolean }) {
  const [amount, setAmount] = useState(56);
  const rangeId = useId();
  const treatment = getRecipeVisualTreatment(recipe);
  const style = { "--reveal": `${amount}%` } as React.CSSProperties;

  return (
    <div className={`preview-compare${compact ? " preview-compare-compact" : ""}`}>
      <div className="comparison-image" style={style}>
        <Image src={recipe.preview.src} alt={recipe.preview.alt} fill sizes="(max-width: 760px) 95vw, 75vw" priority className="comparison-before" />
        <div className="comparison-after" aria-hidden="true" style={{ clipPath: "inset(0 calc(100% - var(--reveal)) 0 0)" }}>
          <Image src={recipe.preview.src} alt="" fill sizes="(max-width: 760px) 95vw, 75vw" className="comparison-processed" style={{ filter: treatment.filter }} />
          {treatment.grainOpacity > 0 && <span className="grain-texture" style={{ opacity: treatment.grainOpacity }} />}
        </div>
        <span className="comparison-label before-label">Original scene</span>
        <span className="comparison-label after-label">Approximate browser preview</span>
        <span className="comparison-divider" aria-hidden="true" style={{ left: `${amount}%` }}><span /></span>
      </div>
      <label className="comparison-range" htmlFor={rangeId}>
        <span>Drag to compare</span>
        <input id={rangeId} aria-label="Move comparison divider" type="range" min="0" max="100" value={amount} onChange={(event) => setAmount(Number(event.currentTarget.value))} />
      </label>
      <p className="preview-disclaimer">Same user-provided reference photograph on both sides. This browser effect is an approximation, not the G9 JPEG processing pipeline.</p>
    </div>
  );
}
