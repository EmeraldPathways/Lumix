import { ZodError } from "zod";
import { AdminAccessError, AdminRecipeValidationError } from "./recipe-service";
import { AdminRecipeConflictError, AdminRecipeEvidenceError, AdminRecipeNotFoundError } from "@/lib/db/admin";

export function adminErrorResponse(error: unknown) {
  if (error instanceof AdminAccessError) return Response.json({ error: error.message }, { status: 401 });
  if (error instanceof AdminRecipeValidationError) return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof AdminRecipeNotFoundError) return Response.json({ error: error.message }, { status: 404 });
  if (error instanceof AdminRecipeConflictError) return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof AdminRecipeEvidenceError) return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof ZodError) return Response.json({ error: error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") }, { status: 400 });
  if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
    return Response.json({ error: "A recipe with this slug already exists." }, { status: 409 });
  }
  console.error("Administrator action failed", error);
  return Response.json({ error: "The administrator action could not be completed." }, { status: 500 });
}
