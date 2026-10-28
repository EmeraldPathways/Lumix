import { authorizeAdminRequest } from "@/lib/admin/access";
import { adminErrorResponse } from "@/lib/admin/http";
import { listRecipeRevisions } from "@/lib/db/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const access = await authorizeAdminRequest();
  if ("response" in access) return access.response;
  try {
    const { slug } = await params;
    return Response.json({ revisions: await listRecipeRevisions(slug) });
  } catch (error) { return adminErrorResponse(error); }
}
