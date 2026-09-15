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
-- Historical notification timestamps do not establish clinician review.
UPDATE public.lab_results SET status=CASE WHEN nullif(trim(summary),'') IS NOT NULL THEN 'completed' ELSE 'requested' END WHERE status IS NULL;
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
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',t);
  -- Table-level REVOKE does not remove historical column-level grants.
  EXECUTE (SELECT format('REVOKE ALL (%s) ON public.%I FROM PUBLIC, anon, authenticated',string_agg(quote_ident(column_name),','),t) FROM information_schema.columns WHERE table_schema='public' AND table_name=t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 END LOOP;
END $$;
GRANT UPDATE(name) ON public.profiles TO authenticated;
-- Clinical writes go through validated, audited workflow commands.
GRANT INSERT ON public.outbreak_alerts TO authenticated;
GRANT UPDATE(resolved_at,case_count) ON public.outbreak_alerts TO authenticated;
CREATE POLICY facility_read ON public.facilities FOR SELECT TO authenticated USING(status='active' OR owner_id=auth.uid() OR public.careline_operator() OR EXISTS(SELECT 1 FROM public.facility_members m WHERE m.facility_id=id AND m.user_id=auth.uid()));
CREATE POLICY profile_read ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid() OR EXISTS(SELECT 1 FROM public.facility_members m WHERE m.user_id=profiles.id AND public.careline_role(m.facility_id)='admin'));
CREATE POLICY profile_edit ON public.profiles FOR UPDATE TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());
CREATE POLICY member_read ON public.facility_members FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.careline_role(facility_id)='admin' OR public.careline_operator());
CREATE POLICY invitation_read ON public.staff_invitations FOR SELECT TO authenticated USING(public.careline_role(facility_id)='admin');
CREATE POLICY patient_link_read ON public.patient_facilities FOR SELECT TO authenticated USING(public.careline_role(facility_id) IS NOT NULL OR public.careline_owns(patient_id));
CREATE POLICY patient_read ON public.patients FOR SELECT TO authenticated USING(auth_user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.patient_facilities l WHERE l.patient_id=id AND public.careline_role(l.facility_id) IS NOT NULL) OR EXISTS(SELECT 1 FROM public.prescriptions rx WHERE rx.patient_id=patients.id AND public.careline_role(rx.pharmacy_id) IN ('admin','pharmacist')));
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
 row_data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF TG_OP='UPDATE' THEN SELECT array_agg(key) INTO fields FROM jsonb_each(row_data) WHERE value IS DISTINCT FROM to_jsonb(OLD)->key; END IF;
 INSERT INTO public.audit_events(actor_id,facility_id,entity,entity_id,action,changed_fields)
 VALUES(auth.uid(),nullif(row_data->>'facility_id','')::uuid,TG_TABLE_NAME,coalesce(row_data->>'id',row_data->>'user_id'),TG_OP,fields);
 RETURN NEW; END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['patients','visits','observations','lab_results','prescriptions','stock_batches','dispensings','appointments','referrals','invoices','payments','facility_members','record_links','staff_broadcasts'] LOOP
 EXECUTE format('DROP TRIGGER IF EXISTS careline_audit ON public.%I',t);
 EXECUTE format('CREATE TRIGGER careline_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.careline_audit()',t);
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
CREATE OR REPLACE FUNCTION public.careline_staff_directory(f uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF public.careline_role(f) IS NULL THEN RAISE EXCEPTION 'Facility access denied'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'name',coalesce(p.name,'Staff member'),'role',m.role) ORDER BY p.name)
 FROM public.facility_members m JOIN public.profiles p ON p.id=m.user_id WHERE m.facility_id=f AND m.active),'[]'::jsonb);
