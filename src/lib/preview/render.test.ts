import { describe, expect, it } from "vitest";
import { seedRecipes } from "../recipes/seed";
import { transformG9PreviewPixels } from "./render";

const pixels = new Uint8ClampedArray([
  100, 120, 140, 255,
  15, 18, 22, 255,
  235, 229, 220, 255,
]);

describe("local JPEG preview renderer", () => {
  it("approximates exposure changes without mutating the source pixels", () => {
    const recipe = seedRecipes[0];
    const before = [...pixels];
    const brighter = transformG9PreviewPixels(pixels, 3, 1, recipe.settings, 1);
    expect(brighter[0]).toBeGreaterThan(pixels[0]);
    expect([...pixels]).toEqual(before);
  });

  it("converts monochrome styles and applies the selected filter effect approximately", () => {
    const recipe = seedRecipes.find((item) => item.slug === "red-filter-graphic-mono")!;
    const output = transformG9PreviewPixels(pixels, 3, 1, recipe.settings, 0);
    expect(output[0]).toBe(output[1]);
    expect(output[1]).toBe(output[2]);
  });

  it("lifts darker tones for the G9 Brighten dark areas Highlight Shadow preset", () => {
    const recipe = seedRecipes[0];
    const settings = { ...recipe.settings, highlightShadow: "Brighten dark areas" as const };
    const output = transformG9PreviewPixels(pixels, 3, 1, settings, 0);
    expect(output[4]).toBeGreaterThan(pixels[4]);
  });

  it("uses repeatable grain for monochrome Grain Effect levels", () => {
    const recipe = seedRecipes.find((item) => item.slug === "grainy-documentary-mono")!;
    const first = transformG9PreviewPixels(pixels, 3, 1, recipe.settings, 0, 4);
    const second = transformG9PreviewPixels(pixels, 3, 1, recipe.settings, 0, 4);
    const noGrain = transformG9PreviewPixels(pixels, 3, 1, { ...recipe.settings, grainEffect: "Off" }, 0, 4);
    expect([...first]).toEqual([...second]);
    expect([...first]).not.toEqual([...noGrain]);
  });

  it("rejects a pixel buffer that does not match its dimensions", () => {
    expect(() => transformG9PreviewPixels(new Uint8ClampedArray([1, 2, 3]), 1, 1, seedRecipes[0].settings, 0)).toThrow(/dimensions/i);
  });
});
