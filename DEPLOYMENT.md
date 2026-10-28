# Deployment

## Required services

- GitHub repository: `EmeraldPathways/Lumix`
- Vercel project connected to the repository; deploy `main` to production and pull requests/branches to previews.
- Neon PostgreSQL project with a pooled connection string.
- Vercel Blob store only if administrators will upload editorial photographs.

## Environment variables

Set these as server-side Vercel variables for the environments that need them:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled Neon Postgres connection string for Better Auth and admin writes. |
| `DATABASE_READONLY_URL` | Optional non-owner Neon role with catalog `SELECT` grants, constrained by published-only RLS. Recommended to keep public reads separate from admin writes. |
| `BETTER_AUTH_SECRET` | At least 32 random bytes; use different secrets across environments. |
| `BETTER_AUTH_URL` | Canonical origin for this deployment, including `https://` in production. |
| `NEXT_PUBLIC_SITE_URL` | Public canonical URL used by page metadata/sitemap and trusted auth origins. |
| `ADMIN_EMAILS` | Comma-separated admin addresses inserted by the seed command. |
| `BLOB_READ_WRITE_TOKEN` | Optional Vercel Blob write token for protected editorial uploads. |

No values are prefixed `NEXT_PUBLIC_` unless they are intended to be public.

## Initial setup

1. Create the Neon project and copy its pooled connection URL into a local environment file and Vercel's Production/Preview/Development environments.
2. For least privilege, create a non-owner database role for the public catalogue, grant it `SELECT` on the catalog tables, and set its pooled URL as `DATABASE_READONLY_URL`. The migration's row policies expose only published, non-archived recipe rows and approved public test/image metadata.
3. Set the authentication secret and deployment URLs. Put the first admin address in `ADMIN_EMAILS`.
4. Run `npm run db:migrate`, then `npm run db:seed` with the private admin database URL and admin email list.
5. Add a Vercel Blob token if editorial photo upload is required. Public recipe browsing, the guide, Studio, local saving and favourites work without it.
6. Connect the GitHub repository to Vercel, set the production branch to `main`, and enable preview deployments.
7. Push a tested commit. Check the Vercel build and then verify `/`, `/recipes`, one recipe detail, `/studio`, `/my-recipes`, `/guide`, `/compare` and the protected admin sign-in flow on the deployment URL.

## Current external setup status

The public app is deployed at [https://lumix-g9-film-lab.vercel.app](https://lumix-g9-film-lab.vercel.app), connected to `EmeraldPathways/Lumix`, with production builds from `main`. The production deployment verified on 2026-10-28 is commit `b89477f3c92a68ef5ca1c58eb495fd058ef0dd5f`.

The Vercel runtime currently has no Neon or Better Auth credentials. The public app therefore serves its bundled collection of 25 experimental recipes. `/admin` reports that `DATABASE_URL`, `BETTER_AUTH_SECRET` and `ADMIN_EMAILS` are not configured. Neon migrations and the seed command have not been run against a live database; cloud-backed recipe persistence, administrator sign-in and editorial writes are not active. User-created recipes and favourites remain local to each browser. Add the required server-side variables above, run migrations and seed once, and redeploy before treating admin or database persistence as live. Configure `BLOB_READ_WRITE_TOKEN` only when approved editorial uploads are needed.

Vercel preview deployments remain behind SSO; the production alias is publicly reachable. The project is linked to GitHub `main` for automatic deployments.

