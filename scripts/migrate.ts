import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Set DATABASE_URL to your Neon pooled connection string before running migrations.");

const root = fileURLToPath(new URL("../", import.meta.url));
const migrationsPath = join(root, "db", "migrations");
const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 10_000 });
const client = await pool.connect();

try {
  await client.query("SELECT pg_advisory_lock(hashtext('g9-film-lab-migrations'))");
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const appliedRows = await client.query<{ name: string }>("SELECT name FROM schema_migrations");
  const applied = new Set(appliedRows.rows.map(({ name }) => name));
  const files = (await readdir(migrationsPath)).filter((name) => /^\d+[-_].+\.sql$/.test(name)).sort();

  for (const name of files) {
    if (applied.has(name)) {
      console.log(`skip ${name} (already applied)`);
      continue;
    }
    const sql = await readFile(join(migrationsPath, name), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
      await client.query("COMMIT");
      console.log(`applied ${name}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  try { await client.query("SELECT pg_advisory_unlock(hashtext('g9-film-lab-migrations'))"); } finally {
    client.release();
    await pool.end();
  }
}
