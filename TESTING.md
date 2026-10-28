# Testing

## Local checks

```bash
npm ci
npm test
npm run lint
npx tsc --noEmit
npm run build
```

The unit suite covers camera setting and firmware gates, recipe filtering and schema validation, local IndexedDB collections, illustrative pixel rendering, admin authorization/recipe validation, image authenticity, physical-camera evidence rules, Neon SQL migrations, schema constraints and non-overwriting seed behavior.

## Browser tests

Playwright is configured to exercise the public library, query-string filters, detail/guide navigation, local favourites and personal recipe saving, plus layout overflow at 375, 390, 768 and 1440 CSS pixels. Run `npm run build` before `npm run test:e2e`; the browser suite starts the production server on port 3000. Install Chromium with `npx playwright install chromium` when needed. In the current workspace, Playwright's Chromium archive download returned an empty/corrupt archive, so browser journeys were added but could not be executed here.

## Live integration checks

When Neon and Vercel Blob credentials are present, apply migrations and seed an isolated database before testing the admin flow. Do not run destructive tests against production data. Test the deployed Vercel preview after GitHub/Vercel integration and database environment variables are configured. Camera verification requires physical original DC-G9 hardware; browser tests cannot create that evidence.

