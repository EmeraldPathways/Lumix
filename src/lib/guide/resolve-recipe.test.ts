import { describe, expect, it, vi } from "vitest";
import { seedRecipes } from "../recipes/seed";
import { resolveSetupRecipe } from "./resolve-recipe";

describe("setup wizard recipe resolution", () => {
  it("uses the published recipe already loaded by the server", async () => {
    const lookupLocal = vi.fn();
    await expect(resolveSetupRecipe(seedRecipes[0].slug, seedRecipes[0], lookupLocal)).resolves.toBe(seedRecipes[0]);
    expect(lookupLocal).not.toHaveBeenCalled();
  });

  it("loads a saved personal recipe when no published match exists", async () => {
    const personal = { ...seedRecipes[0], slug: "my-personal-look", title: "My personal look", published: false };
    const lookupLocal = vi.fn().mockResolvedValue(personal);
    await expect(resolveSetupRecipe(personal.slug, undefined, lookupLocal)).resolves.toBe(personal);
    expect(lookupLocal).toHaveBeenCalledWith(personal.slug);
  });

  it("does not load local storage when there is no recipe in the URL", async () => {
    const lookupLocal = vi.fn();
    await expect(resolveSetupRecipe(undefined, undefined, lookupLocal)).resolves.toBeUndefined();
    expect(lookupLocal).not.toHaveBeenCalled();
  });
});
