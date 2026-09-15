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
