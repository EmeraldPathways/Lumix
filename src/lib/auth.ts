import "server-only";
import { APIError, betterAuth, type User } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getDatabasePool } from "@/lib/db/pool";

let instance: ReturnType<typeof betterAuth> | undefined;

export class AuthConfigurationError extends Error {
  constructor() {
    super("Set DATABASE_URL and BETTER_AUTH_SECRET to enable administrator sign-in.");
    this.name = "AuthConfigurationError";
  }
}

export function isAuthConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET);
}

export function getAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!process.env.DATABASE_URL || !secret) throw new AuthConfigurationError();
  if (!instance) {
    const pool = getDatabasePool();
    const trustedOrigins = [
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.BETTER_AUTH_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ].filter((origin): origin is string => Boolean(origin));

    instance = betterAuth({
      appName: "G9 Film Lab",
      ...(process.env.BETTER_AUTH_URL ? { baseURL: process.env.BETTER_AUTH_URL } : {}),
      secret,
      trustedOrigins,
      database: pool,
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 12,
        maxPasswordLength: 128,
        autoSignIn: true,
      },
      databaseHooks: {
        user: {
          create: {
            before: async (user: User) => {
              const allowed = await pool.query<{ email: string }>(
                "SELECT email FROM admin_users WHERE email = lower($1) LIMIT 1",
                [user.email.trim()],
              );
              if (allowed.rowCount === 0) {
                throw new APIError("FORBIDDEN", { message: "Account creation is limited to pre-authorized administrators." });
              }
              return { data: { ...user, email: user.email.trim().toLowerCase() } };
            },
          },
        },
      },
      session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
      plugins: [nextCookies()],
    }) as unknown as ReturnType<typeof betterAuth>;
  }
  return instance!;
}
