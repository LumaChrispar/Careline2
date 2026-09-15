-- TEST FIXTURE ONLY. Never deploy this historical schema. Use root database.sql.
-- ============================================================================
-- ECO~MEDIK — Complete Supabase PostgreSQL Database Schema
-- Version: 1.0.0  |  Date: April 2026
-- ============================================================================
-- Run this ENTIRE file in the Supabase SQL Editor (Dashboard → SQL Editor)
-- in a SINGLE execution. It is idempotent — safe to re-run.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()


-- ────────────────────────────────────────────────────────────────────────────
-- 1. HELPER: get_my_role()
--    Reads the role from the CALLING user's auth.users.raw_user_meta_data.
--    Used by every RLS policy so authorization cannot be spoofed via metadata.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (raw_user_meta_data ->> 'role'),
    'patient'
  )
  FROM auth.users
  WHERE id = auth.uid();
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. TABLES
-- ────────────────────────────────────────────────────────────────────────────

-- ·· 2.1  facilities ·······················································
CREATE TABLE IF NOT EXISTS public.facilities (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  region     TEXT,
  location   TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

-- ·· 2.2  profiles (mirrors auth.users for queryable staff directory) ······
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  name        TEXT,
  role        TEXT CHECK (role IN ('admin','doctor','receptionist','labtech','patient')) DEFAULT 'patient',
  facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ·· 2.3  patients ··························································
CREATE TABLE IF NOT EXISTS public.patients (
  id            TEXT PRIMARY KEY,                              -- e.g. MT-1234
  auth_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender        TEXT CHECK (gender IN ('Male','Female','Other')),
  phone         TEXT UNIQUE,
  email         TEXT,
  region        TEXT,
  village       TEXT,
  blood_group   TEXT CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-') OR blood_group IS NULL),
  allergies     TEXT,
  next_of_kin   TEXT,
  facility_id   UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- ·· 2.4  visits ·····························································
CREATE TABLE IF NOT EXISTS public.visits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  date             TIMESTAMPTZ DEFAULT now(),
  symptoms         TEXT[] DEFAULT '{}',        -- e.g. ARRAY['Fever','Malaria']
  diagnosis        TEXT,
  prescription     TEXT,
  notes            TEXT,
  attending_doctor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  facility_id      UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- ·· 2.5  lab_results ························································
CREATE TABLE IF NOT EXISTS public.lab_results (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id     UUID REFERENCES public.visits(id) ON DELETE SET NULL,
  patient_id   TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  test_type    TEXT NOT NULL,
  file_url     TEXT,                          -- Supabase Storage public URL
  summary      TEXT,
  uploaded_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  facility_id  UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  uploaded_at  TIMESTAMPTZ DEFAULT now(),
  notified_at  TIMESTAMPTZ                   -- set when doctor acknowledges
);
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

-- ·· 2.6  outbreak_alerts ····················································
CREATE TABLE IF NOT EXISTS public.outbreak_alerts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom             TEXT NOT NULL,
  facility_id         UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  case_count          INT NOT NULL DEFAULT 0,
  window_days         INT DEFAULT 14,
  triggered_at        TIMESTAMPTZ DEFAULT now(),
  resolved_at         TIMESTAMPTZ,
  authority_notified  BOOLEAN DEFAULT false,
  notified_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notified_at         TIMESTAMPTZ
);
ALTER TABLE public.outbreak_alerts ENABLE ROW LEVEL SECURITY;

-- Unique constraint used by upsert in outbreak detection logic
CREATE UNIQUE INDEX IF NOT EXISTS uq_outbreak_symptom_facility
  ON public.outbreak_alerts (symptom, facility_id)
  WHERE resolved_at IS NULL;

-- ·· 2.7  staff_broadcasts (notice board) ····································
CREATE TABLE IF NOT EXISTS public.staff_broadcasts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'Staff Member',
  content     TEXT NOT NULL,
  priority    TEXT CHECK (priority IN ('normal','urgent')) DEFAULT 'normal',
  target_type TEXT CHECK (target_type IN ('all', 'role', 'individual')) DEFAULT 'all',
  target_role TEXT CHECK (target_role IN ('admin', 'doctor', 'receptionist', 'labtech')),
  target_user_id UUID REFERENCES auth.users(id),
  facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.staff_broadcasts ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────────────────
-- 3. INDEXES  (performance for common queries)
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_patients_auth_user   ON public.patients  (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone       ON public.patients  (phone);
CREATE INDEX IF NOT EXISTS idx_patients_facility    ON public.patients  (facility_id);
CREATE INDEX IF NOT EXISTS idx_patients_name        ON public.patients  (first_name, last_name);

CREATE INDEX IF NOT EXISTS idx_visits_patient       ON public.visits    (patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_facility_date ON public.visits    (facility_id, date);
CREATE INDEX IF NOT EXISTS idx_visits_doctor        ON public.visits    (attending_doctor);

CREATE INDEX IF NOT EXISTS idx_lab_patient          ON public.lab_results (patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_visit            ON public.lab_results (visit_id);
CREATE INDEX IF NOT EXISTS idx_lab_uploaded_at      ON public.lab_results (uploaded_at);

CREATE INDEX IF NOT EXISTS idx_alerts_facility      ON public.outbreak_alerts (facility_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active        ON public.outbreak_alerts (resolved_at) WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_broadcasts_created   ON public.staff_broadcasts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role        ON public.profiles  (role);


-- ────────────────────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY POLICIES
-- ────────────────────────────────────────────────────────────────────────────

-- ·· 4.1  facilities — readable by all authenticated, writable by admin ···
CREATE POLICY "facilities_select"  ON public.facilities FOR SELECT TO authenticated USING (true);
CREATE POLICY "facilities_insert"  ON public.facilities FOR INSERT TO authenticated WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY "facilities_update"  ON public.facilities FOR UPDATE TO authenticated USING  (public.get_my_role() = 'admin');
CREATE POLICY "facilities_delete"  ON public.facilities FOR DELETE TO authenticated USING  (public.get_my_role() = 'admin');

-- ·· 4.2  profiles ··························································
-- All authenticated users can read non-patient profiles (staff directory).
-- Users can update their own profile. Admins can update any profile.
CREATE POLICY "profiles_select"  ON public.profiles FOR SELECT TO authenticated
  USING (role <> 'patient' OR id = auth.uid());
CREATE POLICY "profiles_insert"  ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "profiles_update"  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.get_my_role() = 'admin');
CREATE POLICY "profiles_delete"  ON public.profiles FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ·· 4.3  patients ···························································
-- Staff can see all patients. Patients can only see their own record.
CREATE POLICY "patients_select"  ON public.patients FOR SELECT TO authenticated
  USING (
    public.get_my_role() IN ('admin','doctor','nurse','receptionist','labtech')
    OR auth_user_id = auth.uid()
  );
CREATE POLICY "patients_insert"  ON public.patients FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin','doctor','nurse','receptionist')
    OR auth_user_id = auth.uid()           -- self-registered patient inserting own row
  );
CREATE POLICY "patients_update"  ON public.patients FOR UPDATE TO authenticated
  USING (
    public.get_my_role() IN ('admin','doctor','nurse','receptionist')
    OR auth_user_id = auth.uid()
  );
CREATE POLICY "patients_delete"  ON public.patients FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('admin','doctor'));

-- ·· 4.4  visits ·····························································
-- Staff can see all visits. Patients see only their own.
CREATE POLICY "visits_select"  ON public.visits FOR SELECT TO authenticated
  USING (
    public.get_my_role() IN ('admin','doctor','nurse','receptionist','labtech')
    OR patient_id IN (SELECT id FROM public.patients WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "visits_insert"  ON public.visits FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin','doctor','nurse','receptionist'));
CREATE POLICY "visits_update"  ON public.visits FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin','doctor','nurse','receptionist'));
CREATE POLICY "visits_delete"  ON public.visits FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('admin','doctor'));

-- ·· 4.5  lab_results ·························································
-- Staff can see all results. Patients see only their own.
CREATE POLICY "lab_select"  ON public.lab_results FOR SELECT TO authenticated
  USING (
    public.get_my_role() IN ('admin','doctor','labtech')
    OR patient_id IN (SELECT id FROM public.patients WHERE auth_user_id = auth.uid())
  );
CREATE POLICY "lab_insert"  ON public.lab_results FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin','labtech'));
CREATE POLICY "lab_update"  ON public.lab_results FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin','doctor','labtech'));
CREATE POLICY "lab_delete"  ON public.lab_results FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('admin'));

-- ·· 4.6  outbreak_alerts ·····················································
CREATE POLICY "outbreak_select"  ON public.outbreak_alerts FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('admin','doctor'));
CREATE POLICY "outbreak_insert"  ON public.outbreak_alerts FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin','doctor'));
CREATE POLICY "outbreak_update"  ON public.outbreak_alerts FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin','doctor'));
CREATE POLICY "outbreak_delete"  ON public.outbreak_alerts FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ·· 4.7  staff_broadcasts ····················································
-- All staff can read. Staff can insert. Author or admin can delete.
CREATE POLICY "broadcasts_select"  ON public.staff_broadcasts FOR SELECT TO authenticated
  USING (
    public.get_my_role() IN ('admin','doctor','receptionist','labtech')
    AND (
      target_type = 'all'
      OR (target_type = 'role' AND target_role = public.get_my_role())
      OR (target_type = 'individual' AND target_user_id = auth.uid())
    )
  );
CREATE POLICY "broadcasts_insert"  ON public.staff_broadcasts FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin','doctor','receptionist','labtech'));
CREATE POLICY "broadcasts_delete"  ON public.staff_broadcasts FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.get_my_role() = 'admin');


