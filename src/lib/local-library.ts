import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { z } from "zod";
import { G9RecipeSchema, type G9Recipe } from "./recipes/schema";

const DATABASE = "g9-film-lab-local-v1";
const COLLECTION_FORMAT = "g9-film-lab-collection" as const;
const SLOT_NAMES = ["Custom1", "Custom2", "Custom3", "Custom4"] as const;
export type CameraStyleSlot = (typeof SLOT_NAMES)[number];

type FavoriteRow = { slug: string; savedAt: string };
type RecentRow = { slug: string; viewedAt: string };
export type CameraSlot = { slot: CameraStyleSlot; slug: string | null };

interface LibraryDatabase extends DBSchema {
  recipes: { key: string; value: G9Recipe };
  favorites: { key: string; value: FavoriteRow };
  recent: { key: string; value: RecentRow };
  slots: { key: CameraStyleSlot; value: CameraSlot };
}

let databasePromise: Promise<IDBPDatabase<LibraryDatabase>> | undefined;

function database() {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("This browser does not support local recipe storage."));
  if (!databasePromise) {
    databasePromise = openDB<LibraryDatabase>(DATABASE, 1, {
      upgrade(db) {
        db.createObjectStore("recipes", { keyPath: "slug" });
        db.createObjectStore("favorites", { keyPath: "slug" });
        db.createObjectStore("recent", { keyPath: "slug" });
        db.createObjectStore("slots", { keyPath: "slot" });
      },
    });
  }
  return databasePromise;
}

export async function savePersonalRecipe(input: G9Recipe): Promise<G9Recipe> {
  const recipe = G9RecipeSchema.parse({ ...input, published: false, featured: false });
  const db = await database();
  await db.put("recipes", recipe);
  return recipe;
}

export async function getPersonalRecipes(): Promise<G9Recipe[]> {
  const db = await database();
  return (await db.getAll("recipes")).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.title.localeCompare(right.title));
}

export async function getPersonalRecipe(slug: string): Promise<G9Recipe | undefined> {
  return (await database()).get("recipes", slug);
}

export async function deletePersonalRecipe(slug: string): Promise<void> {
  const db = await database();
  const transaction = db.transaction(["recipes", "slots"], "readwrite");
  await transaction.objectStore("recipes").delete(slug);
  const slots = await transaction.objectStore("slots").getAll();
  await Promise.all(slots.filter((slot) => slot.slug === slug).map((slot) => transaction.objectStore("slots").delete(slot.slot)));
  await transaction.done;
}

export async function toggleFavorite(slug: string): Promise<boolean> {
  const db = await database();
  const transaction = db.transaction("favorites", "readwrite");
  const store = transaction.objectStore("favorites");
  const existing = await store.get(slug);
  if (existing) await store.delete(slug);
  else await store.put({ slug, savedAt: new Date().toISOString() });
  await transaction.done;
  return !existing;
}

export async function getFavorites(): Promise<string[]> {
  const db = await database();
  return (await db.getAll("favorites")).map((favorite) => favorite.slug).sort((left, right) => left.localeCompare(right));
}

export async function recordRecentlyViewed(slug: string): Promise<void> {
  const db = await database();
  await db.put("recent", { slug, viewedAt: new Date().toISOString() });
}

export async function getRecentlyViewed(limit = 20): Promise<string[]> {
  const db = await database();
  return (await db.getAll("recent")).sort((left, right) => right.viewedAt.localeCompare(left.viewedAt)).slice(0, Math.max(0, limit)).map((item) => item.slug);
}

export async function getCameraSlots(): Promise<CameraSlot[]> {
  const db = await database();
  const assigned = new Map((await db.getAll("slots")).map((slot) => [slot.slot, slot.slug]));
  return SLOT_NAMES.map((slot) => ({ slot, slug: assigned.get(slot) ?? null }));
}

export async function assignCameraSlot(slot: CameraStyleSlot, slug: string | null): Promise<void> {
  if (!SLOT_NAMES.includes(slot)) throw new Error("Choose one of the four DC-G9 Photo Style Custom slots.");
  const db = await database();
  if (slug === null) await db.delete("slots", slot);
  else await db.put("slots", { slot, slug });
}

const CameraSlotSchema = z.object({ slot: z.enum(SLOT_NAMES), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).nullable() }).strict();

export const PersonalCollectionSchema = z.object({
  format: z.literal(COLLECTION_FORMAT),
  version: z.literal(1),
  cameraModel: z.literal("DC-G9"),
  exportedAt: z.string().datetime(),
  recipes: z.array(G9RecipeSchema).max(250),
  favorites: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).max(1000),
  slots: z.array(CameraSlotSchema).length(4),
}).strict().superRefine((collection, context) => {
  const recipeSlugs = collection.recipes.map((recipe) => recipe.slug);
  if (new Set(recipeSlugs).size !== recipeSlugs.length) {
    context.addIssue({ code: "custom", path: ["recipes"], message: "Collection contains duplicate recipe slugs." });
  }
  if (new Set(collection.slots.map((slot) => slot.slot)).size !== SLOT_NAMES.length) {
    context.addIssue({ code: "custom", path: ["slots"], message: "Collection must define Custom1 through Custom4 once each." });
  }
});

export function parsePersonalCollection(input: string | unknown) {
  let value: unknown = input;
  if (typeof input === "string") {
    try { value = JSON.parse(input) as unknown; }
    catch { throw new Error("This file is not valid JSON."); }
  }
  return PersonalCollectionSchema.parse(value);
}

export async function exportPersonalCollection(): Promise<string> {
  const [recipes, favorites, slots] = await Promise.all([getPersonalRecipes(), getFavorites(), getCameraSlots()]);
  return JSON.stringify({ format: COLLECTION_FORMAT, version: 1, cameraModel: "DC-G9", exportedAt: new Date().toISOString(), recipes, favorites, slots }, null, 2);
}

export async function importPersonalCollection(input: string | unknown): Promise<{ recipes: number; favorites: number }> {
  const collection = parsePersonalCollection(input);
  const db = await database();
  const transaction = db.transaction(["recipes", "favorites", "slots"], "readwrite");
  const recipeStore = transaction.objectStore("recipes");
  const favoriteStore = transaction.objectStore("favorites");
  const slotStore = transaction.objectStore("slots");

  for (const recipe of collection.recipes) await recipeStore.put({ ...recipe, published: false, featured: false });
  for (const slug of collection.favorites) await favoriteStore.put({ slug, savedAt: new Date().toISOString() });
  for (const slot of collection.slots) {
    if (slot.slug === null) await slotStore.delete(slot.slot);
    else await slotStore.put(slot);
  }
  await transaction.done;
  return { recipes: collection.recipes.length, favorites: collection.favorites.length };
}

/** Used by explicit local reset and the browser test suite. */
export async function clearPersonalLibrary(): Promise<void> {
  const db = await database();
  const transaction = db.transaction(["recipes", "favorites", "recent", "slots"], "readwrite");
  await Promise.all(["recipes", "favorites", "recent", "slots"].map((store) => transaction.objectStore(store as "recipes" | "favorites" | "recent" | "slots").clear()));
  await transaction.done;
}