END $$;
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
 WHEN 'notice' THEN
  IF nullif(trim(payload->>'content'),'') IS NULL OR length(payload->>'content')>5000 THEN RAISE EXCEPTION 'Enter a notice of 1 to 5000 characters'; END IF;
  IF coalesce(payload->>'target_type','') NOT IN ('all','role','individual') OR coalesce(payload->>'priority','') NOT IN ('normal','urgent') THEN RAISE EXCEPTION 'Choose an audience and priority'; END IF;
  IF payload->>'target_type'='role' AND coalesce(payload->>'target_role','') NOT IN ('admin','doctor','nurse','labtech','pharmacist') THEN RAISE EXCEPTION 'Choose a staff role'; END IF;
  IF payload->>'target_type'='individual' AND NOT EXISTS(SELECT 1 FROM public.facility_members WHERE facility_id=f AND user_id=nullif(payload->>'target_user_id','')::uuid AND active) THEN RAISE EXCEPTION 'Choose an active colleague in this institution'; END IF;
  INSERT INTO public.staff_broadcasts(id,author_id,author_name,content,priority,target_type,target_role,target_user_id,facility_id)
  VALUES(rid,auth.uid(),coalesce((SELECT name FROM public.profiles WHERE id=auth.uid()),'Staff member'),trim(payload->>'content'),payload->>'priority',payload->>'target_type',CASE WHEN payload->>'target_type'='role' THEN payload->>'target_role' END,CASE WHEN payload->>'target_type'='individual' THEN (payload->>'target_user_id')::uuid END,f) ON CONFLICT(id) DO NOTHING;
 WHEN 'delete_notice' THEN
  DELETE FROM public.staff_broadcasts WHERE id=rid AND facility_id=f AND (author_id=auth.uid() OR r='admin');
  IF NOT FOUND THEN RAISE EXCEPTION 'Notice unavailable or removal permission denied'; END IF;
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
  IF coalesce(payload->>'status','') NOT IN ('waiting','triage','consultation','awaiting_tests','completed','cancelled') THEN RAISE EXCEPTION 'Invalid visit status'; END IF;
  IF r='nurse' AND payload->>'status' NOT IN ('waiting','triage','consultation','cancelled') THEN RAISE EXCEPTION 'Clinician action required'; END IF;
  IF r='nurse' AND payload ? 'follow_up_date' THEN RAISE EXCEPTION 'A clinician must set follow-up dates'; END IF;
  UPDATE public.visits SET status=payload->>'status',diagnosis=coalesce(payload->>'diagnosis',diagnosis),notes=coalesce(payload->>'notes',notes),follow_up_date=CASE WHEN payload ? 'follow_up_date' THEN nullif(payload->>'follow_up_date','')::date ELSE follow_up_date END,version=version+1 WHERE id=rid;
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
 WHEN 'lab_upload' THEN
  IF r NOT IN ('admin','labtech') OR NOT public.careline_patient_access(pid,f) THEN RAISE EXCEPTION 'Laboratory and registered patient required'; END IF;
  IF nullif(trim(payload->>'test_type'),'') IS NULL OR nullif(trim(payload->>'summary'),'') IS NULL THEN RAISE EXCEPTION 'Test name and result summary required'; END IF;
  IF nullif(payload->>'storage_path','') IS NOT NULL AND (split_part(payload->>'storage_path','/',1)<>f::text OR split_part(payload->>'storage_path','/',2)<>pid OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='LAB_result' AND name=payload->>'storage_path' AND owner_id=auth.uid()::text)) THEN RAISE EXCEPTION 'Upload a private attachment for this patient and institution'; END IF;
  INSERT INTO public.lab_results(id,patient_id,facility_id,test_type,summary,storage_path,uploaded_by,status)
  VALUES(rid,pid,f,trim(payload->>'test_type'),trim(payload->>'summary'),nullif(payload->>'storage_path',''),auth.uid(),'completed') ON CONFLICT(id) DO NOTHING;
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
  IF paid+amount=rx.quantity THEN UPDATE public.prescriptions SET status='completed' WHERE id=rx.id; END IF;
 WHEN 'appointment' THEN
  IF NOT public.careline_owns(pid) AND (r NOT IN ('admin','nurse','doctor') OR NOT public.careline_patient_access(pid,f)) THEN RAISE EXCEPTION 'Appointment permission denied'; END IF;
  IF (payload->>'scheduled_at')::timestamptz<=now() OR nullif(trim(payload->>'reason'),'') IS NULL THEN RAISE EXCEPTION 'Choose a future time and reason'; END IF;
  INSERT INTO public.appointments(id,patient_id,facility_id,scheduled_at,reason,status) VALUES(rid,pid,f,(payload->>'scheduled_at')::timestamptz,payload->>'reason',CASE WHEN r IN ('admin','nurse','doctor') THEN 'confirmed' ELSE 'requested' END) ON CONFLICT(id) DO NOTHING;
 WHEN 'appointment_status' THEN
  IF r NOT IN ('admin','nurse','doctor') THEN RAISE EXCEPTION 'Reception permission required'; END IF;
  IF coalesce(payload->>'status','') NOT IN ('confirmed','arrived','cancelled','missed') THEN RAISE EXCEPTION 'Invalid appointment status'; END IF;
  UPDATE public.appointments SET status=payload->>'status' WHERE id=rid AND facility_id=f AND status IN ('requested','confirmed');
  IF NOT FOUND THEN RAISE EXCEPTION 'Appointment unavailable'; END IF;
  IF payload->>'status'='arrived' THEN
   INSERT INTO public.patient_facilities(patient_id,facility_id) SELECT patient_id,f FROM public.appointments WHERE id=rid ON CONFLICT DO NOTHING;
   INSERT INTO public.visits(patient_id,facility_id,status,notes,attending_doctor) SELECT a.patient_id,f,'waiting',a.reason,auth.uid() FROM public.appointments a WHERE a.id=rid AND NOT EXISTS(SELECT 1 FROM public.visits existing_visit WHERE existing_visit.patient_id=a.patient_id AND existing_visit.facility_id=f AND existing_visit.status IN ('waiting','triage','consultation','awaiting_tests'));
  END IF;
 WHEN 'refer' THEN
  IF r NOT IN ('admin','doctor','nurse') OR NOT public.careline_patient_access(pid,f) THEN RAISE EXCEPTION 'Referral permission denied'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.facilities WHERE id=(payload->>'target_facility_id')::uuid AND status='active') THEN RAISE EXCEPTION 'Receiving facility unavailable'; END IF;
  INSERT INTO public.referrals(id,patient_id,facility_id,target_facility_id,reason,consent_recorded,created_by) VALUES(rid,pid,f,(payload->>'target_facility_id')::uuid,payload->>'reason',(payload->>'consent_recorded')::boolean,auth.uid()) ON CONFLICT(id) DO NOTHING;
 WHEN 'referral_status' THEN
  IF r NOT IN ('admin','doctor','nurse') THEN RAISE EXCEPTION 'Clinical permission required'; END IF;
  SELECT * INTO ref FROM public.referrals WHERE id=rid AND target_facility_id=f FOR UPDATE;
  IF NOT FOUND OR NOT ((ref.status='sent' AND coalesce(payload->>'status','') IN ('accepted','declined')) OR (ref.status='accepted' AND payload->>'status'='completed')) THEN RAISE EXCEPTION 'Referral unavailable or invalid transition'; END IF;
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

