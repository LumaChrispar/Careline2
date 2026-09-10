-- Careline 2: fresh installation or upgrade from ECO~MEDIK. See docs/DEPLOYMENT.md.
-- Atomic, repeatable. Existing staff require explicit review before activation.
BEGIN;
CREATE SCHEMA IF NOT EXISTS careline_private;
REVOKE ALL ON SCHEMA careline_private FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public.facilities (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, region text, location text, created_at timestamptz DEFAULT now());
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS facility_type text NOT NULL DEFAULT 'health_centre';
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS services text NOT NULL DEFAULT '';
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS opening_hours text NOT NULL DEFAULT '';
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS registration_number text;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
CREATE TABLE IF NOT EXISTS public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id), email text, name text, role text DEFAULT 'patient', facility_id uuid REFERENCES public.facilities(id), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
CREATE TABLE IF NOT EXISTS careline_private.operators (user_id uuid PRIMARY KEY REFERENCES auth.users(id));
CREATE TABLE IF NOT EXISTS public.facility_members (
  facility_id uuid REFERENCES public.facilities(id), user_id uuid REFERENCES public.profiles(id),
  role text NOT NULL CHECK(role IN ('admin','doctor','nurse','labtech','pharmacist')),
  active boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(facility_id,user_id)
);
INSERT INTO public.facility_members(facility_id,user_id,role)
SELECT facility_id,id,CASE WHEN role='receptionist' THEN 'nurse' ELSE role END FROM public.profiles
WHERE facility_id IS NOT NULL AND role IN ('admin','doctor','nurse','receptionist','labtech','pharmacist') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), facility_id uuid NOT NULL REFERENCES public.facilities(id),
  email text NOT NULL, role text NOT NULL CHECK(role IN ('admin','doctor','nurse','labtech','pharmacist')),
  invited_by uuid NOT NULL REFERENCES auth.users(id), accepted_at timestamptz, expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',
  UNIQUE(facility_id,email)
);
CREATE TABLE IF NOT EXISTS public.patients (
 id text PRIMARY KEY DEFAULT ('CL-'||gen_random_uuid()::text), auth_user_id uuid REFERENCES auth.users(id),
 first_name text NOT NULL, last_name text NOT NULL, date_of_birth date, gender text, phone text, email text,
 region text, village text, blood_group text, allergies text, next_of_kin text, facility_id uuid REFERENCES public.facilities(id),
 created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.patients ALTER COLUMN date_of_birth DROP NOT NULL;
ALTER TABLE public.patients ALTER COLUMN id SET DEFAULT ('CL-'||gen_random_uuid()::text);
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_phone_key;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS birth_date_accuracy text NOT NULL DEFAULT 'unknown';
CREATE TABLE IF NOT EXISTS public.patient_facilities (
 patient_id text REFERENCES public.patients(id), facility_id uuid REFERENCES public.facilities(id),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(patient_id,facility_id)
);
INSERT INTO public.patient_facilities SELECT id,facility_id,now() FROM public.patients WHERE facility_id IS NOT NULL ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.visits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id text NOT NULL REFERENCES public.patients(id), date timestamptz DEFAULT now(),
 symptoms text[] DEFAULT '{}', diagnosis text, prescription text, notes text, attending_doctor uuid REFERENCES auth.users(id),
 facility_id uuid REFERENCES public.facilities(id), created_at timestamptz DEFAULT now()
);
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed';
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'routine';
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS follow_up_date date;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX IF NOT EXISTS careline_one_open_visit ON public.visits(patient_id,facility_id) WHERE status IN ('waiting','triage','consultation','awaiting_tests');
CREATE TABLE IF NOT EXISTS public.observations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), visit_id uuid NOT NULL REFERENCES public.visits(id), patient_id text NOT NULL REFERENCES public.patients(id),
 facility_id uuid NOT NULL REFERENCES public.facilities(id), temperature numeric, systolic integer, diastolic integer, pulse integer, weight numeric, spo2 numeric,
 notes text, recorded_by uuid NOT NULL REFERENCES auth.users(id), recorded_at timestamptz NOT NULL DEFAULT now(),
 CHECK(temperature IS NULL OR temperature BETWEEN 20 AND 50), CHECK(systolic IS NULL OR systolic BETWEEN 20 AND 350),
 CHECK(diastolic IS NULL OR diastolic BETWEEN 10 AND 250), CHECK(pulse IS NULL OR pulse BETWEEN 10 AND 350),
 CHECK(weight IS NULL OR weight>0), CHECK(spo2 IS NULL OR spo2 BETWEEN 0 AND 100)
);
CREATE TABLE IF NOT EXISTS public.lab_results (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), visit_id uuid REFERENCES public.visits(id), patient_id text NOT NULL REFERENCES public.patients(id),
 test_type text NOT NULL, file_url text, summary text, uploaded_by uuid REFERENCES auth.users(id), facility_id uuid REFERENCES public.facilities(id),
 uploaded_at timestamptz DEFAULT now(), notified_at timestamptz
);
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES auth.users(id);
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS specimen_reference text;
UPDATE public.lab_results SET status=CASE WHEN notified_at IS NOT NULL THEN 'reviewed' WHEN nullif(trim(summary),'') IS NOT NULL THEN 'completed' ELSE 'requested' END WHERE status IS NULL;
ALTER TABLE public.lab_results ALTER COLUMN status SET DEFAULT 'requested';
ALTER TABLE public.lab_results ALTER COLUMN status SET NOT NULL;
-- Retain old file references; private access is resolved by the client, never served publicly.
UPDATE public.lab_results SET storage_path=split_part(file_url,'/storage/v1/object/public/LAB_result/',2)
WHERE storage_path IS NULL AND file_url LIKE '%/storage/v1/object/public/LAB_result/%';
CREATE TABLE IF NOT EXISTS public.prescriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id text NOT NULL REFERENCES public.patients(id), visit_id uuid REFERENCES public.visits(id),
 facility_id uuid NOT NULL REFERENCES public.facilities(id), pharmacy_id uuid REFERENCES public.facilities(id), medication text NOT NULL,
 instructions text NOT NULL, quantity integer NOT NULL CHECK(quantity>0), starts_on date NOT NULL DEFAULT current_date, ends_on date,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','stopped','completed')), prescribed_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_on IS NULL OR ends_on>=starts_on)
);
CREATE TABLE IF NOT EXISTS public.stock_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), facility_id uuid NOT NULL REFERENCES public.facilities(id), medication text NOT NULL,
 batch_number text NOT NULL, expires_on date NOT NULL, quantity integer NOT NULL CHECK(quantity>=0), unit_price integer NOT NULL CHECK(unit_price>=0),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(facility_id,medication,batch_number)
);
CREATE TABLE IF NOT EXISTS public.dispensings (
 id uuid PRIMARY KEY, prescription_id uuid NOT NULL REFERENCES public.prescriptions(id), batch_id uuid NOT NULL REFERENCES public.stock_batches(id),
 facility_id uuid NOT NULL REFERENCES public.facilities(id), patient_id text NOT NULL REFERENCES public.patients(id),
 quantity integer NOT NULL CHECK(quantity>0), unit_price integer NOT NULL, dispensed_by uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.appointments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id text NOT NULL REFERENCES public.patients(id), facility_id uuid NOT NULL REFERENCES public.facilities(id),
 scheduled_at timestamptz NOT NULL, reason text NOT NULL, status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','confirmed','arrived','cancelled','missed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.referrals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id text NOT NULL REFERENCES public.patients(id), facility_id uuid NOT NULL REFERENCES public.facilities(id),
 target_facility_id uuid NOT NULL REFERENCES public.facilities(id), reason text NOT NULL, consent_recorded boolean NOT NULL CHECK(consent_recorded),
 status text NOT NULL DEFAULT 'sent' CHECK(status IN ('sent','accepted','declined','completed')), created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(facility_id<>target_facility_id)
);
CREATE TABLE IF NOT EXISTS public.invoices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id text NOT NULL REFERENCES public.patients(id), facility_id uuid NOT NULL REFERENCES public.facilities(id),
 description text NOT NULL, total integer NOT NULL CHECK(total>0), status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','paid','void')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.payments (
 id uuid PRIMARY KEY, invoice_id uuid NOT NULL REFERENCES public.invoices(id), patient_id text NOT NULL REFERENCES public.patients(id),
 facility_id uuid NOT NULL REFERENCES public.facilities(id), amount integer NOT NULL CHECK(amount>0),
 method text NOT NULL CHECK(method IN ('cash','mtn_momo','orange_money')), reference text, received_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(method='cash' OR nullif(trim(reference),'') IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS careline_payment_reference ON public.payments(facility_id,method,reference) WHERE method<>'cash';
CREATE TABLE IF NOT EXISTS public.outbreak_alerts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), symptom text NOT NULL, facility_id uuid REFERENCES public.facilities(id), case_count integer DEFAULT 0, window_days integer DEFAULT 14, triggered_at timestamptz DEFAULT now(), resolved_at timestamptz, authority_notified boolean DEFAULT false, notified_by uuid REFERENCES auth.users(id), notified_at timestamptz);
CREATE TABLE IF NOT EXISTS public.staff_broadcasts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),author_id uuid REFERENCES auth.users(id),author_name text NOT NULL DEFAULT 'Staff',content text NOT NULL,priority text DEFAULT 'normal',target_type text DEFAULT 'all',target_role text,target_user_id uuid REFERENCES auth.users(id),facility_id uuid REFERENCES public.facilities(id),created_at timestamptz DEFAULT now());
ALTER TABLE public.staff_broadcasts DROP CONSTRAINT IF EXISTS staff_broadcasts_target_role_check;
CREATE TABLE IF NOT EXISTS public.audit_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid, facility_id uuid, entity text NOT NULL, entity_id text,
 action text NOT NULL, changed_fields text[], created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.record_links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id text NOT NULL REFERENCES public.patients(id), requested_by uuid NOT NULL REFERENCES auth.users(id),
 facility_id uuid NOT NULL REFERENCES public.facilities(id), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(patient_id,requested_by)
);

