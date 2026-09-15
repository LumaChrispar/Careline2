# Staff access and patient handovers

## Signup and login

Public signup asks for first name, last name, email or Cameroon phone, and a password. The optional existing-card checkbox prevents a second patient record; the institution still verifies identity before linking the existing record. There is no public staff-role or account-purpose selector.

An institution administrator adds staff in Team & access after confirming employment. A private setup link opens a form tied to the invited email. New staff choose their own password and verify that email. Returning staff use ordinary login and are routed using the server-owned membership. Existing account holders need no second account. No administrator learns the staff member's password.

Invitations expire after seven days, can be revoked, and get a new random setup code when renewed. Knowing a setup code alone does not grant staff access: the email must be verified by Auth and an administrator-issued invitation must still be valid. Signup metadata never sets staff roles. Disabled memberships require explicit administrator reactivation.

Web links use `/activate?code=…`; the installed Expo app handles `careline://staff-activate?code=…`. Share links directly with the invited person. The app provides copy/share actions; it does not send emails automatically. Rebuild the native binary to register the URL scheme and test the actual delivery channel on devices.

## Staff badge

Each institution membership gets a stable badge ID. The account screen shows the person's name, institution, responsibility, and active membership; administrators also see badges in their team list. A badge identifies institution access. It is not a medical-license verification or a replacement for checking a person's professional credentials.

## Responsible clinician and referrals

Nurses, doctors and administrators can assign an active local clinician to an open visit. Registration by a nurse does not label that nurse as the patient's doctor. Assignments use version checks to prevent overwriting a colleague's newer change. A clinician starting an unassigned consultation becomes its responsible clinician.

A consented referral records the originating institution, referring colleague and role, and most recently recorded responsible clinician at that institution, alongside the staff-entered handover summary. These names are snapshots of the referral event. Historical records without a reliable assignment display “Not recorded.”

After accepting a referral, the receiving care team assigns its own clinician. A new arrival at that institution inherits an active clinician assigned to its most recent accepted referral. Both institutions can see the referral's receiving clinician. Their other consultation records remain private under existing facility permissions. This does not automatically share the patient's complete history with every institution.

## Validation

Five PostgreSQL tests cover administrator-only invitations, private activation lookup, verified email, stable badges, inactive memberships, rotated/revoked codes, clinician assignment permissions/version checks, and consented referral attribution with consultation isolation. Browser tests exercise simplified signup, private setup, administrator invitation/revocation, and receiving clinician assignment. Physical-device link handling and hosted email verification remain pilot checks.
