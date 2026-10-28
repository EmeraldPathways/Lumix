import { toNextJsHandler } from "better-auth/next-js";
import { AuthConfigurationError, getAuth } from "@/lib/auth";
import { DatabaseConfigurationError } from "@/lib/db/pool";

async function dispatch(method: "GET" | "POST", request: Request) {
  try {
    const handlers = toNextJsHandler(getAuth());
    return await handlers[method](request);
  } catch (error) {
    if (error instanceof AuthConfigurationError || error instanceof DatabaseConfigurationError) {
      return Response.json({ error: "Administrator authentication is not configured." }, { status: 503 });
    }
    console.error("Better Auth request failed", error);
    return Response.json({ error: "Authentication is temporarily unavailable." }, { status: 503 });
  }
}

export const GET = (request: Request) => dispatch("GET", request);
export const POST = (request: Request) => dispatch("POST", request);