CREATE OR REPLACE FUNCTION public.careline_operator() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM careline_private.operators WHERE user_id=auth.uid()); $$;
CREATE OR REPLACE FUNCTION public.careline_role(f uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT m.role FROM public.facility_members m JOIN public.facilities x ON x.id=m.facility_id
 WHERE m.user_id=auth.uid() AND m.facility_id=f AND m.active AND x.status='active'; $$;
CREATE OR REPLACE FUNCTION public.get_my_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(public.careline_role((SELECT facility_id FROM public.profiles WHERE id=auth.uid())),'patient'); $$;
CREATE OR REPLACE FUNCTION public.careline_owns(p text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.patients WHERE id=p AND auth_user_id=auth.uid()); $$;
CREATE OR REPLACE FUNCTION public.careline_patient_access(p text,f uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.careline_role(f) IS NOT NULL AND EXISTS(SELECT 1 FROM public.patient_facilities WHERE patient_id=p AND facility_id=f); $$;

-- Remove every historical policy on Careline-owned tables. Restrict grants as well as rows.
DO $$ DECLARE t text; pol record; BEGIN
 FOREACH t IN ARRAY ARRAY['facilities','profiles','facility_members','staff_invitations','patients','patient_facilities','visits','observations','lab_results','prescriptions','stock_batches','dispensings','appointments','referrals','invoices','payments','outbreak_alerts','staff_broadcasts','audit_events','record_links'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP EXECUTE format('DROP POLICY %I ON public.%I',pol.policyname,t); END LOOP;
  EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 END LOOP;
END $$;
GRANT UPDATE(name) ON public.profiles TO authenticated;
GRANT INSERT ON public.patients,public.visits,public.lab_results,public.staff_broadcasts,public.outbreak_alerts TO authenticated;
GRANT UPDATE(first_name,last_name,date_of_birth,gender,phone,email,region,village,blood_group,allergies,next_of_kin,birth_date_accuracy) ON public.patients TO authenticated;
GRANT UPDATE(diagnosis,prescription,notes,symptoms,follow_up_date) ON public.visits TO authenticated;
GRANT UPDATE(summary,notified_at,specimen_reference) ON public.lab_results TO authenticated;
GRANT UPDATE(resolved_at,case_count) ON public.outbreak_alerts TO authenticated;
CREATE POLICY facility_read ON public.facilities FOR SELECT TO authenticated USING(status='active' OR owner_id=auth.uid() OR public.careline_operator() OR EXISTS(SELECT 1 FROM public.facility_members m WHERE m.facility_id=id AND m.user_id=auth.uid()));
CREATE POLICY profile_read ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid() OR EXISTS(SELECT 1 FROM public.facility_members m WHERE m.user_id=profiles.id AND public.careline_role(m.facility_id)='admin'));
CREATE POLICY profile_edit ON public.profiles FOR UPDATE TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());
CREATE POLICY member_read ON public.facility_members FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.careline_role(facility_id)='admin' OR public.careline_operator());
CREATE POLICY invitation_read ON public.staff_invitations FOR SELECT TO authenticated USING(public.careline_role(facility_id)='admin');
CREATE POLICY patient_link_read ON public.patient_facilities FOR SELECT TO authenticated USING(public.careline_role(facility_id) IS NOT NULL OR public.careline_owns(patient_id));
CREATE POLICY patient_read ON public.patients FOR SELECT TO authenticated USING(auth_user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.patient_facilities l WHERE l.patient_id=id AND public.careline_role(l.facility_id) IS NOT NULL));
CREATE POLICY patient_create ON public.patients FOR INSERT TO authenticated WITH CHECK(auth_user_id IS NULL AND public.careline_role(facility_id) IN ('admin','nurse','doctor'));
CREATE POLICY patient_edit ON public.patients FOR UPDATE TO authenticated USING(auth_user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.patient_facilities l WHERE l.patient_id=id AND public.careline_role(l.facility_id) IN ('admin','nurse','doctor')));
CREATE POLICY visit_read ON public.visits FOR SELECT TO authenticated USING(public.careline_owns(patient_id) OR public.careline_role(facility_id) IN ('admin','doctor','nurse'));
CREATE POLICY visit_create ON public.visits FOR INSERT TO authenticated WITH CHECK(public.careline_role(facility_id) IN ('admin','doctor') AND public.careline_patient_access(patient_id,facility_id) AND attending_doctor=auth.uid());
CREATE POLICY visit_edit ON public.visits FOR UPDATE TO authenticated USING(public.careline_role(facility_id) IN ('doctor','admin') AND status<>'completed');
CREATE POLICY observation_read ON public.observations FOR SELECT TO authenticated USING(public.careline_owns(patient_id) OR public.careline_role(facility_id) IN ('admin','doctor','nurse'));
CREATE POLICY lab_read ON public.lab_results FOR SELECT TO authenticated USING((public.careline_owns(patient_id) AND status IN ('completed','reviewed')) OR public.careline_role(facility_id) IN ('admin','doctor','nurse','labtech'));
CREATE POLICY lab_create ON public.lab_results FOR INSERT TO authenticated WITH CHECK(public.careline_role(facility_id) IN ('admin','labtech') AND public.careline_patient_access(patient_id,facility_id));
CREATE POLICY lab_edit ON public.lab_results FOR UPDATE TO authenticated USING(public.careline_role(facility_id) IN ('admin','labtech','doctor'));
CREATE POLICY prescription_read ON public.prescriptions FOR SELECT TO authenticated USING(public.careline_owns(patient_id) OR public.careline_role(facility_id) IN ('admin','doctor','nurse','pharmacist') OR public.careline_role(pharmacy_id) IN ('admin','pharmacist'));
CREATE POLICY stock_read ON public.stock_batches FOR SELECT TO authenticated USING(public.careline_role(facility_id) IN ('admin','pharmacist'));
CREATE POLICY dispensing_read ON public.dispensings FOR SELECT TO authenticated USING(public.careline_owns(patient_id) OR public.careline_role(facility_id) IN ('admin','pharmacist') OR EXISTS(SELECT 1 FROM public.prescriptions p WHERE p.id=prescription_id AND public.careline_role(p.facility_id) IN ('doctor','admin')));
CREATE POLICY appointment_read ON public.appointments FOR SELECT TO authenticated USING(public.careline_owns(patient_id) OR public.careline_role(facility_id) IN ('admin','nurse','doctor'));
CREATE POLICY referral_read ON public.referrals FOR SELECT TO authenticated USING(public.careline_owns(patient_id) OR public.careline_role(facility_id) IN ('admin','doctor','nurse') OR public.careline_role(target_facility_id) IN ('admin','doctor','nurse'));
CREATE POLICY invoice_read ON public.invoices FOR SELECT TO authenticated USING(public.careline_owns(patient_id) OR public.careline_role(facility_id) IN ('admin','nurse','pharmacist'));
CREATE POLICY payment_read ON public.payments FOR SELECT TO authenticated USING(public.careline_owns(patient_id) OR public.careline_role(facility_id) IN ('admin','nurse','pharmacist'));
CREATE POLICY outbreak_read ON public.outbreak_alerts FOR SELECT TO authenticated USING(public.careline_role(facility_id) IN ('admin','doctor'));
CREATE POLICY outbreak_create ON public.outbreak_alerts FOR INSERT TO authenticated WITH CHECK(public.careline_role(facility_id) IN ('admin','doctor'));
CREATE POLICY outbreak_edit ON public.outbreak_alerts FOR UPDATE TO authenticated USING(public.careline_role(facility_id) IN ('admin','doctor'));
CREATE POLICY broadcast_read ON public.staff_broadcasts FOR SELECT TO authenticated USING(public.careline_role(facility_id) IS NOT NULL AND (target_type='all' OR target_user_id=auth.uid() OR target_role=public.careline_role(facility_id) OR author_id=auth.uid()));
CREATE POLICY broadcast_create ON public.staff_broadcasts FOR INSERT TO authenticated WITH CHECK(public.careline_role(facility_id) IS NOT NULL AND author_id=auth.uid());
CREATE POLICY audit_read ON public.audit_events FOR SELECT TO authenticated USING(public.careline_role(facility_id)='admin');
CREATE POLICY record_link_read ON public.record_links FOR SELECT TO authenticated USING(requested_by=auth.uid() OR public.careline_role(facility_id) IN ('admin','nurse'));

