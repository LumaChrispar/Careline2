# Careline installation and upgrade

## 1. Choose the target and preserve existing data

Use a separate Supabase test project for the first acceptance run. For an existing installation, take a database backup and preserve Storage objects before upgrading. The script retains patient and clinical records, allows unknown birth dates and shared contact numbers, and makes the laboratory bucket private.

The script is transactional and repeatable. If a statement fails, the transaction rolls back; inspect the error before retrying. A database rollback after live writes requires a restore plan, not running the old SQL.

## 2. Install the complete SQL

Run the entire root `database.sql` in the Supabase SQL editor as the project database administrator. It supports a fresh Supabase project, the original ECO-MEDIK schema, and the existing Careline schema. No historical script is a prerequisite.

The script creates facilities, profiles, memberships, invitations, patients, facility links, visits, observations, laboratory results, prescriptions, stock, dispensing, appointments, referrals, invoices, payments, notices, account-link requests, and audit events. It installs server-owned permissions, validated workflow commands, signup triggers, and private laboratory storage policies.

Do not run `fix_triggers.sql`, the old nurse-only migration, or SQL from `tests/fixtures` afterward. The application uses Careline RPC commands for clinical writes; deploy matching web and mobile clients together. Older clients that write directly to clinical tables will be denied.

Existing staff memberships migrate as inactive and existing facilities become pending on their first upgrade. Public signup metadata cannot grant staff access. Legacy result notification timestamps do not establish clinician review; historical completed results must be reviewed explicitly.

## 3. Configure authentication and storage

- Configure the application's HTTPS origin as the Supabase Auth Site URL.
- Allow the web URLs ending in `/my-records` and `/account` as authentication redirect URLs, plus your local development equivalents.
- Enable email/password authentication and configure confirmation and recovery delivery with your email provider.
- If offering phone signup, enable phone authentication and configure the SMS provider. Phone verification cannot work without that provider.
- Ensure `LAB_result` is private and retains the SQL-created policies. Test upload and signed document access using real authenticated roles in the test project.
- Mobile recovery emails use the configured web site; finish recovery in the web account page.
- Use public anon/publishable client keys in web/mobile environment files. Never put a service-role key in a client build.

The application refreshes worklists periodically and after its own writes. Realtime publication setup is not required for these workflows.

## 4. Bootstrap the first operator

Create a personal account through the app using the **Institution staff / owner** purpose and verify its email. In the privileged SQL editor, look up the account:

```sql
SELECT id, email, email_confirmed_at
FROM auth.users
WHERE lower(email) = lower('operator@example.com');
```

After verifying that it is your intended operator, replace the UUID below and execute:

```sql
INSERT INTO careline_private.operators(user_id)
VALUES ('REPLACE-WITH-VERIFIED-AUTH-USER-UUID'::uuid)
ON CONFLICT DO NOTHING;
```

Refresh access or sign in again. Apply for an institution from **Institutions**, verify its real registration details, and approve it as the operator. Approval activates its owner as facility administrator.

For an existing institution whose owner is missing, review the actual institution and intended administrator, then explicitly bootstrap that membership in a transaction:

```sql
BEGIN;
UPDATE public.facilities
SET status = 'active', owner_id = 'REVIEWED-ADMIN-AUTH-UUID'::uuid
WHERE id = 'EXISTING-FACILITY-UUID'::uuid;

INSERT INTO public.facility_members(facility_id, user_id, role, active)
VALUES ('EXISTING-FACILITY-UUID'::uuid, 'REVIEWED-ADMIN-AUTH-UUID'::uuid, 'admin', true)
ON CONFLICT (facility_id, user_id) DO UPDATE SET role = 'admin', active = true;
COMMIT;
```

Do not activate all legacy memberships in bulk. The administrator can review them individually in **Team & access**. Keep at least one active administrator.

## 5. Invite staff and link patients

Save invitations with the colleague's real email and role. The colleague registers as staff, verifies that email, signs in, and refreshes access. Invitations expire after seven days. The app saves invitations; it does not send invitation emails automatically. Previously inactive memberships require explicit administrator activation.

For existing patients, register the personal account with **I already have a Careline patient card**, then request linking from **My care**. A facility administrator verifies identity in person before approving the link. The application will not merge two existing patient records automatically.

For a new patient without a portal, staff can register names and available information directly. Do not invent birth dates or blood groups. Shared family contact numbers are allowed.

## 6. Configure and build clients

Root `.env`:

```text
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-PUBLIC-CLIENT-KEY
```

Mobile `ecomedik-mobile/.env`:

```text
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-PUBLIC-CLIENT-KEY
```

Rebuild clients after environment changes. Web: `npm ci`, `npm run check`, deploy `dist/` to HTTPS static hosting with SPA routing. Mobile: install dependencies in its directory, export both platform bundles, and use the existing Expo project to build signed device packages.

## 7. Complete acceptance testing

Follow [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md). Verify real authentication, role denial, document access, and native printing before rollout. Keep a tested backup/restore procedure.

Offline support is limited to consented encrypted intake drafts in an already-open web session. Keys live in session storage; closing that session can make drafts unrecoverable. Retain source notes until syncing succeeds. Other web writes and all native writes require connectivity. This is not a fully offline application.

FCFA mobile-money references record receipts entered by staff; they are not integrated operator payment verification. Clinical decisions and interpretation require the care team's review.
