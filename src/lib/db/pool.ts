import "server-only";
import { Pool } from "pg";

let pool: Pool | undefined;

export class DatabaseConfigurationError extends Error {
  constructor() {
    super("Neon is not configured. Set DATABASE_URL in this server environment.");
    this.name = "DatabaseConfigurationError";
  }
}

export function hasDatabaseConfiguration() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabasePool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new DatabaseConfigurationError();
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      allowExitOnIdle: true,
    });
    pool.on("error", (error) => console.error("Unexpected idle Neon connection error", error));
  }
  return pool;
}
