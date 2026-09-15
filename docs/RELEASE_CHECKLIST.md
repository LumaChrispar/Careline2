# Careline release verification

## Local results - 15 September 2026

Passed: lint, production web build, 47 core/database/mobile tests, 20 browser tests, Android bundle export, and iOS bundle export. Browser coverage includes all six roles at desktop and narrow-phone widths. The SQL was installed twice on a fresh isolated database and used to upgrade a populated copy of the original schema. No hosted database was changed.

SDK follow-up: mobile now uses Expo 57.0.23, React Native 0.86.3 and React 19.2.3. All 21 Expo Doctor checks, dependency compatibility checks, and Android/iOS Hermes exports pass. Metro advertises SDK 57.0.0 for Expo Go. See [SDK rebuild instructions](EXPO_SDK_UPGRADE.md); these checks do not replace testing the upgraded app on a device.

## Automated local coverage

- Lint parses web and mobile source.
- Web production build.
- Store and PostgreSQL regression tests: login normalization, server-owned identity, stale session responses, denied context, historical compatibility, repeatable installation, legacy migration, facility isolation, revoked column grants, patient registration retries, concurrent-version checks, partial payments, dispensing bounds, laboratory review, private attachment validation, referrals, appointment arrivals, notices, membership revocation, and external-pharmacy patient access without consultation access.
- Browser tests use an intercepted backend: nurse registration/triage, patient appointment requests, QR generation, notice posting/removal, full-name patient search, denied administration, keyboard navigation, active role pages at 1440px and 320px, and encrypted offline intake with one sync on reconnect.
- Coordination tests: linked-patient concerns, response permissions, private drafts, clinician publication, acknowledgement, stale versions, named task ownership, unassigned-task authorization, required outcomes, urgent lab escalation and review closure, Cameroon follow-up deadlines, and repeated installation without duplicate tasks.
- Browser coordination flows: staff concern response, draft/publication, print isolation, patient acknowledgement/access needs, and task completion/history.
- Native dashboard and upload logic: all six role configurations, urgent queue ordering, owner/facility filtering, current prescription and stock selection, future appointments, server filters before limits, connection detection, attachment validation, failed uploads, and idempotent retry after a lost save response.
- Android and iOS JavaScript/native bundle export checks. Exports are not signed device installation packages.

Commands and setup are in the root README. Browser screenshots are saved under `artifacts/`.

## Required hosted test-facility run

These checks have not been performed against the hosted database during this upgrade.

- [ ] Install the current SQL in a test Supabase project and bootstrap the operator.
- [ ] Sign up and confirm email; recover an account; verify SMS if phone signup is offered.
- [ ] Verify public signup has no role/purpose selector and existing-card signup creates no duplicate patient.
- [ ] Create and revoke a private staff setup link; open it in the installed app, verify the invited email, and sign in to the correct dashboard. Test expired and renewed links.
- [ ] Check membership badges disappear after access revocation and confirm that a staff invitation cannot reactivate a disabled membership.
- [ ] Assign a clinician to an open visit, send a consented referral, assign a receiving clinician, and verify attribution without access to unrelated consultations.
- [ ] Approve an institution; invite each role; verify uninvited and revoked accounts are denied.
- [ ] Register a patient without a portal and one with a verified personal account; link an existing card after identity review.
- [ ] Register arrival, capture observations, save consultation, request/complete/review a lab test, and confirm persistence after reload.
- [ ] Record patient concerns and a care-team response on web and native; verify unrelated users cannot read them.
- [ ] Save a draft plan, verify it is hidden from the patient, publish it, acknowledge it as the patient, and print/share the approved instructions.
- [ ] Assign, hand over, wait and complete tasks; test stale updates and closed history on both clients.
- [ ] Complete and escalate a lab result, directly contact the responsible clinician, and confirm clinical review closes its task.
- [ ] Set and change a visit follow-up date; verify the linked task date and its cancellation when the follow-up is removed.
- [ ] Upload a PDF/image and verify access as the correct patient, correct facility, unrelated patient, and unrelated facility.
- [ ] Partially dispense, finish dispensing, and verify stock, expiry denial, and completed prescription behavior.
- [ ] Book an appointment, mark arrival once, and verify the waiting visit.
- [ ] Refer with consent; accept at the receiving institution; verify only permitted records are shared.
- [ ] Record partial cash and mobile-money receipts; verify balance limits and duplicate references.
- [ ] Post all-staff, role, and direct notices; verify audience restrictions.
- [ ] Disconnect an open browser, save consented intake, reconnect, and confirm only one patient is created.
- [ ] Switch facility, sign out, sign in as another person, and verify old records are not displayed.
- [ ] Install a rebuilt Expo development/release app on Android and iOS; verify each role home and all its shortcuts.
- [ ] As lab staff, pick a PDF and photograph a document; check permission refusal, image legibility, upload persistence, and clinician review.
- [ ] Open private attachments through the native share sheet as the correct patient and staff; verify unrelated accounts are denied.
- [ ] Disconnect with an unsaved form open, wait through a session refresh, reconnect, and verify the form remains and saves only once. Sign-out must clear the workspace.
- [ ] Test Android and iOS keyboards, date selection, safe areas, large text, and card/care-plan PDF sharing on devices.
- [ ] Confirm backup restoration, production Auth redirect URLs, and HTTPS hosting.

## Scope limits

Recent worklists are bounded (web generally 200 records, mobile 100); patient directories provide search. Displayed counts are not complete historical reporting. The full audit viewer uses the web workspace. Native uploads and camera capture require a rebuilt installed app and device acceptance tests. SMS/email depend on configured providers. Payment references are manual receipts. Offline drafts are temporary and session-bound.

The repository is prepared for a hosted test-facility pilot. Automated checks alone do not establish production readiness or certify clinical use.
