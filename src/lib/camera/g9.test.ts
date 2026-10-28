import { describe, expect, it } from "vitest";
import { getPhotoStyleControls, validateG9Recipe } from "./g9";

const colourRecipe = {
  cameraModel: "DC-G9",
  photoStyle: "Natural",
  contrast: 0,
  sharpness: 0,
  noiseReduction: 0,
  saturation: 0,
  whiteBalance: { mode: "AWB" },
};

describe("original Lumix DC-G9 capabilities", () => {
  it("accepts a supported colour recipe on the original firmware", () => {
    expect(validateG9Recipe(colourRecipe, "1.0")).toMatchObject({ valid: true, errors: [] });
  });

  it("offers the documented colour controls without monochrome-only controls", () => {
    const ids = getPhotoStyleControls("Standard", "1.0").map((control) => control.id);
    expect(ids).toEqual(expect.arrayContaining(["contrast", "sharpness", "noiseReduction", "saturation"]));
    expect(ids).not.toEqual(expect.arrayContaining(["colorTone", "filterEffect", "grainEffect"]));
  });

  it("supports L.Monochrome D and Grain Effect from firmware 1.1", () => {
    const monochromeRecipe = {
      cameraModel: "DC-G9",
      photoStyle: "L.Monochrome D",
      contrast: 1,
      sharpness: 0,
      noiseReduction: -1,
      grainEffect: "Low",
      whiteBalance: { mode: "Daylight" },
    };
    expect(validateG9Recipe(monochromeRecipe, "1.1")).toMatchObject({ valid: true, errors: [] });
    expect(getPhotoStyleControls("L.Monochrome D", "1.1").map((control) => control.id)).toContain("grainEffect");
  });

  it("rejects L.Monochrome D and Grain Effect before firmware 1.1", () => {
    const recipe = {
      cameraModel: "DC-G9",
      photoStyle: "L.Monochrome D",
      contrast: 0,
      sharpness: 0,
      noiseReduction: 0,
      grainEffect: "Standard",
      whiteBalance: { mode: "AWB" },
    };
    expect(validateG9Recipe(recipe, "1.0").valid).toBe(false);
    expect(getPhotoStyleControls("L.Monochrome D", "1.0")).toEqual([]);
  });

  it("restricts colour tone and filter effect to the compatible monochrome styles", () => {
    const recipe = {
      cameraModel: "DC-G9",
      photoStyle: "Monochrome",
      contrast: 0,
      sharpness: 0,
      noiseReduction: 0,
      colorTone: 1,
      filterEffect: "Yellow",
      whiteBalance: { mode: "AWB" },
    };
    expect(validateG9Recipe(recipe, "1.0").valid).toBe(true);
    expect(validateG9Recipe({ ...colourRecipe, colorTone: 1 }, "1.0").valid).toBe(false);
    expect(validateG9Recipe({ ...colourRecipe, grainEffect: "High" }, "1.1").valid).toBe(false);
  });

  it("enforces the ±5 integer picture-style adjustment range", () => {
    expect(validateG9Recipe({ ...colourRecipe, contrast: 6 }, "2.0").valid).toBe(false);
    expect(validateG9Recipe({ ...colourRecipe, sharpness: 0.5 }, "2.0").valid).toBe(false);
  });

  it("accepts only the original G9 Highlight Shadow presets", () => {
    expect(validateG9Recipe({ ...colourRecipe, highlightShadow: "Brighten dark areas" }, "2.0").valid).toBe(true);
    expect(validateG9Recipe({ ...colourRecipe, highlightShadow: "Lift blacks" }, "2.0").valid).toBe(false);
  });

  it("requires firmware 2.0 for AWBw white balance", () => {
    expect(validateG9Recipe({ ...colourRecipe, whiteBalance: { mode: "AWBw" } }, "1.1").valid).toBe(false);
    expect(validateG9Recipe({ ...colourRecipe, whiteBalance: { mode: "AWBw" } }, "2.0").valid).toBe(true);
  });

  it("validates G9 colour-temperature settings in 100 K steps from 2500 K to 10000 K", () => {
    expect(validateG9Recipe({ ...colourRecipe, whiteBalance: { mode: "Color Temperature", kelvin: 5600 } }, "2.0").valid).toBe(true);
    expect(validateG9Recipe({ ...colourRecipe, whiteBalance: { mode: "Color Temperature", kelvin: 5650 } }, "2.0").valid).toBe(false);
    expect(validateG9Recipe({ ...colourRecipe, whiteBalance: { mode: "Color Temperature", kelvin: 2400 } }, "2.0").valid).toBe(false);
  });

  it("rejects G9 II and Custom Photo Style slots as recipe base styles", () => {
    expect(validateG9Recipe({ ...colourRecipe, cameraModel: "DC-G9M2" }, "2.0").valid).toBe(false);
    expect(validateG9Recipe({ ...colourRecipe, photoStyle: "Custom 1" }, "2.0").valid).toBe(false);
  });
});
