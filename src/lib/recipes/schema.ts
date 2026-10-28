import { z } from "zod";
import { G9RecipeSettingsSchema, validateG9Recipe } from "../camera/g9";

export const RECIPE_CATEGORIES = [
  "colour-negative",
  "classic-colour",
  "cinematic",
  "monochrome",
] as const;

export const RECIPE_USE_CASES = ["portrait", "street", "landscape", "travel", "night"] as const;

export const G9RecipeSchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(2).max(80),
    description: z.string().min(20).max(320),
    filmCharacter: z.string().min(30).max(800),
    category: z.enum(RECIPE_CATEGORIES),
    colorMode: z.enum(["colour", "monochrome"]),
    temperature: z.enum(["warm", "cool", "neutral"]),
    contrastCharacter: z.enum(["soft", "medium", "high"]),
    saturationCharacter: z.enum(["muted", "natural", "vivid", "not-applicable"]),
    grainCharacter: z.enum(["Off", "Low", "Standard", "High"]),
    suitability: z.array(z.enum(RECIPE_USE_CASES)).min(1),
    validationStatus: z.enum(["experimental", "community-tested", "camera-verified"]),
    preview: z.object({
      src: z.string().min(1),
      alt: z.string().min(10).max(240),
      authenticity: z.enum(["illustrative", "g9-tested"]),
      photographer: z.string().min(2),
      licence: z.string().min(2),
    }).strict(),
    settings: G9RecipeSettingsSchema,
    firmwareMinimum: z.string().regex(/^\d+\.\d+(?:\.\d+)?$/),
    shootingNotes: z.string().min(10).max(500),
    tags: z.array(z.string().min(1).max(32)).max(12),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    published: z.boolean(),
    featured: z.boolean(),
    sortOrder: z.number().int().nonnegative(),
    testEvidence: z.object({
      firmwareVersion: z.string().regex(/^\d+\.\d+(?:\.\d+)?$/),
      testedAt: z.string().datetime(),
      lens: z.string().min(2),
      testNotes: z.string().min(20),
      controlJpegUrl: z.string().url(),
      resultJpegUrl: z.string().url(),
      sameScenePair: z.literal(true),
      photographer: z.string().min(2),
    }).strict().optional(),
  })
  .strict()
  .superRefine((recipe, context) => {
    const monochromeStyles = ["Monochrome", "L.Monochrome", "L.Monochrome D"];
    const isMonochrome = monochromeStyles.includes(recipe.settings.photoStyle);

    if ((recipe.colorMode === "monochrome") !== isMonochrome) {
      context.addIssue({
        code: "custom",
        path: ["colorMode"],
        message: "Colour mode must match the recipe's original-G9 Photo Style.",
      });
    }

    const expectedGrain = recipe.settings.grainEffect ?? "Off";
    if (recipe.grainCharacter !== expectedGrain) {
      context.addIssue({
        code: "custom",
        path: ["grainCharacter"],
        message: "Grain description must match the camera's Grain Effect setting.",
      });
    }

    const cameraValidation = validateG9Recipe(recipe.settings, recipe.firmwareMinimum);
    for (const issue of cameraValidation.errors) {
      context.addIssue({
        code: "custom",
        path: ["settings", ...issue.path.split(".").filter(Boolean)],
        message: issue.message,
      });
    }

    if (recipe.validationStatus !== "experimental" && !recipe.testEvidence) {
      context.addIssue({
        code: "custom",
        path: ["testEvidence"],
        message: "Community-tested and camera-verified recipes require documented test evidence.",
      });
    }

    if (recipe.preview.authenticity === "g9-tested" && !recipe.testEvidence) {
      context.addIssue({
        code: "custom",
        path: ["preview", "authenticity"],
        message: "A G9-tested preview requires evidence from a controlled DC-G9 comparison.",
      });
    }

    if (recipe.validationStatus === "camera-verified" && recipe.preview.authenticity !== "g9-tested") {
      context.addIssue({
        code: "custom",
        path: ["preview", "authenticity"],
        message: "Camera-verified recipes must use a documented G9-tested preview.",
      });
    }

    if (recipe.category === "monochrome" && recipe.colorMode !== "monochrome") {
      context.addIssue({
        code: "custom",
        path: ["category"],
        message: "The monochrome category only contains monochrome recipes.",
      });
    }
  });

export type G9Recipe = z.infer<typeof G9RecipeSchema>;
export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];
export type RecipeUseCase = (typeof RECIPE_USE_CASES)[number];
export type RecipeTemperature = G9Recipe["temperature"];
export type RecipeContrast = G9Recipe["contrastCharacter"];
export type RecipeColorMode = G9Recipe["colorMode"];
export type RecipeGrain = G9Recipe["grainCharacter"];

export function parseG9Recipe(input: unknown): G9Recipe {
  return G9RecipeSchema.parse(input);
}
