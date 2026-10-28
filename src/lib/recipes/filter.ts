import type {
  G9Recipe,
  RecipeCategory,
  RecipeColorMode,
  RecipeContrast,
  RecipeGrain,
  RecipeTemperature,
  RecipeUseCase,
} from "./schema";

export type RecipeSort = "featured" | "newest" | "alphabetical";

export type RecipeFilters = {
  query?: string;
  category?: RecipeCategory;
  colorMode?: RecipeColorMode;
  useCase?: RecipeUseCase;
  temperature?: RecipeTemperature;
  contrast?: RecipeContrast;
  grain?: RecipeGrain;
  sort?: RecipeSort;
};

type SearchParamInput = URLSearchParams | Record<string, string | string[] | undefined>;

const categories = ["colour-negative", "classic-colour", "cinematic", "monochrome"] as const;
const colorModes = ["colour", "monochrome"] as const;
const useCases = ["portrait", "street", "landscape", "travel", "night"] as const;
const temperatures = ["warm", "cool", "neutral"] as const;
const contrasts = ["soft", "medium", "high"] as const;
const grains = ["Off", "Low", "Standard", "High"] as const;
const sorts = ["featured", "newest", "alphabetical"] as const;

function readParam(params: SearchParamInput, key: string): string | undefined {
  const value = params instanceof URLSearchParams ? params.get(key) ?? undefined : params[key];
  return Array.isArray(value) ? value[0] : value;
}

function memberOf<const T extends readonly string[]>(value: string | undefined, values: T): value is T[number] {
  return value !== undefined && (values as readonly string[]).includes(value);
}

export function parseRecipeFilters(params: SearchParamInput): RecipeFilters {
  const query = readParam(params, "q")?.trim();
  const category = readParam(params, "category");
  const colorMode = readParam(params, "color");
  const useCase = readParam(params, "use");
  const temperature = readParam(params, "temperature");
  const contrast = readParam(params, "contrast");
  const grain = readParam(params, "grain");
  const sort = readParam(params, "sort");

  return {
    ...(query ? { query } : {}),
    ...(memberOf(category, categories) ? { category } : {}),
    ...(memberOf(colorMode, colorModes) ? { colorMode } : {}),
    ...(memberOf(useCase, useCases) ? { useCase } : {}),
    ...(memberOf(temperature, temperatures) ? { temperature } : {}),
    ...(memberOf(contrast, contrasts) ? { contrast } : {}),
    ...(memberOf(grain, grains) ? { grain } : {}),
    sort: memberOf(sort, sorts) ? sort : "featured",
  };
}

export function filterRecipes(recipes: readonly G9Recipe[], filters: RecipeFilters = {}): G9Recipe[] {
  const query = filters.query?.trim().toLocaleLowerCase("en-IE");
  const result = recipes.filter((recipe) => {
    if (query) {
      const searchable = [recipe.title, recipe.description, ...recipe.tags].join(" ").toLocaleLowerCase("en-IE");
      if (!searchable.includes(query)) return false;
    }
    if (filters.category && recipe.category !== filters.category) return false;
    if (filters.colorMode && recipe.colorMode !== filters.colorMode) return false;
    if (filters.useCase && !recipe.suitability.includes(filters.useCase)) return false;
    if (filters.temperature && recipe.temperature !== filters.temperature) return false;
    if (filters.contrast && recipe.contrastCharacter !== filters.contrast) return false;
    if (filters.grain && recipe.grainCharacter !== filters.grain) return false;
    return true;
  });

  const sort = filters.sort ?? "featured";
  return result.sort((left, right) => {
    if (sort === "alphabetical") return left.title.localeCompare(right.title, "en-IE") || left.slug.localeCompare(right.slug);
    if (sort === "newest") return right.createdAt.localeCompare(left.createdAt) || left.slug.localeCompare(right.slug);
    return Number(right.featured) - Number(left.featured)
      || right.createdAt.localeCompare(left.createdAt)
      || left.sortOrder - right.sortOrder
      || left.slug.localeCompare(right.slug);
  });
}
