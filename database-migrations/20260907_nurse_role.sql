-- Apply after database.sql in the Supabase SQL editor.
-- This adds nurse to existing role constraints; it does not provision accounts.
BEGIN;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'doctor', 'nurse', 'receptionist', 'labtech', 'patient'));
ALTER TABLE public.staff_broadcasts DROP CONSTRAINT IF EXISTS staff_broadcasts_target_role_check;
ALTER TABLE public.staff_broadcasts ADD CONSTRAINT staff_broadcasts_target_role_check
  CHECK (target_role IN ('admin', 'doctor', 'nurse', 'receptionist', 'labtech'));
COMMIT;
