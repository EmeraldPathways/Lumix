// @vitest-environment jsdom

import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { seedRecipes } from "./recipes/seed";
import {
  assignCameraSlot,
  clearPersonalLibrary,
  exportPersonalCollection,
  getCameraSlots,
  getFavorites,
  getPersonalRecipe,
  getPersonalRecipes,
  importPersonalCollection,
  savePersonalRecipe,
  toggleFavorite,
} from "./local-library";

describe("local personal recipe library", () => {
  afterEach(async () => clearPersonalLibrary());

  it("saves personal recipe copies and reads them after a new query", async () => {
    const personal = { ...seedRecipes[0], id: "my-portra", slug: "my-portra", title: "My Portra", published: false };
    await savePersonalRecipe(personal);
    await expect(getPersonalRecipe("my-portra")).resolves.toMatchObject({ title: "My Portra", published: false });
    await expect(getPersonalRecipes()).resolves.toHaveLength(1);
  });

  it("adds and removes a favourite without an account", async () => {
    await expect(toggleFavorite(seedRecipes[0].slug)).resolves.toBe(true);
    await expect(getFavorites()).resolves.toEqual([seedRecipes[0].slug]);
    await expect(toggleFavorite(seedRecipes[0].slug)).resolves.toBe(false);
    await expect(getFavorites()).resolves.toEqual([]);
  });

  it("keeps exactly four virtual Custom Photo Style slots", async () => {
    await assignCameraSlot("Custom3", seedRecipes[2].slug);
    const slots = await getCameraSlots();
    expect(slots).toHaveLength(4);
    expect(slots.find((slot) => slot.slot === "Custom3")?.slug).toBe(seedRecipes[2].slug);
    expect(slots.filter((slot) => slot.slug === null)).toHaveLength(3);
  });

  it("exports and restores a validated local collection", async () => {
    const personal = { ...seedRecipes[0], id: "my-gold", slug: "my-gold", title: "My Gold", published: false };
    await savePersonalRecipe(personal);
    await toggleFavorite(seedRecipes[2].slug);
    await assignCameraSlot("Custom2", personal.slug);
    const exported = await exportPersonalCollection();
    await clearPersonalLibrary();
    await expect(importPersonalCollection(exported)).resolves.toMatchObject({ recipes: 1, favorites: 1 });
    await expect(getPersonalRecipes()).resolves.toHaveLength(1);
    await expect(getFavorites()).resolves.toEqual([seedRecipes[2].slug]);
    await expect(getCameraSlots()).resolves.toContainEqual({ slot: "Custom2", slug: "my-gold" });
  });

  it("rejects invalid recipe settings before writing imported collection data", async () => {
    const exported = JSON.parse(await exportPersonalCollection()) as { recipes: unknown[] };
    exported.recipes = [{ ...seedRecipes[0], slug: "invalid", settings: { ...seedRecipes[0].settings, photoStyle: "G9 II LUT" }, published: false }];
    await expect(importPersonalCollection(JSON.stringify(exported))).rejects.toThrow();
    await expect(getPersonalRecipes()).resolves.toEqual([]);
  });
});
