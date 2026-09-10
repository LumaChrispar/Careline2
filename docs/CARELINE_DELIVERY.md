# Careline delivery

Accepted direction: a connected care workflow for Cameroon, with nurses also handling reception where needed. Reception is a responsibility, not a required separate account. Existing receptionist identities will migrate to nurse memberships after administrator review.

## Implementation work

- Server-owned facility memberships, verified institution onboarding and staff invitations.
- Reliable patient identity, optional demographics, shared contact numbers and account linking.
- Arrival, triage, consultation, explicit laboratory states, prescriptions and follow-up.
- Pharmacy stock batches, partial dispensing and expiry protection.
- Appointments, referrals, FCFA invoices, cash/mobile-money reference recording.
- Careline branding, practical role workspaces and patient-facing records.
- Private documents, local QR generation, audit history and safe upgrade SQL.
- Scoped offline intake, visible pending work and retry.

## Release boundary

Local checks and isolated database tests do not verify a deployed Supabase project. SMS/email delivery requires provider configuration. Mobile-money references record a payment entered by staff; they do not verify payment with an operator. Institution approval verifies workflow access; real facility credentials must be reviewed by the platform operator.

Never deploy the historical `fix_triggers.sql` after the Careline migration. Existing staff memberships start inactive until reviewed; the deployment guide describes bootstrap and approval.
