import { revalidatePath } from "next/cache";
import { authorizeAdminRequest } from "@/lib/admin/access";
import { adminErrorResponse } from "@/lib/admin/http";
import { RecipeTestRecordSchema } from "@/lib/admin/test-record";
import { listRecipeTests, recordAdminCameraTest } from "@/lib/db/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const access = await authorizeAdminRequest();
  if ("response" in access) return access.response;
  try {
    const { slug } = await params;
    return Response.json({ tests: await listRecipeTests(slug) });
  } catch (error) { return adminErrorResponse(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const access = await authorizeAdminRequest();
  if ("response" in access) return access.response;
  try {
    const { slug } = await params;
    const record = RecipeTestRecordSchema.parse(await request.json());
    await recordAdminCameraTest(slug, record, access.actor);
    revalidatePath("/");
    revalidatePath("/recipes");
    revalidatePath(`/recipes/${slug}`);
    revalidatePath("/admin");
    return Response.json({ recorded: true });
  } catch (error) { return adminErrorResponse(error); }
}
