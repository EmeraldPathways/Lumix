# G9 Film Lab — Design

## Intent

Build a public, mobile-first recipe library and creative workspace for owners of the original Panasonic Lumix DC-G9. Photographers should be able to find a film-inspired look, understand its actual in-camera settings, preview an explicitly approximate rendering, save it locally, and configure the camera manually.

## Goals

- Cover the original DC-G9 only; keep camera capability data isolated so another camera can be added later.
- Make public recipes, camera settings, setup instructions, preview limitations, and validation status clear.
- Provide a working library, recipe details, setup wizard, compare, Studio, favourites, saved recipes, four-slot planner, and protected admin editing.
- Persist published recipe data in Neon Postgres; keep anonymous personal data in browser storage; store approved public imagery in Vercel Blob.
- Deploy from the connected GitHub repository to Vercel when external credentials are available.

## Non-goals

- Installing apps, LUTs, firmware, or synthetic camera configuration files on the camera.
- Claiming exact film-stock emulation or G9 hardware verification without evidence.
- Requiring public visitors to register.
- Uploading a visitor's Studio photo to a server.

## Constraints

- Use Panasonic's original DC-G9 manual and official firmware notes as the capability source.
- Photo Style custom slots are distinct from Custom shooting modes and SD-card camera configurations.
- L.Monochrome D and Grain Effect require firmware 1.1; AWBw requires firmware 2.0.
- Recipe previews are browser approximations; recipes remain settings the camera itself supports.
- The SD-card preset generator stays unavailable until independently validated on hardware.

## Approaches

1. **Neon Postgres + Neon Auth (Better Auth integration) + Vercel Blob — selected.** This follows the requested Neon change while retaining managed admin identity and durable approved photos. The extra services are limited to capabilities Neon does not provide as a relational database.
2. **Supabase Postgres/Auth/Storage.** It would bundle the services but is superseded by the user's request to use Neon instead.
3. **Browser-only storage.** It is inexpensive and useful for anonymous recipes, but cannot persist published editorial data or administrator changes across visitors, so it does not meet the product requirements.

## Architecture

- Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui primitives, Lucide icons, Zod, Vitest, and Playwright.
- One typed original-G9 capability definition and validator; separate recipe data, preview renderer, and UI.
- Server components read public recipes through a server-only Neon repository. Browser code never receives database credentials.
- Admin writes require a server-verified Neon Auth session and an explicit allow-listed admin identity.
- Personal recipes, favourites, recently viewed items, wizard progress, and four-slot assignments are local-first and exportable.
- Recipe photos are attached to records in Neon and served from Vercel Blob; user preview images are processed in-browser only.
- Seed scripts insert starter recipes only when absent and do not overwrite edited production content.

## Visual direction

Original editorial identity inspired by contact sheets and analogue photography. Charcoal, warm ivory, forest green, muted grey, and restrained orange accents; photographic imagery with generous spacing; accessible controls and responsive layouts.

## Open implementation choices

- Keep the public library usable from deterministic seed data when Neon is not configured in a local preview, and clearly expose the missing production configuration in deployment documentation.
- Do not include generated camera setting files or make any recipe camera-verified by seed data.
- Use an original, licensed representative sample image and keep all previews labelled as illustrative until paired G9 evidence is supplied.