-- Care coordination: install after 20260910_careline.sql, or use root database.sql.
BEGIN;
CREATE TABLE IF NOT EXISTS public.patient_concerns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id text NOT NULL REFERENCES public.patients(id),
 facility_id uuid NOT NULL REFERENCES public.facilities(id), concern text NOT NULL CHECK(length(trim(concern)) BETWEEN 1 AND 4000),
 preferred_language text, access_barriers text, created_by uuid NOT NULL REFERENCES auth.users(id),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewed')), response text,
 reviewed_by uuid REFERENCES auth.users(id), reviewed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.care_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_id text NOT NULL REFERENCES public.patients(id),
 facility_id uuid NOT NULL REFERENCES public.facilities(id), summary text NOT NULL CHECK(length(trim(summary)) BETWEEN 1 AND 4000),
 medication_instructions text NOT NULL DEFAULT '', next_steps text NOT NULL DEFAULT '', warning_signs text NOT NULL DEFAULT '',
 language text NOT NULL DEFAULT 'English', status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','superseded')),
 version integer NOT NULL DEFAULT 1, created_by uuid NOT NULL REFERENCES auth.users(id),
 published_by uuid REFERENCES auth.users(id), published_by_name text, published_at timestamptz, acknowledged_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.care_plans ADD COLUMN IF NOT EXISTS published_by_name text;
CREATE UNIQUE INDEX IF NOT EXISTS careline_current_plan ON public.care_plans(patient_id,facility_id) WHERE status='published';
CREATE TABLE IF NOT EXISTS public.care_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), facility_id uuid NOT NULL REFERENCES public.facilities(id),
 patient_id text REFERENCES public.patients(id), title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 250),
 details text NOT NULL DEFAULT '', assigned_to uuid REFERENCES auth.users(id),
 required_role text NOT NULL CHECK(required_role IN ('admin','doctor','nurse','labtech','pharmacist')),
 priority text NOT NULL DEFAULT 'routine' CHECK(priority IN ('routine','urgent')),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','waiting','completed','cancelled')),
 due_at timestamptz NOT NULL, source text NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','lab_review','follow_up')),
 linked_id uuid, outcome text, version integer NOT NULL DEFAULT 1,
 created_by uuid REFERENCES auth.users(id), completed_by uuid REFERENCES auth.users(id), completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(facility_id,source,linked_id)
);
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS critical boolean NOT NULL DEFAULT false;
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS critical_reason text;
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS critical_at timestamptz;
ALTER TABLE public.lab_results ADD COLUMN IF NOT EXISTS critical_by uuid REFERENCES auth.users(id);

