# Careline (ECO-MEDIK)

Connected patient care for institutions in Cameroon. The project includes a React web app, an Expo mobile app, and a complete Supabase database installation.

## Start the web app

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env` and enter your Supabase URL and public client key.
3. Install [database.sql](database.sql) in your Supabase SQL editor.
4. Follow [deployment and first-administrator setup](docs/DEPLOYMENT.md).
5. Run `npm run dev`.

Use `npm run build` for the production web bundle in `dist/`. Static hosting must send application routes to `index.html`; the repository includes the Vercel rewrite.

## Start the mobile app

From `ecomedik-mobile`, run `npm ci`, copy `.env.example` to `.env`, configure the same Supabase project, and run `npm start`. Use a development build or compatible Expo client to test on a device. Native identifiers remain unchanged so existing installations retain their application identity.

## Implemented workflows

- Patient registration, search, arrivals, triage, observations, consultation, and follow-up dates.
- Laboratory requests, completion, clinician review, and private documents.
- Prescriptions, stock batches, partial dispensing, and expiry protection.
- Appointments, consented referrals, FCFA invoices, and payment receipt recording.
- Institution applications, operator approval, staff invitations, and facility-scoped access.
- Patient portal, record linking, locally generated QR cards, and staff notice boards.
- Temporary encrypted offline intake on web while the application is already open.

Mobile supports online workflows, native date/time selection, notice boards, and printable patient cards. Standalone document upload and the full audit viewer are available on web. Worklists show bounded recent records; they are not all-time reporting.

## Verify changes

```sh
npm run check
npm run test:browser
```

The first command runs lint, 27 store/database regression tests, and a production build. Browser tests use an isolated mock backend and never write to your hosted project. Install Chromium for Playwright if needed with `npx playwright install chromium` and `PLAYWRIGHT_BROWSERS_PATH` set to the repository's `.playwright` directory.

Mobile bundle checks, from `ecomedik-mobile`:

```sh
npx expo export --platform android --output-dir dist-check
npx expo export --platform ios --output-dir dist-check-ios
```

Read [release verification](docs/RELEASE_CHECKLIST.md) before real use. Local tests do not verify hosted authentication, SMS/email delivery, storage, physical-device behavior, or clinical suitability.

## Database files

[database.sql](database.sql) is the complete current installation and upgrade script. It matches [the Careline migration](database-migrations/20260910_careline.sql). After editing that migration, run `npm run sql:sync`; tests check the two copies match.

Historical SQL under `tests/fixtures` exists only for migration testing. Never install it or the retired `fix_triggers.sql` on a Careline database.