-- Server-owned account provisioning: signup cannot assign an institution or a staff role.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 INSERT INTO public.profiles(id,email,name,role) VALUES(NEW.id,NEW.email,coalesce(NEW.raw_user_meta_data->>'name',concat_ws(' ',NEW.raw_user_meta_data->>'first_name',NEW.raw_user_meta_data->>'last_name')),'patient') ON CONFLICT(id) DO NOTHING;
 RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.handle_new_patient() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF nullif(trim(NEW.raw_user_meta_data->>'first_name'),'') IS NOT NULL THEN
 INSERT INTO public.patients(auth_user_id,first_name,last_name,phone,email) VALUES(NEW.id,trim(NEW.raw_user_meta_data->>'first_name'),coalesce(trim(NEW.raw_user_meta_data->>'last_name'),''),coalesce(nullif(NEW.phone,''),NEW.raw_user_meta_data->>'phone'),NEW.email);
 END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
DROP TRIGGER IF EXISTS on_auth_patient_created ON auth.users;
CREATE TRIGGER on_auth_patient_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_patient();
DROP TRIGGER IF EXISTS trg_patients_id_gen ON public.patients;
CREATE OR REPLACE FUNCTION public.careline_patient_created() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NEW.facility_id IS NOT NULL THEN INSERT INTO public.patient_facilities(patient_id,facility_id) VALUES(NEW.id,NEW.facility_id) ON CONFLICT DO NOTHING; END IF;
 RETURN NEW; END $$;
