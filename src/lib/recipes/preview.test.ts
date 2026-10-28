import { describe, expect, it } from "vitest";
import { seedRecipes } from "./seed";
import { getRecipeVisualTreatment } from "./preview";

describe("illustrative recipe treatment", () => {
  it("keeps colour and monochrome styles visually distinct", () => {
    const colour = seedRecipes.find((recipe) => recipe.slug === "gold-200-sunny-day");
    const monochrome = seedRecipes.find((recipe) => recipe.slug === "tri-x-punchy-mono");
    expect(colour).toBeDefined();
    expect(monochrome).toBeDefined();
    expect(getRecipeVisualTreatment(colour!).filter).toContain("saturate(");
    expect(getRecipeVisualTreatment(monochrome!).filter).toContain("grayscale(1)");
  });

  it("uses grain only on monochrome G9 recipes that declare Grain Effect", () => {
    const grainy = seedRecipes.find((recipe) => recipe.slug === "grainy-documentary-mono");
    const colour = seedRecipes.find((recipe) => recipe.slug === "gold-200-sunny-day");
    expect(getRecipeVisualTreatment(grainy!).grainOpacity).toBeGreaterThan(0);
    expect(getRecipeVisualTreatment(colour!).grainOpacity).toBe(0);
  });

  it("returns a stable neutral approximation for baseline camera settings", () => {
    const neutral = seedRecipes.find((recipe) => recipe.slug === "portra-400-balanced-portrait");
    expect(getRecipeVisualTreatment(neutral!).filter).toContain("contrast(");
    expect(getRecipeVisualTreatment(neutral!).filter).toContain("brightness(");
  });
});
