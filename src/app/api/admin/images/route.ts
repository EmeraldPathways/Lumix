import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { authorizeAdminRequest } from "@/lib/admin/access";
import { adminErrorResponse } from "@/lib/admin/http";
import { APPROVED_IMAGE_TYPES, detectApprovedImageType, MAX_EDITORIAL_IMAGE_BYTES, RecipeImageMetadataSchema } from "@/lib/admin/image-policy";
import { listRecipeImages, saveRecipeImage } from "@/lib/db/admin";

export async function GET(request: Request) {
  const access = await authorizeAdminRequest();
  if ("response" in access) return access.response;
  const recipeSlug = new URL(request.url).searchParams.get("recipeSlug");
  if (!recipeSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(recipeSlug)) return Response.json({ error: "Provide a valid recipeSlug." }, { status: 400 });
  try { return Response.json({ images: await listRecipeImages(recipeSlug) }); }
  catch (error) { return adminErrorResponse(error); }
}

export async function POST(request: Request) {
  const access = await authorizeAdminRequest();
  if ("response" in access) return access.response;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return Response.json({ error: "Vercel Blob is not configured for editorial photographs." }, { status: 503 });

  let uploadedUrl: string | undefined;
  try {
    const form = await request.formData();
    const image = form.get("image");
    const rawMetadata = form.get("metadata");
    if (!(image instanceof File) || typeof rawMetadata !== "string") {
      return Response.json({ error: "Choose an image and provide its attribution details." }, { status: 400 });
    }
    const metadata = RecipeImageMetadataSchema.parse(JSON.parse(rawMetadata) as unknown);
    if (image.size === 0 || image.size > MAX_EDITORIAL_IMAGE_BYTES) {
      return Response.json({ error: "Editorial images must be between 1 byte and 3 MB." }, { status: 413 });
    }
    const bytes = new Uint8Array(await image.arrayBuffer());
    const detectedType = detectApprovedImageType(bytes);
    if (!detectedType || !APPROVED_IMAGE_TYPES.includes(detectedType) || image.type !== detectedType) {
      return Response.json({ error: "The file contents must be a matching JPEG, PNG, or WebP image." }, { status: 415 });
    }

    const extension = detectedType === "image/jpeg" ? "jpg" : detectedType.split("/")[1];
    const blob = await put(`g9-film-lab/${metadata.recipeSlug}/${metadata.imageType}/${Date.now()}.${extension}`, new Blob([bytes], { type: detectedType }), {
      access: "public",
      addRandomSuffix: true,
      contentType: detectedType,
      token,
    });
    uploadedUrl = blob.url;
    const row = await saveRecipeImage({
      recipeSlug: metadata.recipeSlug,
      storagePath: blob.pathname,
      imageUrl: blob.url,
      imageType: metadata.imageType,
      authenticityType: metadata.authenticityType,
      photographer: metadata.photographer,
      licence: metadata.licence,
      metadata: {
        firmwareVersion: metadata.firmwareVersion,
        lens: metadata.lens,
        whiteBalance: metadata.whiteBalance,
        exposureDetails: metadata.exposureDetails,
        lightingConditions: metadata.lightingConditions,
        pairId: metadata.pairId,
        contentType: detectedType,
        size: image.size,
      },
    }, access.actor);
    revalidatePath("/admin");
    return Response.json({ image: row }, { status: 201 });
  } catch (error) {
    if (uploadedUrl) {
      try { await del(uploadedUrl, { token }); } catch (cleanupError) { console.error("Could not remove an untracked Blob upload", cleanupError); }
    }
    return adminErrorResponse(error);
  }
}