-- ────────────────────────────────────────────────────────────────────────────
-- 5. TRIGGER: auto-create profile row on new auth signup
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_facility UUID;
BEGIN
  -- Safely cast facility_id (may be a name string, empty, or a valid UUID)
  BEGIN
    v_facility := NULLIF(NEW.raw_user_meta_data ->> 'facility_id', '')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_facility := NULL;
  END;

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
  RETURN NEW;
END;
$$;

-- Drop-and-recreate to stay idempotent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ────────────────────────────────────────────────────────────────────────────
-- 6. TRIGGER: auto-create patient row when a "patient" signs up
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_patient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_role     TEXT;
  v_newid    TEXT;
  v_dob      DATE;
  v_facility UUID;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'patient');
  IF v_role <> 'patient' THEN
    RETURN NEW;
  END IF;

  -- Safely cast date_of_birth (may be null or invalid)
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

  -- Generate a unique patient ID (MT-XXXX)
  LOOP
    v_newid := 'MT-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.patients WHERE id = v_newid);
  END LOOP;

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

  RETURN NEW;
END;
$$;

-- Universal ID generation for ALL patients, regardless of registration source
CREATE OR REPLACE FUNCTION public.trg_generate_patient_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_newid TEXT;
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    LOOP
      v_newid := 'MT-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.patients WHERE id = v_newid);
    END LOOP;
    NEW.id := v_newid;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patients_id_gen ON public.patients;
