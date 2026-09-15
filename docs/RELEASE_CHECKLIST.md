# Careline release verification

## Local results ? 15 September 2026

Passed: lint, production web build, 27 store/database tests, 13 browser tests, Android bundle export, and iOS bundle export. Browser coverage includes all six roles at desktop and narrow-phone widths. The SQL was installed twice on a fresh isolated database and used to upgrade a populated copy of the original schema. No hosted database was changed.

## Automated local coverage

- Lint parses web and mobile source.
- Web production build.
- Store and PostgreSQL regression tests: login normalization, server-owned identity, stale session responses, denied context, historical compatibility, repeatable installation, legacy migration, facility isolation, revoked column grants, patient registration retries, concurrent-version checks, partial payments, dispensing bounds, laboratory review, private attachment validation, referrals, appointment arrivals, notices, membership revocation, and external-pharmacy patient access without consultation access.
- Browser tests use an intercepted backend: nurse registration/triage, patient appointment requests, QR generation, notice posting/removal, full-name patient search, denied administration, keyboard navigation, active role pages at 1440px and 320px, and encrypted offline intake with one sync on reconnect.
- Android and iOS JavaScript/native bundle export checks. Exports are not signed device installation packages.

Commands and setup are in the root README. Browser screenshots are saved under `artifacts/`.

## Required hosted test-facility run

These checks have not been performed against the hosted database during this upgrade.

- [ ] Install the current SQL in a test Supabase project and bootstrap the operator.
- [ ] Sign up and confirm email; recover an account; verify SMS if phone signup is offered.
- [ ] Approve an institution; invite each role; verify uninvited and revoked accounts are denied.
- [ ] Register a patient without a portal and one with a verified personal account; link an existing card after identity review.
- [ ] Register arrival, capture observations, save consultation, request/complete/review a lab test, and confirm persistence after reload.
- [ ] Upload a PDF/image and verify access as the correct patient, correct facility, unrelated patient, and unrelated facility.
- [ ] Partially dispense, finish dispensing, and verify stock, expiry denial, and completed prescription behavior.
- [ ] Book an appointment, mark arrival once, and verify the waiting visit.
- [ ] Refer with consent; accept at the receiving institution; verify only permitted records are shared.
- [ ] Record partial cash and mobile-money receipts; verify balance limits and duplicate references.
- [ ] Post all-staff, role, and direct notices; verify audience restrictions.
- [ ] Disconnect an open browser, save consented intake, reconnect, and confirm only one patient is created.
- [ ] Switch facility, sign out, sign in as another person, and verify old records are not displayed.
- [ ] Test Android and iOS keyboards, date selection, safe areas, large text, and card PDF sharing on devices.
- [ ] Confirm backup restoration, production Auth redirect URLs, and HTTPS hosting.

## Scope limits

Recent worklists are bounded (web generally 200 records, mobile 100); patient directories provide search. Displayed counts are not complete historical reporting. Native standalone file uploads and the full audit viewer use the web workspace. SMS/email depend on configured providers. Payment references are manual receipts. Offline drafts are temporary and session-bound.

The repository is prepared for a hosted test-facility pilot. Automated checks alone do not establish production readiness or certify clinical use.
