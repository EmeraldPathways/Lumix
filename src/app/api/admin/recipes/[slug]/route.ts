import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin/access";
import { adminErrorResponse } from "@/lib/admin/http";
import { validateAdminRecipeUpdate } from "@/lib/admin/recipe-service";
import { deleteAdminRecipe, getAdminRecipeBySlug, listRecipeImages, updateAdminRecipe } from "@/lib/db/admin";

const UpdateRecipeBody = z.object({
  recipe: z.unknown(),
  changeNotes: z.string().trim().max(1000).optional().default("Edited recipe"),
  expectedUpdatedAt: z.string().datetime().optional(),
}).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const access = await authorizeAdminRequest();
  if ("response" in access) return access.response;
  try {
    const { slug } = await params;
    const body = UpdateRecipeBody.parse(await request.json());
    const previous = await getAdminRecipeBySlug(slug);
    if (!previous) return Response.json({ error: `Recipe “${slug}” was not found.` }, { status: 404 });
    const recipe = validateAdminRecipeUpdate(body.recipe, previous);
    const saved = await updateAdminRecipe(slug, recipe, access.actor, body.changeNotes, body.expectedUpdatedAt);
    revalidatePath("/");
    revalidatePath("/recipes");
    revalidatePath(`/recipes/${slug}`);
    revalidatePath(`/recipes/${saved.slug}`);
    revalidatePath("/admin");
    return Response.json({ recipe: saved });
  } catch (error) { return adminErrorResponse(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const access = await authorizeAdminRequest();
  if ("response" in access) return access.response;
  try {
    const { slug } = await params;
    const existing = await getAdminRecipeBySlug(slug);
    if (!existing) return Response.json({ error: `Recipe “${slug}” was not found.` }, { status: 404 });
    const images = await listRecipeImages(slug);
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (images.length && !token) return Response.json({ error: "Set Vercel Blob before deleting a recipe with attached photographs." }, { status: 503 });
    if (token) {
      for (const image of images) await del(image.image_url, { token });
    }
    await deleteAdminRecipe(slug, access.actor);
    revalidatePath("/");
    revalidatePath("/recipes");
    revalidatePath(`/recipes/${slug}`);
    revalidatePath("/admin");
    return Response.json({ deleted: true });
  } catch (error) { return adminErrorResponse(error); }
}