DO $$ DECLARE t text; pol record; col record; BEGIN
 FOREACH t IN ARRAY ARRAY['patient_concerns','care_plans','care_tasks'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP EXECUTE format('DROP POLICY %I ON public.%I',pol.policyname,t); END LOOP;
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  FOR col IN SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=t LOOP
   EXECUTE format('REVOKE INSERT (%I), UPDATE (%I), REFERENCES (%I) ON public.%I FROM PUBLIC,anon,authenticated',col.column_name,col.column_name,col.column_name,t);
  END LOOP;
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  EXECUTE format('DROP TRIGGER IF EXISTS careline_audit ON public.%I',t);
  EXECUTE format('CREATE TRIGGER careline_audit AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.careline_audit()',t);
 END LOOP;
END $$;
CREATE POLICY concern_read ON public.patient_concerns FOR SELECT TO authenticated USING(public.careline_owns(patient_id) OR public.careline_role(facility_id) IN ('admin','doctor','nurse'));
CREATE POLICY care_plan_read ON public.care_plans FOR SELECT TO authenticated USING((public.careline_owns(patient_id) AND status IN ('published','superseded')) OR public.careline_role(facility_id) IN ('admin','doctor','nurse'));
CREATE POLICY task_read ON public.care_tasks FOR SELECT TO authenticated USING(public.careline_role(facility_id) IS NOT NULL AND (public.careline_role(facility_id)='admin' OR assigned_to=auth.uid() OR created_by=auth.uid() OR (assigned_to IS NULL AND required_role=public.careline_role(facility_id))));
CREATE INDEX IF NOT EXISTS careline_concerns_patient ON public.patient_concerns(patient_id,created_at DESC);
CREATE INDEX IF NOT EXISTS careline_plans_patient ON public.care_plans(patient_id,created_at DESC);
CREATE INDEX IF NOT EXISTS careline_tasks_owner ON public.care_tasks(facility_id,assigned_to,status,due_at);

CREATE OR REPLACE FUNCTION public.careline_coordination(action text,f uuid,payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r text; pid text; rid uuid; assignee uuid; target_role text; task public.care_tasks; plan public.care_plans; lab public.lab_results; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to continue'; END IF;
 r:=public.careline_role(f); pid:=payload->>'patient_id'; rid:=coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid());
 IF action='concern_add' THEN
  IF NOT coalesce(((public.careline_owns(pid) AND EXISTS(SELECT 1 FROM public.patient_facilities WHERE patient_id=pid AND facility_id=f)) OR (r IN ('admin','doctor','nurse') AND public.careline_patient_access(pid,f))),false) THEN RAISE EXCEPTION 'Choose the institution where this patient is registered'; END IF;
  INSERT INTO public.patient_concerns(id,patient_id,facility_id,concern,preferred_language,access_barriers,created_by)
  VALUES(rid,pid,f,trim(payload->>'concern'),nullif(trim(payload->>'preferred_language'),''),nullif(trim(payload->>'access_barriers'),''),auth.uid()) ON CONFLICT(id) DO NOTHING;
  RETURN jsonb_build_object('id',rid,'success',true);
 END IF;
 IF action='plan_acknowledge' THEN
  UPDATE public.care_plans SET acknowledged_at=coalesce(acknowledged_at,now()) WHERE id=rid AND facility_id=f AND status='published' AND public.careline_owns(patient_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Published care plan unavailable'; END IF;
  RETURN jsonb_build_object('success',true);
 END IF;
 IF r IS NULL THEN RAISE EXCEPTION 'Facility access denied'; END IF;
 CASE action
 WHEN 'concern_review' THEN
  IF r NOT IN ('admin','doctor','nurse') OR nullif(trim(payload->>'response'),'') IS NULL THEN RAISE EXCEPTION 'Care team response required'; END IF;
  UPDATE public.patient_concerns SET status='reviewed',response=trim(payload->>'response'),reviewed_by=auth.uid(),reviewed_at=now() WHERE id=rid AND facility_id=f AND status='open';
  IF NOT FOUND THEN RAISE EXCEPTION 'Concern already reviewed or unavailable'; END IF;
 WHEN 'plan_save' THEN
  IF r NOT IN ('admin','doctor') OR NOT public.careline_patient_access(pid,f) THEN RAISE EXCEPTION 'Clinician and registered patient required'; END IF;
  IF EXISTS(SELECT 1 FROM public.care_plans WHERE id=rid) THEN
   SELECT * INTO plan FROM public.care_plans WHERE id=rid AND facility_id=f AND patient_id=pid FOR UPDATE;
   IF NOT FOUND OR plan.status<>'draft' THEN RAISE EXCEPTION 'Only a draft may be edited'; END IF;
   IF plan.version IS DISTINCT FROM (payload->>'version')::integer THEN RAISE EXCEPTION 'This plan changed. Refresh before editing.'; END IF;
   UPDATE public.care_plans SET summary=trim(payload->>'summary'),medication_instructions=coalesce(payload->>'medication_instructions',''),next_steps=coalesce(payload->>'next_steps',''),warning_signs=coalesce(payload->>'warning_signs',''),language=coalesce(nullif(payload->>'language',''),'English'),version=version+1 WHERE id=rid;
  ELSE
   INSERT INTO public.care_plans(id,patient_id,facility_id,summary,medication_instructions,next_steps,warning_signs,language,created_by)
   VALUES(rid,pid,f,trim(payload->>'summary'),coalesce(payload->>'medication_instructions',''),coalesce(payload->>'next_steps',''),coalesce(payload->>'warning_signs',''),coalesce(nullif(payload->>'language',''),'English'),auth.uid());
  END IF;
 WHEN 'plan_publish' THEN
  IF r NOT IN ('admin','doctor') THEN RAISE EXCEPTION 'Clinician approval required'; END IF;
  PERFORM 1 FROM public.facilities WHERE id=f FOR UPDATE;
  SELECT * INTO plan FROM public.care_plans WHERE id=rid AND facility_id=f FOR UPDATE;
  IF NOT FOUND OR plan.status<>'draft' THEN RAISE EXCEPTION 'Draft unavailable'; END IF;
  IF plan.version IS DISTINCT FROM (payload->>'version')::integer THEN RAISE EXCEPTION 'This plan changed. Review the latest version.'; END IF;
  UPDATE public.care_plans SET status='superseded',version=version+1 WHERE patient_id=plan.patient_id AND facility_id=f AND status='published';
  UPDATE public.care_plans SET status='published',published_by=auth.uid(),published_by_name=coalesce((SELECT name FROM public.profiles WHERE id=auth.uid()),'Care clinician'),published_at=now(),version=version+1 WHERE id=rid;
 WHEN 'task_create' THEN
  assignee:=nullif(payload->>'assigned_to','')::uuid;
  SELECT role INTO target_role FROM public.facility_members WHERE user_id=assignee AND facility_id=f AND active;
  IF target_role IS NULL THEN RAISE EXCEPTION 'Assign an active colleague in this institution'; END IF;
  IF nullif(pid,'') IS NOT NULL AND NOT public.careline_patient_access(pid,f) THEN RAISE EXCEPTION 'Patient unavailable at this institution'; END IF;
  IF nullif(payload->>'due_at','') IS NULL THEN RAISE EXCEPTION 'A due date and time are required'; END IF;
  INSERT INTO public.care_tasks(id,facility_id,patient_id,title,details,assigned_to,required_role,priority,due_at,created_by)
  VALUES(rid,f,nullif(pid,''),trim(payload->>'title'),coalesce(payload->>'details',''),assignee,target_role,coalesce(payload->>'priority','routine'),(payload->>'due_at')::timestamptz,auth.uid()) ON CONFLICT(id) DO NOTHING;
 WHEN 'task_update' THEN
  SELECT * INTO task FROM public.care_tasks WHERE id=rid AND facility_id=f FOR UPDATE;
  IF NOT FOUND OR NOT coalesce((r='admin' OR task.assigned_to=auth.uid() OR task.created_by=auth.uid() OR (task.assigned_to IS NULL AND task.required_role=r)),false) THEN RAISE EXCEPTION 'Task access denied'; END IF;
  IF task.version IS DISTINCT FROM (payload->>'version')::integer THEN RAISE EXCEPTION 'This task changed. Refresh before saving.'; END IF;
  IF task.status IN ('completed','cancelled') THEN RAISE EXCEPTION 'Closed tasks cannot be overwritten'; END IF;
  IF coalesce(payload->>'status',task.status) NOT IN ('open','in_progress','waiting','completed','cancelled') THEN RAISE EXCEPTION 'Invalid task status'; END IF;
  IF task.source='lab_review' AND (payload->>'status' IN ('completed','cancelled') OR payload ? 'due_at') THEN RAISE EXCEPTION 'Review the laboratory result to close this task; its deadline cannot be postponed'; END IF;
  IF payload->>'status' IN ('completed','cancelled','waiting') AND nullif(trim(payload->>'outcome'),'') IS NULL THEN RAISE EXCEPTION 'Record the outcome or reason for waiting'; END IF;
  assignee:=coalesce(nullif(payload->>'assigned_to','')::uuid,task.assigned_to,auth.uid());
  SELECT role INTO target_role FROM public.facility_members WHERE user_id=assignee AND facility_id=f AND active;
  IF target_role IS NULL OR (task.source='lab_review' AND target_role NOT IN ('admin','doctor')) THEN RAISE EXCEPTION 'Choose an active colleague with the required responsibility'; END IF;
  UPDATE public.care_tasks SET assigned_to=assignee,required_role=target_role,status=coalesce(payload->>'status',status),outcome=coalesce(nullif(trim(payload->>'outcome'),''),outcome),due_at=coalesce(nullif(payload->>'due_at','')::timestamptz,due_at),version=version+1,completed_by=CASE WHEN payload->>'status' IN ('completed','cancelled') THEN auth.uid() END,completed_at=CASE WHEN payload->>'status' IN ('completed','cancelled') THEN now() END WHERE id=rid;
 WHEN 'lab_escalate' THEN
  IF r NOT IN ('admin','labtech','doctor') OR nullif(trim(payload->>'reason'),'') IS NULL THEN RAISE EXCEPTION 'Clinical or laboratory responsibility and escalation reason required'; END IF;
  SELECT * INTO lab FROM public.lab_results WHERE id=rid AND facility_id=f FOR UPDATE;
  IF NOT FOUND OR lab.status<>'completed' THEN RAISE EXCEPTION 'Only an unreviewed completed result may be escalated'; END IF;
  SELECT role INTO target_role FROM public.facility_members WHERE user_id=(payload->>'assigned_to')::uuid AND facility_id=f AND active;
  IF target_role IS NULL OR target_role NOT IN ('admin','doctor') THEN RAISE EXCEPTION 'Assign an active clinician'; END IF;
  UPDATE public.lab_results SET critical=true,critical_reason=trim(payload->>'reason'),critical_at=coalesce(critical_at,now()),critical_by=auth.uid() WHERE id=rid;
  UPDATE public.care_tasks SET assigned_to=(payload->>'assigned_to')::uuid,required_role=target_role,priority='urgent',due_at=now(),details=trim(payload->>'reason'),version=version+1 WHERE linked_id=rid AND facility_id=f AND source='lab_review';
 ELSE RAISE EXCEPTION 'Unknown care coordination action'; END CASE;
 RETURN jsonb_build_object('id',rid,'success',true);
END $$;

CREATE OR REPLACE FUNCTION public.careline_workflow_tasks() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id uuid; owner_role text; BEGIN
 IF TG_TABLE_NAME='lab_results' THEN
  IF NEW.status='completed' THEN
   SELECT m.user_id,m.role INTO owner_id,owner_role FROM public.facility_members m WHERE m.facility_id=NEW.facility_id AND m.active AND m.role IN ('doctor','admin') ORDER BY (m.user_id=NEW.requested_by) DESC NULLS LAST,(m.role='doctor') DESC,m.created_at,m.user_id LIMIT 1;
   INSERT INTO public.care_tasks(facility_id,patient_id,title,assigned_to,required_role,due_at,source,linked_id,created_by)
   VALUES(NEW.facility_id,NEW.patient_id,'Review result: '||left(NEW.test_type,220),owner_id,coalesce(owner_role,'doctor'),now(), 'lab_review',NEW.id,NEW.requested_by) ON CONFLICT(facility_id,source,linked_id) DO NOTHING;
  ELSIF NEW.status='reviewed' THEN
   UPDATE public.care_tasks SET status='completed',completed_at=now(),completed_by=NEW.reviewed_by,outcome='Laboratory result reviewed',version=version+1 WHERE source='lab_review' AND linked_id=NEW.id AND facility_id=NEW.facility_id AND status NOT IN ('completed','cancelled');
  END IF;
 ELSE
  IF NEW.follow_up_date IS NOT NULL AND NEW.status<>'cancelled' THEN
   SELECT m.user_id,m.role INTO owner_id,owner_role FROM public.facility_members m WHERE m.facility_id=NEW.facility_id AND m.active AND m.role IN ('doctor','admin','nurse') ORDER BY (m.user_id=NEW.attending_doctor) DESC NULLS LAST,m.created_at,m.user_id LIMIT 1;
   INSERT INTO public.care_tasks(facility_id,patient_id,title,assigned_to,required_role,due_at,source,linked_id,created_by)
   VALUES(NEW.facility_id,NEW.patient_id,'Confirm patient follow-up',owner_id,coalesce(owner_role,'nurse'),(NEW.follow_up_date+time '09:00') AT TIME ZONE 'Africa/Douala','follow_up',NEW.id,NEW.attending_doctor)
   ON CONFLICT(facility_id,source,linked_id) DO UPDATE SET due_at=excluded.due_at,version=care_tasks.version+1 WHERE care_tasks.status NOT IN ('completed','cancelled') AND care_tasks.due_at IS DISTINCT FROM excluded.due_at;
  ELSE
   UPDATE public.care_tasks SET status='cancelled',outcome='Follow-up removed or visit cancelled',completed_at=now(),completed_by=auth.uid(),version=version+1 WHERE source='follow_up' AND linked_id=NEW.id AND status NOT IN ('completed','cancelled');
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS careline_workflow_tasks ON public.lab_results;
CREATE TRIGGER careline_workflow_tasks AFTER INSERT OR UPDATE ON public.lab_results FOR EACH ROW EXECUTE FUNCTION public.careline_workflow_tasks();
DROP TRIGGER IF EXISTS careline_workflow_tasks ON public.visits;
CREATE TRIGGER careline_workflow_tasks AFTER INSERT OR UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION public.careline_workflow_tasks();
-- Backfill unresolved work once, without rewriting historical clinical records.
INSERT INTO public.care_tasks(facility_id,patient_id,title,required_role,due_at,source,linked_id,created_by)
SELECT facility_id,patient_id,'Review result: '||left(test_type,220),'doctor',coalesce(uploaded_at,now()),'lab_review',id,requested_by FROM public.lab_results WHERE status='completed' AND facility_id IS NOT NULL ON CONFLICT(facility_id,source,linked_id) DO NOTHING;
INSERT INTO public.care_tasks(facility_id,patient_id,title,required_role,due_at,source,linked_id,created_by)
SELECT facility_id,patient_id,'Confirm patient follow-up','nurse',(follow_up_date+time '09:00') AT TIME ZONE 'Africa/Douala','follow_up',id,attending_doctor FROM public.visits WHERE follow_up_date>=current_date AND status<>'cancelled' AND facility_id IS NOT NULL ON CONFLICT(facility_id,source,linked_id) DO NOTHING;
REVOKE ALL ON FUNCTION public.careline_workflow_tasks() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.careline_coordination(text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.careline_coordination(text,uuid,jsonb) TO authenticated;
COMMIT;

-- Administrator-controlled staff activation and consented clinician handovers.
BEGIN;
ALTER TABLE public.staff_invitations ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.staff_invitations ADD COLUMN IF NOT EXISTS activation_code uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS careline_invitation_code ON public.staff_invitations(activation_code);
ALTER TABLE public.facility_members ADD COLUMN IF NOT EXISTS badge_id text NOT NULL DEFAULT ('CL-S-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)));
CREATE UNIQUE INDEX IF NOT EXISTS careline_staff_badge ON public.facility_members(badge_id);
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS assigned_doctor_id uuid REFERENCES auth.users(id);
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS assigned_doctor_name text;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS origin_facility_name text;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referring_staff_name text;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referring_staff_role text;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS referring_doctor_name text;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS receiving_doctor_id uuid REFERENCES auth.users(id);
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS receiving_doctor_name text;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.careline_invitation_rotate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF NEW.expires_at IS DISTINCT FROM OLD.expires_at OR NEW.role IS DISTINCT FROM OLD.role THEN NEW.activation_code:=gen_random_uuid(); END IF;
 RETURN NEW; END $$;
DROP TRIGGER IF EXISTS careline_invitation_rotate ON public.staff_invitations;
CREATE TRIGGER careline_invitation_rotate BEFORE UPDATE ON public.staff_invitations FOR EACH ROW EXECUTE FUNCTION public.careline_invitation_rotate();

-- Only a person possessing the private random code can resolve an invitation.
-- Possession does not grant membership: confirmed ownership of its email is required.
CREATE OR REPLACE FUNCTION public.careline_staff_activation(code uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; BEGIN
 SELECT jsonb_build_object('email',i.email,'role',i.role,'institution',f.name,'expires_at',i.expires_at) INTO result
 FROM public.staff_invitations i JOIN public.facilities f ON f.id=i.facility_id
 WHERE i.activation_code=code AND i.accepted_at IS NULL AND i.expires_at>now() AND f.status='active';
 IF result IS NULL THEN RAISE EXCEPTION 'Invitation unavailable or expired. Ask your institution administrator for a new invitation.'; END IF;
 RETURN result; END $$;

-- Invited staff do not acquire an accidental patient record through public signup.
CREATE OR REPLACE FUNCTION public.handle_new_patient() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF nullif(trim(NEW.raw_user_meta_data->>'first_name'),'') IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM public.staff_invitations WHERE lower(email)=lower(NEW.email) AND accepted_at IS NULL AND expires_at>now()) THEN
  INSERT INTO public.patients(auth_user_id,first_name,last_name,phone,email) VALUES(NEW.id,trim(NEW.raw_user_meta_data->>'first_name'),coalesce(trim(NEW.raw_user_meta_data->>'last_name'),''),coalesce(nullif(NEW.phone,''),NEW.raw_user_meta_data->>'phone'),NEW.email);
 END IF; RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.careline_handover_snapshot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF TG_TABLE_NAME='visits' THEN
  IF TG_OP='INSERT' AND NEW.assigned_doctor_id IS NULL THEN
   SELECT ref.receiving_doctor_id,ref.receiving_doctor_name INTO NEW.assigned_doctor_id,NEW.assigned_doctor_name
   FROM public.referrals ref JOIN public.facility_members m ON m.facility_id=ref.target_facility_id AND m.user_id=ref.receiving_doctor_id AND m.active AND m.role IN ('doctor','admin')
   WHERE ref.patient_id=NEW.patient_id AND ref.target_facility_id=NEW.facility_id AND ref.status='accepted' ORDER BY ref.created_at DESC LIMIT 1;
  END IF;
  IF NEW.assigned_doctor_id IS NULL AND NEW.status='consultation' AND public.careline_role(NEW.facility_id) IN ('doctor','admin') THEN
   NEW.assigned_doctor_id:=auth.uid();
   SELECT name INTO NEW.assigned_doctor_name FROM public.profiles WHERE id=auth.uid();
  END IF;
 ELSE
  IF TG_OP='INSERT' THEN
   SELECT name INTO NEW.origin_facility_name FROM public.facilities WHERE id=NEW.facility_id;
   SELECT name INTO NEW.referring_staff_name FROM public.profiles WHERE id=NEW.created_by;
   NEW.referring_staff_role:=public.careline_role(NEW.facility_id);
   SELECT assigned_doctor_name INTO NEW.referring_doctor_name FROM public.visits WHERE patient_id=NEW.patient_id AND facility_id=NEW.facility_id AND assigned_doctor_id IS NOT NULL ORDER BY date DESC LIMIT 1;
  ELSE NEW.version:=OLD.version+1; END IF;
 END IF;
 RETURN NEW; END $$;
DROP TRIGGER IF EXISTS careline_handover_snapshot ON public.visits;
CREATE TRIGGER careline_handover_snapshot BEFORE INSERT OR UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION public.careline_handover_snapshot();
DROP TRIGGER IF EXISTS careline_handover_snapshot ON public.referrals;
CREATE TRIGGER careline_handover_snapshot BEFORE INSERT OR UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.careline_handover_snapshot();

CREATE OR REPLACE FUNCTION public.careline_staff_care(action text,f uuid,payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r text; target uuid; clinician text; v public.visits; ref public.referrals; BEGIN
 r:=public.careline_role(f);
 IF r IS NULL THEN RAISE EXCEPTION 'Facility access denied'; END IF;
 IF action='revoke_invitation' THEN
  IF r<>'admin' THEN RAISE EXCEPTION 'Facility administrator required'; END IF;
  UPDATE public.staff_invitations SET expires_at=now() WHERE id=(payload->>'id')::uuid AND facility_id=f AND accepted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pending invitation unavailable'; END IF;
  RETURN jsonb_build_object('success',true);
 END IF;
 IF r NOT IN ('admin','doctor','nurse') THEN RAISE EXCEPTION 'Care team responsibility required'; END IF;
 target:=nullif(payload->>'doctor_id','')::uuid;
 SELECT p.name INTO clinician FROM public.facility_members m JOIN public.profiles p ON p.id=m.user_id WHERE m.facility_id=f AND m.user_id=target AND m.active AND m.role IN ('admin','doctor');
 IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active clinician in this institution'; END IF;
 IF action='assign_doctor' THEN
  SELECT * INTO v FROM public.visits WHERE id=(payload->>'id')::uuid AND facility_id=f FOR UPDATE;
  IF NOT FOUND OR v.status IN ('completed','cancelled') THEN RAISE EXCEPTION 'Open visit unavailable'; END IF;
  IF v.version IS DISTINCT FROM (payload->>'version')::integer THEN RAISE EXCEPTION 'This visit changed. Refresh before assigning.'; END IF;
  UPDATE public.visits SET assigned_doctor_id=target,assigned_doctor_name=coalesce(clinician,'Care clinician'),version=version+1 WHERE id=v.id;
 ELSIF action='referral_assign' THEN
  SELECT * INTO ref FROM public.referrals WHERE id=(payload->>'id')::uuid AND target_facility_id=f FOR UPDATE;
  IF NOT FOUND OR ref.status<>'accepted' THEN RAISE EXCEPTION 'Accept the incoming referral before assigning a clinician'; END IF;
  IF ref.version IS DISTINCT FROM (payload->>'version')::integer THEN RAISE EXCEPTION 'This referral changed. Refresh before assigning.'; END IF;
  UPDATE public.referrals SET receiving_doctor_id=target,receiving_doctor_name=coalesce(clinician,'Care clinician') WHERE id=ref.id;
 ELSE RAISE EXCEPTION 'Unknown staff-care action'; END IF;
 RETURN jsonb_build_object('success',true);
END $$;

CREATE OR REPLACE FUNCTION public.careline_context() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.profiles; chosen uuid; invitation public.staff_invitations; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to continue'; END IF;
 SELECT * INTO p FROM public.profiles WHERE id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Account profile missing. Contact support.'; END IF;
 -- Accept only invitations to an email whose ownership Auth has verified.
 FOR invitation IN SELECT i.* FROM public.staff_invitations i JOIN auth.users u ON u.id=auth.uid()
 WHERE lower(i.email)=lower(u.email) AND u.email_confirmed_at IS NOT NULL AND u.email NOT LIKE '%@patient.eco-medic.local'
 AND i.accepted_at IS NULL AND i.expires_at>now() FOR UPDATE OF i LOOP
  INSERT INTO public.facility_members(facility_id,user_id,role,active) VALUES(invitation.facility_id,auth.uid(),invitation.role,true) ON CONFLICT(facility_id,user_id) DO NOTHING;
  UPDATE public.staff_invitations SET accepted_at=now() WHERE id=invitation.id;
 END LOOP;
 chosen:=p.facility_id;
 IF public.careline_role(chosen) IS NULL THEN SELECT m.facility_id INTO chosen FROM public.facility_members m WHERE m.user_id=auth.uid() AND public.careline_role(m.facility_id) IS NOT NULL ORDER BY created_at LIMIT 1; END IF;
 UPDATE public.profiles SET facility_id=chosen WHERE id=auth.uid() AND facility_id IS DISTINCT FROM chosen;
 RETURN jsonb_build_object('name',p.name,'role',coalesce(public.careline_role(chosen),'patient'),'facility_id',chosen,'is_operator',public.careline_operator(),
 'memberships',coalesce((SELECT jsonb_agg(jsonb_build_object('facility_id',m.facility_id,'name',f.name,'facility_type',f.facility_type,'role',m.role,'badge_id',m.badge_id)) FROM public.facility_members m JOIN public.facilities f ON f.id=m.facility_id WHERE m.user_id=auth.uid() AND m.active AND f.status='active'),'[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.careline_invite_staff(f uuid, staff_email text, staff_role text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF public.careline_role(f) IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Facility administrator required'; END IF;
 IF staff_email NOT LIKE '%@%.%' OR staff_email LIKE '%@patient.eco-medic.local' THEN RAISE EXCEPTION 'Use a real staff email address'; END IF;
 INSERT INTO public.staff_invitations(facility_id,email,role,invited_by) VALUES(f,lower(trim(staff_email)),staff_role,auth.uid())
 ON CONFLICT(facility_id,email) DO UPDATE SET role=excluded.role,invited_by=auth.uid(),accepted_at=NULL,expires_at=now()+interval '7 days'; END $$;

DROP TRIGGER IF EXISTS careline_audit ON public.staff_invitations;
CREATE TRIGGER careline_audit AFTER INSERT OR UPDATE OR DELETE ON public.staff_invitations FOR EACH ROW EXECUTE FUNCTION public.careline_audit();

REVOKE ALL ON FUNCTION public.careline_invitation_rotate(),public.careline_handover_snapshot(),public.careline_staff_activation(uuid),public.careline_staff_care(text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.careline_staff_activation(uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.careline_staff_care(text,uuid,jsonb) TO authenticated;
COMMIT;
