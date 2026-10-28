import "server-only";
import { headers } from "next/headers";
import { getAuth, isAuthConfigured } from "@/lib/auth";
import { getDatabasePool } from "@/lib/db/pool";
import type { AdminActor } from "./recipe-service";

export type AdminAccess =
  | { status: "authorized"; actor: AdminActor }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "unconfigured" }
  | { status: "unavailable" };

export async function getAdminAccess(): Promise<AdminAccess> {
  if (!isAuthConfigured()) return { status: "unconfigured" };
  try {
    const session = await getAuth().api.getSession({ headers: await headers() });
    if (!session) return { status: "unauthenticated" };
    const result = await getDatabasePool().query<{ email: string }>(
      "SELECT email FROM admin_users WHERE email = lower($1) LIMIT 1",
      [session.user.email],
    );
    if (result.rowCount === 0) return { status: "forbidden" };
    return { status: "authorized", actor: { userId: session.user.id, email: session.user.email.toLowerCase() } };
  } catch (error) {
    console.error("Administrator session check failed", error);
    return { status: "unavailable" };
  }
}

export async function authorizeAdminRequest(): Promise<{ actor: AdminActor } | { response: Response }> {
  const access = await getAdminAccess();
  if (access.status === "authorized") return { actor: access.actor };
  const status = access.status === "unauthenticated" ? 401 : access.status === "forbidden" ? 403 : 503;
  const message = access.status === "unauthenticated"
    ? "Sign in as an administrator."
    : access.status === "forbidden"
      ? "This identity is not authorized to administer G9 Film Lab."
      : access.status === "unconfigured"
        ? "Set Neon and Better Auth environment variables before enabling admin writes."
        : "Administrator access is temporarily unavailable.";
  return { response: Response.json({ error: message }, { status }) };
}
