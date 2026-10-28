# Architecture

G9 Film Lab is a Next.js App Router application. Recipe content and camera capability rules are separate from page components so an additional Lumix model can be added without loosening the original DC-G9 validator.

## Runtime boundaries

- Public recipe discovery is server rendered. `src/lib/db/recipes.ts` reads published, non-archived rows from Neon with explicit publication predicates and prefers an optional non-owner `DATABASE_READONLY_URL`. Bundled experimental seed recipes are used only when no Neon connection is configured, so the public experience remains usable before database setup.
- Better Auth uses the Neon PostgreSQL database through the server-only `pg` pool. Email/password registration is restricted by the `admin_users` allowlist. Every admin page and write route checks both the session and the current allowlist membership.
- Admin and migration connections are server-only. No Neon password, auth secret, or Blob write token is exposed through `NEXT_PUBLIC_` variables.
- Vercel Blob stores admin-approved editorial photographs. Uploads are public assets; the interface requires permission confirmation and warns that GPS/EXIF metadata is not stripped automatically.
- The common comparison image is a user-provided reference photograph, explicitly labelled as an illustrative sample rather than a G9 photograph. Its use is recorded as authorized by the uploader; admin-approved and G9-tested photography remains a separate, attributed asset workflow.
- Personal recipes, favourites, recent visits, wizard progress and Custom1–Custom4 plans live in IndexedDB on the user's device. Collection JSON is the backup and transfer mechanism; local records do not silently synchronize to a server.
- The Studio preview uses local Canvas processing and is explicitly approximate. It does not change the camera recipe model or claim to reproduce Panasonic's JPEG pipeline.

## Data flow

`G9RecipeSchema` validates recipe documents. `validateG9Recipe` is the authoritative DC-G9 compatibility engine. Seed input, Studio saves/imports and admin writes use those schemas. Admin camera verification additionally requires a test record with original-camera details and image rows belonging to one matching controlled pair.

SQL migrations create normalized category, recipe, tag, photo, camera-test, revision, setting and Better Auth tables. Catalog tables have row-level security enabled and public read policies; the app itself never sends database credentials to a browser. For strongest separation, use a dedicated non-owner Neon role for `DATABASE_READONLY_URL` and the owner/server credential only for auth and protected admin mutations. Admin mutations use the private server connection only after the route's session and allowlist check.

## Neon operating notes

Use a pooled Neon connection string for `DATABASE_URL` in Vercel and local server execution. Run migrations before seeding. `npm run db:seed` inserts absent recipe slugs and admin identities; conflicts are left as-is to protect production edits. Removing an administrator requires deleting their email from `admin_users`; this revokes access even if their Better Auth account remains.

