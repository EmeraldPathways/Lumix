import { describe, expect, it } from "vitest";
import { validateG9Recipe } from "../camera/g9";
import { G9RecipeSchema } from "./schema";
import { filterRecipes, parseRecipeFilters } from "./filter";
import { seedRecipes } from "./seed";
import type { G9Recipe } from "./schema";

const recipe = (overrides: Partial<G9Recipe> = {}): G9Recipe => ({
  id: "recipe-1",
  slug: "warm-portrait",
  title: "Warm Portrait",
  description: "Soft amber light for portraits and travel.",
  filmCharacter: "A gentle, warm colour direction for portraits in open shade; it is an aesthetic starting point rather than an exact film-stock reproduction.",
  category: "colour-negative",
  colorMode: "colour",
  temperature: "warm",
  contrastCharacter: "soft",
  saturationCharacter: "natural",
  grainCharacter: "Off",
  suitability: ["portrait", "travel"],
  validationStatus: "experimental",
  preview: {
    src: "/g9-sample-scene.svg",
    alt: "Original vector illustration of a coastal street; not a DC-G9 photograph",
    authenticity: "illustrative",
    photographer: "Original G9 Film Lab illustration",
    licence: "Original project artwork",
  },
  settings: {
    cameraModel: "DC-G9",
    photoStyle: "Natural",
    contrast: -1,
    sharpness: 0,
    noiseReduction: -2,
    saturation: 0,
    whiteBalance: { mode: "Color Temperature", kelvin: 5600 },
  },
  shootingNotes: "Use in open shade, then check the highlights and colour on the camera JPEG.",
  firmwareMinimum: "1.0",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  published: true,
  sortOrder: 1,
  featured: false,
  tags: ["portrait", "warm"],
  ...overrides,
});

describe("G9 recipe schema", () => {
  it("accepts an experimental recipe with valid original-G9 settings", () => {
    const parsed = G9RecipeSchema.safeParse(recipe());
    expect(parsed.success).toBe(true);
  });

  it("rejects a camera-verified label without physical test evidence", () => {
    const result = G9RecipeSchema.safeParse(recipe({ validationStatus: "camera-verified" }));
    expect(result.success).toBe(false);
  });

  it("rejects colour descriptors paired with a monochrome Photo Style", () => {
    const result = G9RecipeSchema.safeParse(recipe({
      settings: {
        cameraModel: "DC-G9",
        photoStyle: "Monochrome",
        contrast: 0,
        sharpness: 0,
        noiseReduction: 0,
        colorTone: 0,
        whiteBalance: { mode: "AWB" },
      },
    }));
    expect(result.success).toBe(false);
  });
});

describe("recipe discovery filters", () => {
  it("matches case-insensitive text across title, description, and tags", () => {
    const match = recipe();
    const result = filterRecipes([match], { query: "AMBER" });
    expect(result.map((item) => item.slug)).toEqual(["warm-portrait"]);
  });

  it("combines category, colour mode, use case, temperature, contrast, and grain filters", () => {
    const match = recipe({
      id: "warm-street",
      slug: "warm-street",
      title: "Warm Street",
      category: "cinematic",
      suitability: ["street"],
      contrastCharacter: "high",
      grainCharacter: "Low",
    });
    const miss = recipe({
      id: "cool-street",
      slug: "cool-street",
      title: "Cool Street",
      temperature: "cool",
      category: "cinematic",
      suitability: ["street"],
      contrastCharacter: "high",
      grainCharacter: "Low",
    });
    expect(filterRecipes([match, miss], {
      category: "cinematic",
      colorMode: "colour",
      useCase: "street",
      temperature: "warm",
      contrast: "high",
      grain: "Low",
    }).map((item) => item.slug)).toEqual(["warm-street"]);
  });

  it("sorts newest, alphabetical, and featured deterministically", () => {
    const zeta = recipe({ id: "z", slug: "zeta", title: "Zeta", createdAt: "2025-01-01T00:00:00.000Z" });
    const alpha = recipe({ id: "a", slug: "alpha", title: "Alpha", createdAt: "2024-01-01T00:00:00.000Z", featured: true });
    const newest = recipe({ id: "n", slug: "newest", title: "Newest", createdAt: "2026-01-01T00:00:00.000Z" });
    expect(filterRecipes([zeta, alpha, newest], { sort: "newest" }).map((item) => item.slug)).toEqual(["newest", "zeta", "alpha"]);
    expect(filterRecipes([zeta, alpha, newest], { sort: "alphabetical" }).map((item) => item.slug)).toEqual(["alpha", "newest", "zeta"]);
    expect(filterRecipes([zeta, alpha, newest], { sort: "featured" }).map((item) => item.slug)).toEqual(["alpha", "newest", "zeta"]);
  });

  it("parses valid URL filters and ignores unsupported values", () => {
    const filters = parseRecipeFilters(new URLSearchParams("q=%20street%20&category=cinematic&color=colour&use=street&temperature=cool&contrast=high&grain=Off&sort=featured&firmware=bad"));
    expect(filters).toEqual({
      query: "street",
      category: "cinematic",
      colorMode: "colour",
      useCase: "street",
      temperature: "cool",
      contrast: "high",
      grain: "Off",
      sort: "featured",
    });
  });

  it("returns an empty list when no recipes match", () => {
    expect(filterRecipes([recipe()], { category: "monochrome" })).toEqual([]);
  });
});

describe("starter recipe collection", () => {
  it("contains at least 24 published, experimental original-G9 recipes", () => {
    expect(seedRecipes.length).toBeGreaterThanOrEqual(24);
    expect(seedRecipes.length).toBeLessThanOrEqual(30);
    expect(seedRecipes.every((item) => item.published && item.validationStatus === "experimental")).toBe(true);
    expect(seedRecipes.some((item) => item.validationStatus === "camera-verified")).toBe(false);
  });

  it("validates every starter recipe against its stated minimum firmware", () => {
    const invalidRecipes = seedRecipes.flatMap((item) => {
      const result = validateG9Recipe(item.settings, item.firmwareMinimum);
      return result.valid ? [] : [{ slug: item.slug, errors: result.errors }];
    });
    expect(invalidRecipes).toEqual([]);
  });
});