DROP TRIGGER IF EXISTS careline_patient_created ON public.patients;
CREATE TRIGGER careline_patient_created AFTER INSERT ON public.patients FOR EACH ROW EXECUTE FUNCTION public.careline_patient_created();

CREATE OR REPLACE FUNCTION public.careline_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE row_data jsonb; fields text[]; BEGIN
 row_data:=to_jsonb(NEW);
 IF TG_OP='UPDATE' THEN SELECT array_agg(key) INTO fields FROM jsonb_each(row_data) WHERE value IS DISTINCT FROM to_jsonb(OLD)->key; END IF;
 INSERT INTO public.audit_events(actor_id,facility_id,entity,entity_id,action,changed_fields)
 VALUES(auth.uid(),nullif(row_data->>'facility_id','')::uuid,TG_TABLE_NAME,coalesce(row_data->>'id',row_data->>'user_id'),TG_OP,fields);
 RETURN NEW; END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['patients','visits','observations','lab_results','prescriptions','stock_batches','dispensings','appointments','referrals','invoices','payments','facility_members','record_links'] LOOP
 EXECUTE format('DROP TRIGGER IF EXISTS careline_audit ON public.%I',t);
 EXECUTE format('CREATE TRIGGER careline_audit AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.careline_audit()',t);
END LOOP; END $$;

-- Retire unsafe destructive and identity-bypass APIs, even if previously granted.
DO $$ DECLARE f record; BEGIN FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('admin_delete_user','staff_delete_patient','update_my_email','check_outbreak') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature); END LOOP; END $$;

CREATE OR REPLACE FUNCTION public.careline_context() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.profiles; chosen uuid; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to continue'; END IF;
 SELECT * INTO p FROM public.profiles WHERE id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Account profile missing. Contact support.'; END IF;
 -- Accept only invitations to an email whose ownership Auth has verified.
 INSERT INTO public.facility_members(facility_id,user_id,role,active)
 SELECT i.facility_id,auth.uid(),i.role,true FROM public.staff_invitations i JOIN auth.users u ON u.id=auth.uid()
 WHERE lower(i.email)=lower(u.email) AND u.email_confirmed_at IS NOT NULL AND u.email NOT LIKE '%@patient.eco-medic.local'
 AND i.accepted_at IS NULL AND i.expires_at>now() ON CONFLICT(facility_id,user_id) DO NOTHING;
 UPDATE public.staff_invitations i SET accepted_at=now() FROM auth.users u WHERE u.id=auth.uid() AND lower(i.email)=lower(u.email) AND u.email_confirmed_at IS NOT NULL AND u.email NOT LIKE '%@patient.eco-medic.local' AND i.expires_at>now() AND i.accepted_at IS NULL;
 chosen:=p.facility_id;
 IF public.careline_role(chosen) IS NULL THEN SELECT m.facility_id INTO chosen FROM public.facility_members m WHERE m.user_id=auth.uid() AND public.careline_role(m.facility_id) IS NOT NULL ORDER BY created_at LIMIT 1; END IF;
 UPDATE public.profiles SET facility_id=chosen WHERE id=auth.uid() AND facility_id IS DISTINCT FROM chosen;
 RETURN jsonb_build_object('name',p.name,'role',coalesce(public.careline_role(chosen),'patient'),'facility_id',chosen,'is_operator',public.careline_operator(),
 'memberships',coalesce((SELECT jsonb_agg(jsonb_build_object('facility_id',m.facility_id,'name',f.name,'facility_type',f.facility_type,'role',m.role)) FROM public.facility_members m JOIN public.facilities f ON f.id=m.facility_id WHERE m.user_id=auth.uid() AND m.active AND f.status='active'),'[]'::jsonb));
