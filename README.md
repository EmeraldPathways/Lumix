# G9 Film Lab

An independent recipe library and creative workspace for the original Panasonic Lumix DC-G9. Recipes use configurable Photo Styles and other documented camera controls; they do not install LUTs or camera apps. Every preview is illustrative unless a recipe has documented original-G9 test evidence. The shared sample uses a user-provided reference photograph so colour, highlight, shadow, and monochrome changes are easier to see.

## Development

```bash
npm install
npm run dev
```

For local public browsing, the site uses its 25 bundled experimental recipes until `DATABASE_URL` is configured. To enable the protected database-backed admin, copy `.env.example`, configure Neon and Better Auth, then run:

```bash
npm run db:migrate
npm run db:seed
```

An optional separate `DATABASE_READONLY_URL` lets public catalogue reads use a non-owner Neon role with published-only row policies. Admin identities are added with `ADMIN_EMAILS` during seeding; removing an email from `admin_users` immediately revokes access.

Run unit tests with `npm test`, lint with `npm run lint`, TypeScript with `npx tsc --noEmit`, production build with `npm run build`, and browser journeys with `npm run test:e2e` after installing Chromium.

The persistence stack is Neon PostgreSQL, Better Auth stored in that database, and optional Vercel Blob for approved public editorial images. There is no Supabase dependency.

## Project notes

- [Architecture](ARCHITECTURE.md)
- [Original G9 compatibility](CAMERA_COMPATIBILITY.md)
- [Testing](TESTING.md)
- [Deployment](DEPLOYMENT.md)
- [SD-card preset research](SD_PRESET_RESEARCH.md)

The capability engine is intentionally scoped to the **DC-G9 (2017)**. It is separate from recipe content so another camera model can be added without changing the existing G9 rules.
