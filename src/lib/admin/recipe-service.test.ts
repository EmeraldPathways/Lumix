import { describe, expect, it, vi } from "vitest";
import { seedRecipes } from "../recipes/seed";
import { AdminAccessError, createRecipeForAdmin, validateAdminRecipe, validateAdminRecipeUpdate } from "./recipe-service";

describe("admin recipe service", () => {
  it("rejects writes before persistence when the request is not authorized", async () => {
    const persist = vi.fn();
    await expect(createRecipeForAdmin(seedRecipes[0], async () => null, persist)).rejects.toBeInstanceOf(AdminAccessError);
    expect(persist).not.toHaveBeenCalled();
  });

  it("validates camera settings before a recipe can be persisted", async () => {
    const persist = vi.fn();
    const invalid = { ...seedRecipes[0], settings: { ...seedRecipes[0].settings, contrast: 6 } };
    await expect(createRecipeForAdmin(invalid, async () => ({ userId: "admin-1", email: "admin@example.com" }), persist)).rejects.toThrow();
    expect(persist).not.toHaveBeenCalled();
  });

  it("does not allow camera-verified status without controlled test evidence", () => {
    const verifiedWithoutEvidence = { ...seedRecipes[0], validationStatus: "camera-verified" as const, preview: { ...seedRecipes[0].preview, authenticity: "g9-tested" as const } };
    expect(() => validateAdminRecipe(verifiedWithoutEvidence)).toThrow(/test evidence/i);
  });

  it("does not allow imported test evidence to create a verified recipe directly", async () => {
    const now = new Date().toISOString();
    const recipe = {
      ...seedRecipes[0],
      validationStatus: "camera-verified" as const,
      preview: { ...seedRecipes[0].preview, authenticity: "g9-tested" as const },
      testEvidence: {
        firmwareVersion: "2.7", testedAt: now, lens: "Lumix 25mm F1.7", testNotes: "The colours were checked on an original camera body.",
        controlJpegUrl: "https://images.example.test/control.jpg", resultJpegUrl: "https://images.example.test/result.jpg", sameScenePair: true as const, photographer: "A. Photographer",
      },
    };
    const persist = vi.fn();
    await expect(createRecipeForAdmin(recipe, async () => ({ userId: "admin-1", email: "admin@example.com" }), persist)).rejects.toThrow(/camera test workflow/i);
    expect(persist).not.toHaveBeenCalled();
  });

  it("persists only a validated recipe and records the authenticated administrator", async () => {
    const persist = vi.fn().mockResolvedValue(seedRecipes[0]);
    const actor = { userId: "admin-1", email: "admin@example.com" };
    await expect(createRecipeForAdmin(seedRecipes[0], async () => actor, persist)).resolves.toBe(seedRecipes[0]);
    expect(persist).toHaveBeenCalledWith(seedRecipes[0], actor);
  });

  it("keeps a verified recipe's evidence attached to the exact tested settings", () => {
    const now = new Date().toISOString();
    const tested = {
      ...seedRecipes[0],
      validationStatus: "camera-verified" as const,
      preview: { ...seedRecipes[0].preview, authenticity: "g9-tested" as const },
      testEvidence: { firmwareVersion: "2.7", testedAt: now, lens: "Lumix 25mm F1.7", testNotes: "The recipe was tested on an original DC-G9 with a same-scene comparison pair.", controlJpegUrl: "https://images.example.test/control.jpg", resultJpegUrl: "https://images.example.test/result.jpg", sameScenePair: true as const, photographer: "A. Photographer" },
    };
    expect(() => validateAdminRecipeUpdate({ ...tested, title: "Verified description edit" }, tested)).not.toThrow();
    expect(() => validateAdminRecipeUpdate({ ...tested, settings: { ...tested.settings, contrast: 2 } }, tested)).toThrow(/settings changed/i);
  });
});
