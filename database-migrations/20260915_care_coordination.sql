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
