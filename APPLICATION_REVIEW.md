# Application review and refresh — 7 September 2026

## Implemented

- Web startup waits for session restoration; authenticated data loads follow login, refresh on reconnect, and refresh every minute. Session subscriptions clean up on unmount.
- Patient/laboratory stores clear on account changes and discard reads started before reset. Data failures have a visible retry action.
- Administrator staff signup uses detached auth clients on both platforms so it does not replace the current session.
- Phone login normalizes formatting on web. Mobile staff patient registration now creates the same synthetic email identity that mobile login expects.
- Web intake supports registration without portal credentials, omits password from database inserts, normalizes optional fields, validates future birth dates, and prevents duplicate submissions.
- Mobile intake no longer assumes an unknown blood group is O+. A failed account-to-patient lookup does not silently create a second patient record.
- Patient search supports full names; pagination remains valid after deletion. Deletion failures surface to the user.
- Mobile nurses get a staff dashboard. Privileged stack screens are limited by role; tab bars respect native safe-area sizing.
- Mobile patient details refresh after returning from a new visit. Web and mobile clinicians can mark a lab result reviewed. Laboratory completion no longer automatically acknowledges clinician review.
- Patient portal lookup failures show a retry action instead of an endless spinner.
- Web dashboard uses actual recent registrations, a 30-day symptom window, and connectivity state instead of fabricated growth and sync figures.
- Shared web surfaces, buttons, tables, navigation, typography and dashboard welcome area refreshed. Added keyboard focus, skip navigation, reduced-motion support, narrower-screen adjustments, and honest offline feedback.
- Mobile light/dark palettes, shared dashboard cards, typography, and tab navigation refreshed.

## Validation and deployment boundaries

Run `npm run build`, `npm run lint`, and `node --test tests/core-flows.test.cjs` from the root. Mobile bundle validation: `npx expo export --platform android --output-dir dist-check` from `ecomedik-mobile`.

Regression tests exercise store behavior with an isolated backend, including identity preservation, phone normalization, full-name search, registration payloads, and stale reads after logout. Lint now parses web and mobile JSX and checks basic correctness rules; TypeScript uses the existing stricter rules. This does not constitute exhaustive static checking of legacy JavaScript.

No hosted database was changed and no live patient accounts were created. Apply `database-migrations/20260907_nurse_role.sql` to enable nurse values in existing database constraints. Bundle compilation does not substitute for device testing or authenticated backend acceptance testing.

## Remaining high-priority work

1. **Server authorization:** `database.sql` trusts user-editable auth metadata for roles; public signup can request staff roles. Move role provisioning to an authenticated server endpoint and enforce server-owned roles. Profile edits and auth metadata can also disagree. UI route restrictions are not a security boundary.
2. **Facility isolation and document privacy:** current policies permit staff-wide reads across facilities, and lab attachments use public URLs/data-URL fallbacks. Establish facility-scoped policies and private storage with signed access before production use with real records.
3. **Actual offline support:** the IndexedDB queue is not wired into patient/lab writes. Startup no longer runs this disconnected queue, and UI no longer promises that offline writes are saved. Implement account-scoped persistence, conflict handling, explicit pending state and retry before advertising offline operation.
4. **Clinical queue model:** a missing lab summary is used as the existing request queue marker, while `notified_at` represents review. Introduce explicit requested/in-progress/completed/reviewed states and an audit trail. Historical `notified_at` values may have been set by lab technicians.
5. **Patient identity and onboarding:** phone/email identity reconciliation, account recovery, email confirmation, record linking, and explicit unknown demographics need a complete server-backed flow. Existing SQL triggers substitute birth dates for missing data; this needs migration planning rather than inventing a patient's age.
6. **Operational features:** appointments, follow-up tasks, referrals, vital signs, medication history, consent and audit logs need agreed workflows and schema support. No placeholder features were added to claim these exist.
7. **Full visual/device review:** this refresh covers shared UI and core screens, not a bespoke redesign of every screen. Check physical-device keyboard behavior, screen reader navigation, modals, PDF exports and QR scanning.

## Acceptance checklist using a test facility

- Sign in as patient, doctor, receptionist, nurse, lab technician and admin; refresh the browser and sign out/in as a different account.
- Create staff while signed in as admin; confirm the admin session stays active.
- Register patients with and without portal access on both platforms; log into the portal with the same identifier used at registration.
- Search a full name, open a record, save a visit, return to history, and confirm the visit appears.
- Upload a test result, review it as clinician, return to the list, and verify the review timestamp persisted.
- Disconnect connectivity; confirm no unsupported saved/synced claim appears. Reconnect and verify records refresh.
- Exercise denied backend access and missing records; verify visible errors and retry paths.