END $$;
CREATE OR REPLACE FUNCTION public.careline_switch_facility(f uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF auth.uid() IS NULL OR public.careline_role(f) IS NULL THEN RAISE EXCEPTION 'Facility access denied'; END IF;
 UPDATE public.profiles SET facility_id=f WHERE id=auth.uid(); END $$;
CREATE OR REPLACE FUNCTION public.careline_apply_facility(payload jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE fid uuid; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to apply'; END IF;
 IF nullif(trim(payload->>'name'),'') IS NULL OR nullif(trim(payload->>'registration_number'),'') IS NULL OR payload->>'facility_type' NOT IN ('hospital','health_centre','clinic','laboratory','pharmacy') THEN RAISE EXCEPTION 'Provide facility name, type and registration reference'; END IF;
 IF (SELECT count(*) FROM public.facilities WHERE owner_id=auth.uid() AND status='pending')>=3 THEN RAISE EXCEPTION 'Your applications are awaiting review'; END IF;
 INSERT INTO public.facilities(name,facility_type,region,location,phone,services,opening_hours,registration_number,owner_id)
 VALUES(trim(payload->>'name'),payload->>'facility_type',payload->>'region',payload->>'location',payload->>'phone',coalesce(payload->>'services',''),coalesce(payload->>'opening_hours',''),payload->>'registration_number',auth.uid()) RETURNING id INTO fid;
 INSERT INTO public.facility_members(facility_id,user_id,role) VALUES(fid,auth.uid(),'admin'); RETURN fid; END $$;
CREATE OR REPLACE FUNCTION public.careline_approve_facility(f uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NOT public.careline_operator() THEN RAISE EXCEPTION 'Platform operator required'; END IF;
 UPDATE public.facilities SET status='active' WHERE id=f;
 UPDATE public.facility_members SET active=true WHERE facility_id=f AND user_id=(SELECT owner_id FROM public.facilities WHERE id=f);
 END $$;
CREATE OR REPLACE FUNCTION public.careline_invite_staff(f uuid, staff_email text, staff_role text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF public.careline_role(f) IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Facility administrator required'; END IF;
 IF staff_email NOT LIKE '%@%.%' OR staff_email LIKE '%@patient.eco-medic.local' THEN RAISE EXCEPTION 'Use a real staff email address'; END IF;
 INSERT INTO public.staff_invitations(facility_id,email,role,invited_by) VALUES(f,lower(trim(staff_email)),staff_role,auth.uid())
 ON CONFLICT(facility_id,email) DO UPDATE SET role=excluded.role,accepted_at=NULL,expires_at=now()+interval '7 days'; END $$;
CREATE OR REPLACE FUNCTION public.careline_manage_member(f uuid, member_id uuid, member_role text, enabled boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF public.careline_role(f) IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Facility administrator required'; END IF;
 -- Keep one active administrator; lock the facility to serialize concurrent changes.
 PERFORM 1 FROM public.facilities WHERE id=f FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.facility_members WHERE facility_id=f AND user_id=member_id AND active AND role='admin') AND (NOT enabled OR member_role<>'admin') AND (SELECT count(*) FROM public.facility_members WHERE facility_id=f AND active AND role='admin')<=1 THEN RAISE EXCEPTION 'Keep at least one active administrator'; END IF;
 UPDATE public.facility_members SET role=member_role,active=enabled WHERE facility_id=f AND user_id=member_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Membership not found'; END IF; END $$;

-- One transaction per workflow command. UUID request IDs make offline retries safe.
CREATE OR REPLACE FUNCTION public.careline_command(action text, f uuid, payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r text; pid text; rid uuid; v public.visits; rx public.prescriptions; b public.stock_batches; inv public.invoices; ref public.referrals; link public.record_links; amount integer; paid integer; result jsonb; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to continue'; END IF;
 r:=public.careline_role(f); pid:=payload->>'patient_id'; rid:=coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid());
 IF action='request_link' THEN
  IF NOT EXISTS(SELECT 1 FROM public.patient_facilities WHERE patient_id=pid AND facility_id=f) THEN RAISE EXCEPTION 'Ask the registering facility to confirm your Careline ID'; END IF;
  INSERT INTO public.record_links(patient_id,facility_id,requested_by) VALUES(pid,f,auth.uid()) ON CONFLICT(patient_id,requested_by) DO UPDATE SET status='pending' WHERE record_links.status='rejected';
  RETURN jsonb_build_object('success',true);
 END IF;
 IF action='appointment' AND public.careline_owns(pid) THEN
  IF NOT EXISTS(SELECT 1 FROM public.facilities WHERE id=f AND status='active') THEN RAISE EXCEPTION 'Facility unavailable'; END IF;
 ELSIF r IS NULL THEN RAISE EXCEPTION 'Facility access denied'; END IF;

 CASE action
 WHEN 'register' THEN
  IF r NOT IN ('admin','nurse','doctor') THEN RAISE EXCEPTION 'Registration permission required'; END IF;
  pid:=coalesce(nullif(pid,''),'CL-'||rid::text);
  IF EXISTS(SELECT 1 FROM public.patients WHERE id=pid) THEN
   IF NOT public.careline_patient_access(pid,f) THEN RAISE EXCEPTION 'Patient ID already in use'; END IF;
   RETURN (SELECT to_jsonb(p) FROM public.patients p WHERE id=pid);
  END IF;
  IF nullif(trim(payload->>'first_name'),'') IS NULL OR nullif(trim(payload->>'last_name'),'') IS NULL THEN RAISE EXCEPTION 'Patient names are required'; END IF;
  IF nullif(payload->>'date_of_birth','')::date>current_date THEN RAISE EXCEPTION 'Birth date cannot be in the future'; END IF;
  INSERT INTO public.patients(id,first_name,last_name,date_of_birth,gender,phone,email,region,village,blood_group,allergies,next_of_kin,facility_id,birth_date_accuracy)
  VALUES(pid,trim(payload->>'first_name'),trim(payload->>'last_name'),nullif(payload->>'date_of_birth','')::date,nullif(payload->>'gender',''),nullif(payload->>'phone',''),nullif(payload->>'email',''),payload->>'region',payload->>'village',nullif(payload->>'blood_group',''),payload->>'allergies',payload->>'next_of_kin',f,CASE WHEN nullif(payload->>'date_of_birth','') IS NULL THEN 'unknown' ELSE coalesce(payload->>'birth_date_accuracy','exact') END);
  RETURN (SELECT to_jsonb(p) FROM public.patients p WHERE id=pid);
 WHEN 'arrive' THEN
  IF r NOT IN ('admin','nurse','doctor') OR NOT public.careline_patient_access(pid,f) THEN RAISE EXCEPTION 'Patient registration required at this facility'; END IF;
  INSERT INTO public.visits(id,patient_id,facility_id,status,priority,notes,attending_doctor) VALUES(rid,pid,f,'waiting',coalesce(payload->>'priority','routine'),payload->>'notes',auth.uid()) ON CONFLICT(id) DO NOTHING;
  RETURN (SELECT to_jsonb(x) FROM public.visits x WHERE id=rid AND facility_id=f);
 WHEN 'visit' THEN
  IF r NOT IN ('admin','nurse','doctor') THEN RAISE EXCEPTION 'Clinical permission required'; END IF;
  SELECT * INTO v FROM public.visits WHERE id=rid AND facility_id=f FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Visit not found'; END IF;
  IF v.version IS DISTINCT FROM (payload->>'version')::integer THEN RAISE EXCEPTION 'This visit changed. Refresh before saving.'; END IF;
  IF v.status IN ('completed','cancelled') THEN RAISE EXCEPTION 'Closed visits cannot be overwritten'; END IF;
  IF payload ? 'diagnosis' AND r='nurse' THEN RAISE EXCEPTION 'A clinician must record the diagnosis'; END IF;
  IF payload->>'status' NOT IN ('waiting','triage','consultation','awaiting_tests','completed','cancelled') THEN RAISE EXCEPTION 'Invalid visit status'; END IF;
  IF r='nurse' AND payload->>'status' NOT IN ('waiting','triage','consultation','cancelled') THEN RAISE EXCEPTION 'Clinician action required'; END IF;
  UPDATE public.visits SET status=payload->>'status',diagnosis=coalesce(payload->>'diagnosis',diagnosis),notes=coalesce(payload->>'notes',notes),follow_up_date=coalesce(nullif(payload->>'follow_up_date','')::date,follow_up_date),version=version+1 WHERE id=rid;
 WHEN 'observe' THEN
  IF r NOT IN ('admin','nurse','doctor') THEN RAISE EXCEPTION 'Clinical permission required'; END IF;
  SELECT * INTO v FROM public.visits WHERE id=(payload->>'visit_id')::uuid AND facility_id=f;
  IF NOT FOUND OR v.status IN ('completed','cancelled') THEN RAISE EXCEPTION 'Open visit required'; END IF;
  INSERT INTO public.observations(id,visit_id,patient_id,facility_id,temperature,systolic,diastolic,pulse,weight,spo2,notes,recorded_by)
  VALUES(rid,v.id,v.patient_id,f,nullif(payload->>'temperature','')::numeric,nullif(payload->>'systolic','')::integer,nullif(payload->>'diastolic','')::integer,nullif(payload->>'pulse','')::integer,nullif(payload->>'weight','')::numeric,nullif(payload->>'spo2','')::numeric,payload->>'notes',auth.uid()) ON CONFLICT(id) DO NOTHING;
 WHEN 'lab_order' THEN
  IF r NOT IN ('admin','doctor') OR NOT public.careline_patient_access(pid,f) THEN RAISE EXCEPTION 'Clinician and registered patient required'; END IF;
  IF nullif(trim(payload->>'test_type'),'') IS NULL THEN RAISE EXCEPTION 'Test name is required'; END IF;
  IF nullif(payload->>'visit_id','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.visits WHERE id=(payload->>'visit_id')::uuid AND patient_id=pid AND facility_id=f) THEN RAISE EXCEPTION 'Visit does not belong to this patient'; END IF;
  INSERT INTO public.lab_results(id,patient_id,visit_id,facility_id,test_type,status,requested_by) VALUES(rid,pid,nullif(payload->>'visit_id','')::uuid,f,payload->>'test_type','requested',auth.uid()) ON CONFLICT(id) DO NOTHING;
 WHEN 'lab_progress' THEN
  IF r NOT IN ('admin','labtech') THEN RAISE EXCEPTION 'Laboratory permission required'; END IF;
  UPDATE public.lab_results SET status='processing',specimen_reference=payload->>'specimen_reference' WHERE id=rid AND facility_id=f AND status='requested';
  IF NOT FOUND THEN RAISE EXCEPTION 'Test is no longer awaiting processing'; END IF;
 WHEN 'lab_complete' THEN
  IF r NOT IN ('admin','labtech') OR nullif(trim(payload->>'summary'),'') IS NULL THEN RAISE EXCEPTION 'Laboratory permission and result summary required'; END IF;
  UPDATE public.lab_results SET summary=payload->>'summary',status='completed',uploaded_by=auth.uid(),uploaded_at=now() WHERE id=rid AND facility_id=f AND status IN ('requested','processing');
  IF NOT FOUND THEN RAISE EXCEPTION 'Result is already completed or unavailable'; END IF;
 WHEN 'lab_review' THEN
  IF r NOT IN ('admin','doctor') THEN RAISE EXCEPTION 'Clinician review required'; END IF;
  UPDATE public.lab_results SET status='reviewed',notified_at=now(),reviewed_by=auth.uid() WHERE id=rid AND facility_id=f AND status='completed';
  IF NOT FOUND THEN RAISE EXCEPTION 'Only completed results can be reviewed'; END IF;
 WHEN 'prescribe' THEN
  IF r NOT IN ('admin','doctor') OR NOT public.careline_patient_access(pid,f) THEN RAISE EXCEPTION 'Clinician and registered patient required'; END IF;
  IF nullif(trim(payload->>'medication'),'') IS NULL OR nullif(trim(payload->>'instructions'),'') IS NULL THEN RAISE EXCEPTION 'Medication and instructions required'; END IF;
  IF nullif(payload->>'pharmacy_id','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.facilities WHERE id=(payload->>'pharmacy_id')::uuid AND status='active' AND facility_type IN ('pharmacy','hospital','health_centre','clinic')) THEN RAISE EXCEPTION 'Select an active dispensing facility'; END IF;
  INSERT INTO public.prescriptions(id,patient_id,facility_id,pharmacy_id,medication,instructions,quantity,ends_on,prescribed_by)
  VALUES(rid,pid,f,nullif(payload->>'pharmacy_id','')::uuid,trim(payload->>'medication'),payload->>'instructions',(payload->>'quantity')::integer,nullif(payload->>'ends_on','')::date,auth.uid()) ON CONFLICT(id) DO NOTHING;
 WHEN 'stop_prescription' THEN
  IF r NOT IN ('admin','doctor') THEN RAISE EXCEPTION 'Clinician required'; END IF;
  UPDATE public.prescriptions SET status='stopped' WHERE id=rid AND facility_id=f;
 WHEN 'stock' THEN
  IF r NOT IN ('admin','pharmacist') THEN RAISE EXCEPTION 'Pharmacy permission required'; END IF;
  IF nullif(trim(payload->>'medication'),'') IS NULL OR nullif(trim(payload->>'batch_number'),'') IS NULL THEN RAISE EXCEPTION 'Medication and batch number required'; END IF;
  IF (payload->>'expires_on')::date<=current_date THEN RAISE EXCEPTION 'Receive an unexpired batch'; END IF;
  INSERT INTO public.stock_batches(id,facility_id,medication,batch_number,expires_on,quantity,unit_price)
  VALUES(rid,f,trim(payload->>'medication'),trim(payload->>'batch_number'),(payload->>'expires_on')::date,(payload->>'quantity')::integer,(payload->>'unit_price')::integer) ON CONFLICT(id) DO NOTHING;
 WHEN 'dispense' THEN
  IF r NOT IN ('admin','pharmacist') THEN RAISE EXCEPTION 'Pharmacy permission required'; END IF;
  IF EXISTS(SELECT 1 FROM public.dispensings WHERE id=rid AND facility_id=f) THEN RETURN jsonb_build_object('success',true); END IF;
  SELECT * INTO rx FROM public.prescriptions WHERE id=(payload->>'prescription_id')::uuid AND (pharmacy_id=f OR (pharmacy_id IS NULL AND facility_id=f)) FOR UPDATE;
  IF NOT FOUND OR rx.status<>'active' OR rx.starts_on>current_date OR rx.ends_on<current_date THEN RAISE EXCEPTION 'Active prescription assigned to this pharmacy required'; END IF;
  SELECT * INTO b FROM public.stock_batches WHERE id=(payload->>'batch_id')::uuid AND facility_id=f FOR UPDATE;
  amount:=(payload->>'quantity')::integer;
  IF NOT FOUND OR b.expires_on<=current_date OR lower(trim(b.medication))<>lower(trim(rx.medication)) OR amount IS NULL OR amount<=0 OR amount>b.quantity THEN RAISE EXCEPTION 'Check medicine, expiry and available quantity'; END IF;
  SELECT coalesce(sum(quantity),0) INTO paid FROM public.dispensings WHERE prescription_id=rx.id;
  IF paid+amount>rx.quantity THEN RAISE EXCEPTION 'Quantity exceeds the remaining prescription'; END IF;
  UPDATE public.stock_batches SET quantity=quantity-amount WHERE id=b.id;
  INSERT INTO public.dispensings VALUES(rid,rx.id,b.id,f,rx.patient_id,amount,b.unit_price,auth.uid(),now());
 WHEN 'appointment' THEN
  IF NOT public.careline_owns(pid) AND (r NOT IN ('admin','nurse','doctor') OR NOT public.careline_patient_access(pid,f)) THEN RAISE EXCEPTION 'Appointment permission denied'; END IF;
  IF (payload->>'scheduled_at')::timestamptz<=now() OR nullif(trim(payload->>'reason'),'') IS NULL THEN RAISE EXCEPTION 'Choose a future time and reason'; END IF;
  INSERT INTO public.appointments(id,patient_id,facility_id,scheduled_at,reason,status) VALUES(rid,pid,f,(payload->>'scheduled_at')::timestamptz,payload->>'reason',CASE WHEN r IN ('admin','nurse','doctor') THEN 'confirmed' ELSE 'requested' END) ON CONFLICT(id) DO NOTHING;
 WHEN 'appointment_status' THEN
  IF r NOT IN ('admin','nurse','doctor') THEN RAISE EXCEPTION 'Reception permission required'; END IF;
  UPDATE public.appointments SET status=payload->>'status' WHERE id=rid AND facility_id=f AND status NOT IN ('cancelled','arrived');
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment unavailable'; END IF;
  IF payload->>'status'='arrived' THEN
   INSERT INTO public.patient_facilities(patient_id,facility_id) SELECT patient_id,f FROM public.appointments WHERE id=rid ON CONFLICT DO NOTHING;
   INSERT INTO public.visits(patient_id,facility_id,status,notes,attending_doctor) SELECT a.patient_id,f,'waiting',a.reason,auth.uid() FROM public.appointments a WHERE a.id=rid AND NOT EXISTS(SELECT 1 FROM public.visits v WHERE v.patient_id=a.patient_id AND v.facility_id=f AND v.status IN ('waiting','triage','consultation','awaiting_tests'));
  END IF;
 WHEN 'refer' THEN
  IF r NOT IN ('admin','doctor','nurse') OR NOT public.careline_patient_access(pid,f) THEN RAISE EXCEPTION 'Referral permission denied'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.facilities WHERE id=(payload->>'target_facility_id')::uuid AND status='active') THEN RAISE EXCEPTION 'Receiving facility unavailable'; END IF;
  INSERT INTO public.referrals(id,patient_id,facility_id,target_facility_id,reason,consent_recorded,created_by) VALUES(rid,pid,f,(payload->>'target_facility_id')::uuid,payload->>'reason',(payload->>'consent_recorded')::boolean,auth.uid()) ON CONFLICT(id) DO NOTHING;
 WHEN 'referral_status' THEN
  IF r NOT IN ('admin','doctor','nurse') THEN RAISE EXCEPTION 'Clinical permission required'; END IF;
  SELECT * INTO ref FROM public.referrals WHERE id=rid AND target_facility_id=f FOR UPDATE;
  IF NOT FOUND OR ref.status NOT IN ('sent','accepted') OR payload->>'status' NOT IN ('accepted','declined','completed') THEN RAISE EXCEPTION 'Referral unavailable'; END IF;
  UPDATE public.referrals SET status=payload->>'status' WHERE id=rid;
  IF payload->>'status'='accepted' THEN INSERT INTO public.patient_facilities(patient_id,facility_id) VALUES(ref.patient_id,f) ON CONFLICT DO NOTHING; END IF;
 WHEN 'invoice' THEN
  IF r NOT IN ('admin','nurse','pharmacist') OR NOT (public.careline_patient_access(pid,f) OR EXISTS(SELECT 1 FROM public.dispensings WHERE patient_id=pid AND facility_id=f)) THEN RAISE EXCEPTION 'Billing permission denied'; END IF;
  INSERT INTO public.invoices(id,patient_id,facility_id,description,total) VALUES(rid,pid,f,payload->>'description',(payload->>'total')::integer) ON CONFLICT(id) DO NOTHING;
 WHEN 'pay' THEN
  IF r NOT IN ('admin','nurse','pharmacist') THEN RAISE EXCEPTION 'Billing permission denied'; END IF;
  IF EXISTS(SELECT 1 FROM public.payments WHERE id=rid AND facility_id=f) THEN RETURN jsonb_build_object('success',true); END IF;
  SELECT * INTO inv FROM public.invoices WHERE id=(payload->>'invoice_id')::uuid AND facility_id=f FOR UPDATE;
  IF NOT FOUND OR inv.status<>'open' THEN RAISE EXCEPTION 'Open invoice required'; END IF;
  amount:=(payload->>'amount')::integer;
  SELECT coalesce(sum(p.amount),0) INTO paid FROM public.payments p WHERE invoice_id=inv.id;
  IF amount IS NULL OR amount<=0 OR paid+amount>inv.total THEN RAISE EXCEPTION 'Payment exceeds balance or is invalid'; END IF;
  INSERT INTO public.payments VALUES(rid,inv.id,inv.patient_id,f,amount,payload->>'method',nullif(trim(payload->>'reference'),''),auth.uid(),now());
  IF paid+amount=inv.total THEN UPDATE public.invoices SET status='paid' WHERE id=inv.id; END IF;
 WHEN 'approve_link' THEN
  IF r NOT IN ('admin','nurse') THEN RAISE EXCEPTION 'Registration permission required'; END IF;
  SELECT * INTO link FROM public.record_links WHERE id=rid AND facility_id=f AND status='pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Link request unavailable'; END IF;
  IF EXISTS(SELECT 1 FROM public.patients WHERE id=link.patient_id AND auth_user_id IS NOT NULL) THEN RAISE EXCEPTION 'This record already belongs to an account'; END IF;
  -- Never merge or erase a self-registration record automatically.
  IF EXISTS(SELECT 1 FROM public.patients WHERE auth_user_id=link.requested_by) THEN RAISE EXCEPTION 'Account already has a patient record. An audited identity reconciliation is required.'; END IF;
  UPDATE public.patients SET auth_user_id=link.requested_by WHERE id=link.patient_id;
  UPDATE public.record_links SET status='approved' WHERE id=rid;
 WHEN 'archive_patient' THEN
  IF r<>'admin' OR NOT public.careline_patient_access(pid,f) THEN RAISE EXCEPTION 'Administrator permission required'; END IF;
  UPDATE public.patients SET archived_at=now() WHERE id=pid;
 ELSE RAISE EXCEPTION 'Unknown workflow action'; END CASE;
 RETURN jsonb_build_object('success',true,'id',rid);
END $$;

-- Compatibility guard for the native application's older direct result writes.
CREATE OR REPLACE FUNCTION public.careline_lab_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF TG_OP='INSERT' AND NEW.visit_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.visits WHERE id=NEW.visit_id AND patient_id=NEW.patient_id AND facility_id=NEW.facility_id) THEN RAISE EXCEPTION 'Visit and patient must match the laboratory facility'; END IF;
 IF TG_OP='UPDATE' AND NEW.notified_at IS DISTINCT FROM OLD.notified_at AND NEW.notified_at IS NOT NULL THEN
  IF public.careline_role(NEW.facility_id) NOT IN ('admin','doctor') OR OLD.status<>'completed' THEN RAISE EXCEPTION 'Only a clinician can review a completed result'; END IF;
  NEW.reviewed_by:=auth.uid(); NEW.status:='reviewed';
 END IF;
 IF TG_OP='UPDATE' AND NEW.summary IS DISTINCT FROM OLD.summary THEN
  IF public.careline_role(NEW.facility_id) NOT IN ('admin','labtech') OR OLD.status IN ('completed','reviewed') THEN RAISE EXCEPTION 'Completed results require an amendment, not an overwrite'; END IF;
  IF nullif(trim(NEW.summary),'') IS NULL THEN RAISE EXCEPTION 'Result summary required'; END IF;
  NEW.status:='completed'; NEW.uploaded_at:=now(); NEW.uploaded_by:=auth.uid();
 END IF;
 IF TG_OP='INSERT' AND nullif(trim(NEW.summary),'') IS NOT NULL THEN NEW.status:='completed'; NEW.uploaded_by:=auth.uid(); END IF;
 RETURN NEW; END $$;
DROP TRIGGER IF EXISTS careline_lab_guard ON public.lab_results;
CREATE TRIGGER careline_lab_guard BEFORE INSERT OR UPDATE ON public.lab_results FOR EACH ROW EXECUTE FUNCTION public.careline_lab_guard();

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('LAB_result','LAB_result',false,10485760,ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=10485760,allowed_mime_types=ARRAY['application/pdf','image/jpeg','image/png'];
DROP POLICY IF EXISTS lab_storage_upload ON storage.objects;
DROP POLICY IF EXISTS lab_storage_read ON storage.objects;
DROP POLICY IF EXISTS lab_storage_delete ON storage.objects;
DROP POLICY IF EXISTS careline_lab_upload ON storage.objects;
DROP POLICY IF EXISTS careline_lab_read ON storage.objects;
DROP POLICY IF EXISTS careline_lab_cleanup ON storage.objects;
CREATE POLICY careline_lab_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='LAB_result' AND public.careline_role((storage.foldername(name))[1]::uuid) IN ('admin','labtech') AND public.careline_patient_access((storage.foldername(name))[2],(storage.foldername(name))[1]::uuid));
CREATE POLICY careline_lab_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='LAB_result' AND EXISTS(SELECT 1 FROM public.lab_results l WHERE l.storage_path=name));
CREATE POLICY careline_lab_cleanup ON storage.objects FOR DELETE TO authenticated USING(bucket_id='LAB_result' AND owner_id=auth.uid()::text AND NOT EXISTS(SELECT 1 FROM public.lab_results l WHERE l.storage_path=name));

CREATE INDEX IF NOT EXISTS careline_visit_queue ON public.visits(facility_id,status,date);
CREATE INDEX IF NOT EXISTS careline_patient_account ON public.patients(auth_user_id);
CREATE INDEX IF NOT EXISTS careline_member_user ON public.facility_members(user_id,active);
CREATE INDEX IF NOT EXISTS careline_lab_queue ON public.lab_results(facility_id,status,uploaded_at);
CREATE INDEX IF NOT EXISTS careline_rx_pharmacy ON public.prescriptions(pharmacy_id,status);
CREATE INDEX IF NOT EXISTS careline_appointments ON public.appointments(facility_id,scheduled_at);
CREATE INDEX IF NOT EXISTS careline_audit_facility ON public.audit_events(facility_id,created_at DESC);
CREATE INDEX IF NOT EXISTS careline_stock_expiry ON public.stock_batches(facility_id,expires_on);

-- Every custom function is denied to anonymous users, including SECURITY DEFINER RPCs.
DO $$ DECLARE f record; BEGIN FOR f IN SELECT p.oid::regprocedure signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND (p.proname LIKE 'careline_%' OR p.proname IN ('get_my_role','handle_new_user','handle_new_patient')) LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
 IF f.signature::text NOT LIKE '%careline_audit(%' AND f.signature::text NOT LIKE '%handle_new_%' AND f.signature::text NOT LIKE '%careline_patient_created(%' AND f.signature::text NOT LIKE '%careline_lab_guard(%' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature); END IF;
 END LOOP; END $$;
COMMIT;
