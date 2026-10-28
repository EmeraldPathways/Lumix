import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin/access";
import { adminErrorResponse } from "@/lib/admin/http";
import { archiveAdminRecipe, unarchiveAdminRecipe } from "@/lib/db/admin";

const ArchiveBody = z.object({ archived: z.boolean() }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const access = await authorizeAdminRequest();
  if ("response" in access) return access.response;
  try {
    const { slug } = await params;
    const { archived } = ArchiveBody.parse(await request.json());
    if (archived) await archiveAdminRecipe(slug, access.actor);
    else await unarchiveAdminRecipe(slug, access.actor);
    revalidatePath("/");
    revalidatePath("/recipes");
    revalidatePath("/admin");
    return Response.json({ slug, archived });
  } catch (error) { return adminErrorResponse(error); }
}
