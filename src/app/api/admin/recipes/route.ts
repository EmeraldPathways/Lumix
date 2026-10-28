import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin/access";
import { adminErrorResponse } from "@/lib/admin/http";
import { createRecipeForAdmin } from "@/lib/admin/recipe-service";
import { createAdminRecipe, listAdminRecipes } from "@/lib/db/admin";

const CreateRecipeBody = z.object({ recipe: z.unknown(), changeNotes: z.string().trim().max(1000).optional() }).strict();

export async function GET() {
  const access = await authorizeAdminRequest();
  if ("response" in access) return access.response;
  try { return Response.json({ recipes: await listAdminRecipes() }); }
  catch (error) { return adminErrorResponse(error); }
}

export async function POST(request: Request) {
  const access = await authorizeAdminRequest();
  if ("response" in access) return access.response;
  try {
    const body = CreateRecipeBody.parse(await request.json());
    const recipe = await createRecipeForAdmin(body.recipe, async () => access.actor, createAdminRecipe);
    revalidatePath("/");
    revalidatePath("/recipes");
    revalidatePath("/admin");
    return Response.json({ recipe }, { status: 201 });
  } catch (error) { return adminErrorResponse(error); }
}
