# Installed Expo app: role dashboards

These changes are in `ecomedik-mobile`, using React Native components. No embedded website or browser dashboard is involved.

| Role | Home priorities | Main shortcuts |
| --- | --- | --- |
| Nurse / reception | Open arrivals, triage queue, appointments | Register patient, arrivals/triage, appointments |
| Doctor | Consultation queue, urgent results, follow-up tasks | Patient records, result review, follow-ups |
| Lab technician | Requested/processing tests and assigned tasks | Test worklist, standalone result, tasks |
| Pharmacist | Current prescriptions, low/expired stock | Dispensing, stock, receipts |
| Administrator | Active staff, account-link requests, open visits/results | Team/access, coordination, registration |
| Patient | Next appointment, care instructions, current medicines | Care plan, request appointment, patient card |

Homes show short previews, with the complete bounded worklist one tap away. Patient medicines, appointments, results/history, and invoices have separate sections. Counts describe loaded worklists, not all-time totals. Open staff work is filtered before the 100-row limit; patient names are fetched for the loaded consultation queue.

## Native laboratory documents

Lab technicians and administrators can add a standalone result from Laboratory; lab staff also have a home shortcut. Choose an existing PDF/JPG/PNG or photograph a document. Camera permission is requested when the person chooses to take a photo; audio recording permission is disabled. An image preview lets staff check legibility before saving.

Attachments remain in the private laboratory bucket with the existing patient/facility ownership checks. The upload reads an ArrayBuffer, validates the actual size (maximum 10 MB), and submits the validated result through the existing SQL command. Upload and result writes share a stable submission ID. Once a save starts, its fields are locked for retries so a lost server response cannot cause a second clinical result. File conflicts on retry are resolved by the existing storage path and database ownership validation. Failed uploads do not create attachment-less results.

The app does not delete remote files after an ambiguous save error; doing so could remove an attachment from an already committed result. Cancelled/failed submissions can leave unlinked private objects for operator cleanup. Local picker/camera copies are removed when the upload screen closes. Never close a failed submission and create another entry without first checking the worklist.

Attachments are downloaded temporarily and opened/shared using the operating system's share sheet. The app no longer opens a browser URL for these documents. Temporary downloaded copies are removed when sharing completes; copies deliberately shared to another app are controlled by that app.

## Interrupted connections

The app displays connection state and the last successful home refresh. Failed refreshes retain the last loaded worklist. An already authenticated workspace and its open forms stay mounted during transient connection failures, and access is refreshed on reconnect. Authorization errors still deny access and signing out clears the workspace. Save forms check connectivity and show errors without clearing their inputs.

This is not offline synchronization: forms are held in memory only, closing/restarting the app can lose unsaved work, and clinical saves still need a connection.

## Verification and installation

- Nine native logic tests cover role priorities, queue ordering, ownership, prescription/stock dates, query scoping, connection states, upload validation and retry behavior. Run with the root `npm run test`.
- Lint and Android/iOS Hermes export checks pass. These are compilation checks, not physical-device testing.
- Install mobile dependencies with `npm ci` and rebuild the development/release application. The new native modules and camera permission configuration require a rebuilt app; JavaScript-only updates are insufficient for an older installed binary.
- Complete the physical-device and hosted-service checks in [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md), including camera denial, keyboard/large-text layout, upload retries, private document sharing, and disconnect/reconnect with an open form.

Implementation references: [Expo 54 DocumentPicker](https://docs.expo.dev/versions/v54.0.0/sdk/document-picker/) and [Expo 54 FileSystem](https://docs.expo.dev/versions/v54.0.0/sdk/filesystem/). Package versions follow the installed Expo SDK's bundled-module manifest.
