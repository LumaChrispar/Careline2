-- ============================================================================
-- FIX: Drop and re-create auth triggers with full error safety
-- Run this ALONE in Supabase SQL Editor
-- ============================================================================

-- 1. Kill existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created   ON auth.users;
DROP TRIGGER IF EXISTS on_auth_patient_created ON auth.users;

-- 2. Bulletproof profile creation (catches ALL errors)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_facility UUID := NULL;
BEGIN
  -- Safely try to cast facility_id to UUID
  BEGIN
    v_facility := NULLIF(NEW.raw_user_meta_data ->> 'facility_id', '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_facility := NULL;
  END;

  BEGIN
    INSERT INTO public.profiles (id, email, name, role, facility_id)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
      COALESCE(NEW.raw_user_meta_data ->> 'role', 'patient'),
      v_facility
    )
    ON CONFLICT (id) DO UPDATE SET
      email       = EXCLUDED.email,
      name        = EXCLUDED.name,
      role        = EXCLUDED.role,
      facility_id = EXCLUDED.facility_id,
      updated_at  = now();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- 3. Bulletproof patient record creation (catches ALL errors)
CREATE OR REPLACE FUNCTION public.handle_new_patient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role     TEXT;
  v_newid    TEXT;
  v_dob      DATE := NULL;
  v_facility UUID := NULL;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'patient');

  -- Only run for patients
  IF v_role <> 'patient' THEN
    RETURN NEW;
  END IF;

  -- Safely cast date_of_birth
  BEGIN
    v_dob := (NEW.raw_user_meta_data ->> 'date_of_birth')::DATE;
  EXCEPTION WHEN OTHERS THEN
    v_dob := NULL;
  END;

  -- Safely cast facility_id
  BEGIN
    v_facility := NULLIF(NEW.raw_user_meta_data ->> 'facility_id', '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_facility := NULL;
  END;

  -- Generate unique patient ID
  LOOP
    v_newid := 'MT-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.patients WHERE id = v_newid);
  END LOOP;

  BEGIN
    INSERT INTO public.patients (
      id, auth_user_id, first_name, last_name, date_of_birth,
      gender, phone, email, region, village,
      blood_group, allergies, next_of_kin, facility_id
    )
    VALUES (
      v_newid,
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
      COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
      v_dob,
      NEW.raw_user_meta_data ->> 'gender',
      NEW.raw_user_meta_data ->> 'phone',
      NEW.email,
      NEW.raw_user_meta_data ->> 'region',
      NEW.raw_user_meta_data ->> 'village',
      NEW.raw_user_meta_data ->> 'blood_group',
      NEW.raw_user_meta_data ->> 'allergies',
      NEW.raw_user_meta_data ->> 'next_of_kin',
      v_facility
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_patient failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- 4. Re-attach triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_patient_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_patient();
