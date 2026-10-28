import Image from "next/image";
import { getRecipeVisualTreatment } from "@/lib/recipes/preview";
import type { G9Recipe } from "@/lib/recipes/schema";

type Props = { recipe: G9Recipe; priority?: boolean; className?: string; fit?: "cover" | "contain"; splitEffect?: boolean };

export function RecipeArtwork({ recipe, priority = false, className = "", fit = "cover", splitEffect = false }: Props) {
  const treatment = getRecipeVisualTreatment(recipe);
  return (
    <div className={`recipe-artwork${splitEffect ? " recipe-artwork-split" : ""} ${className}`}>
      <Image src={recipe.preview.src} alt={recipe.preview.alt} fill priority={priority} sizes="(max-width: 760px) 95vw, (max-width: 1200px) 45vw, 33vw" className={`artwork-image ${fit === "contain" ? "object-contain" : "object-cover"}`} style={{ filter: splitEffect ? "none" : treatment.filter }} />
      {splitEffect ? <>
        <div className="artwork-effect" aria-hidden="true">
          <Image src={recipe.preview.src} alt="" fill priority={priority} sizes="(max-width: 760px) 95vw, (max-width: 1200px) 45vw, 33vw" className={`artwork-effect-image ${fit === "contain" ? "object-contain" : "object-cover"}`} style={{ filter: treatment.filter }} />
          {treatment.grainOpacity > 0 && <span className="grain-texture" style={{ opacity: treatment.grainOpacity }} />}
        </div>
        <span className="artwork-side-label artwork-original-label" aria-hidden="true">Original</span>
        <span className="artwork-side-label artwork-effect-label" aria-hidden="true">Effect</span>
        <span className="artwork-split-divider" aria-hidden="true" />
      </> : treatment.grainOpacity > 0 && <span aria-hidden="true" className="grain-texture" style={{ opacity: treatment.grainOpacity }} />}
      <span className="artwork-credit">{recipe.preview.authenticity === "g9-tested" ? "G9-tested photograph" : "Illustrative preview"}</span>
    </div>
  );
}
