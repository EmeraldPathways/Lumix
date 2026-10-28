import { del } from "@vercel/blob";
import { authorizeAdminRequest } from "@/lib/admin/access";
import { adminErrorResponse } from "@/lib/admin/http";
import { deleteRecipeImage, getRecipeImageById } from "@/lib/db/admin";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeAdminRequest();
  if ("response" in access) return access.response;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return Response.json({ error: "Vercel Blob is not configured for editorial photographs." }, { status: 503 });
  try {
    const { id } = await params;
    if (!/^\d+$/.test(id)) return Response.json({ error: "Provide a valid image id." }, { status: 400 });
    const image = await getRecipeImageById(Number(id));
    if (!image) return Response.json({ error: "Image not found." }, { status: 404 });
    await del(image.image_url, { token });
    await deleteRecipeImage(Number(id));
    return Response.json({ deleted: true });
  } catch (error) { return adminErrorResponse(error); }
}
