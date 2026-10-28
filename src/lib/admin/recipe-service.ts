import { validateG9Recipe } from "../camera/g9";
import { G9RecipeSchema, type G9Recipe } from "../recipes/schema";

export type AdminActor = { userId: string; email: string };
export type AdminAuthorizer = () => Promise<AdminActor | null>;
export type AdminRecipePersister = (recipe: G9Recipe, actor: AdminActor) => Promise<G9Recipe>;

export class AdminAccessError extends Error {
  constructor() {
    super("An authenticated administrator is required to change published recipes.");
    this.name = "AdminAccessError";
  }
}

export class AdminRecipeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminRecipeValidationError";
  }
}

/** Validate the complete recipe and the original-G9 controls before any write. */
export function validateAdminRecipe(input: unknown): G9Recipe {
  const result = G9RecipeSchema.safeParse(input);
  if (!result.success) {
    throw new AdminRecipeValidationError(result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
  }
  const camera = validateG9Recipe(result.data.settings, result.data.firmwareMinimum);
  if (!camera.valid) {
    throw new AdminRecipeValidationError(camera.errors.map((issue) => issue.message).join("; "));
  }
  if (result.data.validationStatus !== "experimental" && !result.data.testEvidence) {
    throw new AdminRecipeValidationError("Camera-tested status requires documented physical-camera test evidence.");
  }
  return result.data;
}

export function validateAdminRecipeUpdate(input: unknown, previousInput: unknown): G9Recipe {
  const previous = G9RecipeSchema.parse(previousInput);
  const recipe = validateAdminRecipe(input);
  if (previous.validationStatus === "experimental" && recipe.validationStatus !== "experimental") {
    throw new AdminRecipeValidationError("Use the original-G9 camera test workflow to upgrade a recipe's validation status.");
  }
  if (previous.validationStatus !== "experimental" && recipe.validationStatus !== "experimental") {
    const testedFieldsChanged = JSON.stringify(recipe.settings) !== JSON.stringify(previous.settings)
      || JSON.stringify(recipe.testEvidence) !== JSON.stringify(previous.testEvidence)
      || recipe.preview.src !== previous.preview.src
      || recipe.preview.authenticity !== previous.preview.authenticity;
    if (recipe.validationStatus !== previous.validationStatus) {
      throw new AdminRecipeValidationError("Use the original-G9 camera test workflow to change a recipe's validation status.");
    }
    if (testedFieldsChanged) {
      throw new AdminRecipeValidationError("Recipe settings changed or test evidence changed. Downgrade to experimental or record a fresh original-G9 camera test.");
    }
  }
  return recipe;
}

export async function createRecipeForAdmin(input: unknown, authorize: AdminAuthorizer, persist: AdminRecipePersister): Promise<G9Recipe> {
  const actor = await authorize();
  if (!actor) throw new AdminAccessError();
  const validated = validateAdminRecipe(input);
  const recipe = { ...validated, id: validated.slug };
  if (recipe.validationStatus !== "experimental") {
    throw new AdminRecipeValidationError("New recipes start as experimental. Use the original-G9 camera test workflow to record evidence before changing validation status.");
  }
  return persist(recipe, actor);
}
