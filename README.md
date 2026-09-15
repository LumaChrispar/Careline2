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

From `ecomedik-mobile`, run `npm ci`, copy `.env.example` to `.env`, configure the same Supabase project, and run `npm start`. The app uses Expo SDK 57. Rebuild the development client after upgrading; see [SDK requirements and installation](docs/EXPO_SDK_UPGRADE.md). The Android application identifier remains unchanged.

## Implemented workflows

- Patient registration, search, arrivals, triage, observations, consultation, and follow-up dates.
- Laboratory requests, completion, clinician review, and private documents.
- Prescriptions, stock batches, partial dispensing, and expiry protection.
- Appointments, consented referrals, FCFA invoices, and payment receipt recording.
- Institution applications, operator approval, staff invitations, and facility-scoped access.
- Patient portal, record linking, locally generated QR cards, and staff notice boards.
- Patient concerns and access needs, clinician-approved care plans, printable instructions, named task ownership and handovers, automatic result-review/follow-up tasks, and staff-flagged urgent laboratory escalation.
- Temporary encrypted offline intake on web while the application is already open.

Mobile supports distinct homes for all six roles, online workflows, native date/time selection, notice boards, printable cards, and laboratory document uploads from the device picker or camera. Private attachments open through the device share sheet. The full audit viewer remains on web. Worklists show bounded recent records; they are not all-time reporting.

## Verify changes

```sh
npm run check
npm run test:browser
```

The first command runs lint, 47 core/database/mobile regression tests, and a production build. The 20 browser tests use an isolated mock backend and never write to your hosted project. Install Chromium for Playwright if needed with `npx playwright install chromium` and `PLAYWRIGHT_BROWSERS_PATH` set to the repository's `.playwright` directory.

Mobile bundle checks, from `ecomedik-mobile`:

```sh
npm run check:dependencies
npm run doctor
npm run export:native
```

Read [release verification](docs/RELEASE_CHECKLIST.md) before real use. Local tests do not verify hosted authentication, SMS/email delivery, storage, physical-device behavior, or clinical suitability.

## Database files

[database.sql](database.sql) is the complete current installation and upgrade script. It combines [the base migration](database-migrations/20260910_careline.sql), [care coordination](database-migrations/20260915_care_coordination.sql), and [staff access and handovers](database-migrations/20260916_staff_handover.sql). After editing a migration, run `npm run sql:sync`; tests verify the combined file. Each migration has its own transaction.

Historical SQL under `tests/fixtures` exists only for migration testing. Never install it or the retired `fix_triggers.sql` on a Careline database.

## Current upgrade

See [implemented scope and next steps](docs/CARE_COORDINATION.md), [logo assets and generation prompts](docs/LOGO.md), and [the source cleanup record](docs/CLEANUP.md). AI features and monetization changes remain excluded.

See [native role dashboards and device checks](docs/NATIVE_DASHBOARDS.md) for the Expo changes. Rebuild the installed development/release app after adding the native picker, network module, and camera configuration.

Public signup is a simple patient form. Institution administrators issue private staff setup links from Team & access; ordinary login selects the role dashboard. See [staff access and handovers](docs/STAFF_ACCESS.md).