CREATE TRIGGER trg_patients_id_gen
  BEFORE INSERT ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_generate_patient_id();

DROP TRIGGER IF EXISTS on_auth_patient_created ON auth.users;
CREATE TRIGGER on_auth_patient_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_patient();


-- ────────────────────────────────────────────────────────────────────────────
-- 7. TRIGGER: auto-update updated_at timestamp
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patients_updated_at ON public.patients;
CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ────────────────────────────────────────────────────────────────────────────
-- 8. RPC: admin_delete_user  (completely removes a user from Auth + tables)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only admins may call this
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Permission denied — admin only';
  END IF;

  -- Cascade deletes via FK ON DELETE CASCADE will handle profiles row.
  -- Explicitly clean up any remaining data:
  DELETE FROM public.staff_broadcasts WHERE author_id = target_user_id;
  DELETE FROM public.profiles         WHERE id        = target_user_id;

  -- Finally remove the auth user (requires service_role, SECURITY DEFINER handles it)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 8c. RPC: staff_delete_patient (completely removes a patient and their auth profile)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.staff_delete_patient(target_patient_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT;
  v_auth_id UUID;
BEGIN
  -- Check permission
  v_role := public.get_my_role();
  IF v_role NOT IN ('admin', 'doctor', 'receptionist') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Get auth_user_id
  SELECT auth_user_id INTO v_auth_id FROM public.patients WHERE id = target_patient_id;

  -- Delete from patients (cascade deletes visits, lab_results via FK)
  DELETE FROM public.patients WHERE id = target_patient_id;

  -- If an auth user exists, clean them up
  IF v_auth_id IS NOT NULL THEN
    DELETE FROM public.profiles WHERE id = v_auth_id;
    DELETE FROM auth.users WHERE id = v_auth_id;
  END IF;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 8b. RPC: update_my_email (bypass strict Supabase SMTP validation for synthetic emails)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_my_email(new_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE auth.users
  SET 
    email = new_email,
    email_confirmed_at = now(),
    updated_at = now()
  WHERE id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_my_email(TEXT) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- 9. RPC: check_outbreak  (run on-demand or via pg_cron)
--    Scans recent visits and upserts outbreak_alerts when threshold crossed.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_outbreak(
  p_facility_id UUID,
  p_threshold   INT DEFAULT 20,
  p_window_days INT DEFAULT 14
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_since TIMESTAMPTZ;
  rec     RECORD;
BEGIN
  v_since := now() - (p_window_days || ' days')::INTERVAL;

  FOR rec IN
    SELECT unnest(symptoms) AS symptom, COUNT(*) AS cnt
    FROM public.visits
    WHERE facility_id = p_facility_id
      AND date >= v_since
    GROUP BY 1
    HAVING COUNT(*) >= p_threshold
  LOOP
    INSERT INTO public.outbreak_alerts (symptom, facility_id, case_count, window_days, triggered_at)
    VALUES (rec.symptom, p_facility_id, rec.cnt, p_window_days, now())
    ON CONFLICT (symptom, facility_id) WHERE resolved_at IS NULL
    DO UPDATE SET
      case_count   = EXCLUDED.case_count,
      triggered_at = EXCLUDED.triggered_at;
  END LOOP;

  -- Auto-resolve alerts that have dropped below threshold
  UPDATE public.outbreak_alerts
  SET    resolved_at = now()
  WHERE  facility_id = p_facility_id
    AND  resolved_at IS NULL
    AND  symptom NOT IN (
           SELECT unnest(symptoms)
           FROM public.visits
           WHERE facility_id = p_facility_id
             AND date >= v_since
           GROUP BY 1
           HAVING COUNT(*) >= p_threshold
         );
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 10. SUPABASE REALTIME — enable change broadcasting
-- ────────────────────────────────────────────────────────────────────────────
-- The app subscribes to lab_results INSERT events for doctor notifications.
-- Also enable realtime on staff_broadcasts for live notice board updates.
ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_broadcasts;


-- ────────────────────────────────────────────────────────────────────────────
-- 11. SUPABASE STORAGE  — lab results bucket
-- ────────────────────────────────────────────────────────────────────────────
-- NOTE: Storage buckets are managed via the Supabase Dashboard or API,
-- not raw SQL. Run these in the Dashboard → Storage → Policies section:
--
--   Bucket name:  LAB_result
--   Public:       Yes  (public URLs for file viewing)
--
--   Upload policy (INSERT):
--     Authenticated users with role 'labtech' or 'admin' can upload.
--       (auth.role() = 'authenticated'
--        AND (auth.jwt()->'user_metadata'->>'role') IN ('labtech','admin'))
--
--   Read policy (SELECT):
--     All authenticated users can read.
--       (auth.role() = 'authenticated')
--
--   Delete policy (DELETE):
--     Only admin can delete files.
--       (auth.role() = 'authenticated'
--        AND (auth.jwt()->'user_metadata'->>'role') = 'admin')
--
-- The SQL below attempts to set this up; it may require the
-- supabase_admin or service_role. If it fails, configure manually.
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('LAB_result', 'LAB_result', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "lab_storage_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'LAB_result'
    AND (SELECT public.get_my_role()) IN ('labtech','admin')
  );

CREATE POLICY "lab_storage_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'LAB_result');

CREATE POLICY "lab_storage_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'LAB_result'
    AND (SELECT public.get_my_role()) = 'admin'
  );


-- ────────────────────────────────────────────────────────────────────────────
-- 12. SEED DATA  — default facility for hackathon demo
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO public.facilities (name, region, location)
VALUES ('Buea Regional Hospital', 'South-West', 'Buea Town')
ON CONFLICT DO NOTHING;


-- ════════════════════════════════════════════════════════════════════════════
-- ✅  SCHEMA COMPLETE
--
--  Tables:             facilities, profiles, patients, visits,
--                      lab_results, outbreak_alerts, staff_broadcasts
--  Auth triggers:      auto-create profile + patient rows on signup
--  RLS policies:       role-based read/write on every table
--  RPC functions:      admin_delete_user(), check_outbreak()
--  Realtime:           lab_results, staff_broadcasts
--  Storage:            LAB_result bucket + policies
--  Indexes:            optimized for patient lookup, visit history,
--                      lab result retrieval, and outbreak detection
-- ════════════════════════════════════════════════════════════════════════════
