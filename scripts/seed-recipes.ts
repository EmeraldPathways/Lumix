import { Pool } from "pg";
import { seedRecipeCatalog } from "../src/lib/db/seed";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Set DATABASE_URL to your Neon pooled connection string before seeding.");

const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 10_000 });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  const summary = await seedRecipeCatalog(client, undefined, adminEmails);
  await client.query("COMMIT");
  console.log(`Inserted ${summary.inserted} new recipes; left ${summary.existing} existing recipe records unchanged; added ${summary.authorizedAdmins} admin email(s).`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
