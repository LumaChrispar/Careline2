import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const id = n => `10000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const admin=id(1), nurse=id(2), patient=id(3), outsider=id(4), labtech=id(5), f=id(10), other=id(11)
let pid
async function asUser(user) {
  await db.exec('RESET ROLE; SET ROLE authenticated')
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user])
}
async function command(action,payload,facility=f,fn='careline_coordination') {
  return (await db.query(`SELECT public.${fn}($1,$2,$3) result`,[action,facility,JSON.stringify(payload)])).rows[0].result
}
const clinical=(action,payload)=>command(action,payload,f,'careline_command')
const row=async(table,rid)=>(await db.query(`SELECT * FROM public.${table} WHERE id=$1`,[rid])).rows[0]
before(async()=>{
  await db.exec(await readFile('tests/fixtures/supabase-platform.sql','utf8'))
  await db.exec(await readFile('database.sql','utf8'))
  for(const user of [admin,nurse,patient,outsider,labtech]) await db.query('INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,now())',[user,`${user}@test.invalid`])
  await db.query("INSERT INTO public.facilities(id,name,status) VALUES($1,'Centre A','active'),($2,'Centre B','active')",[f,other])
  for(const [user,role,facility] of [[admin,'admin',f],[nurse,'nurse',f],[labtech,'labtech',f],[outsider,'doctor',other]]) await db.query('INSERT INTO public.facility_members(facility_id,user_id,role,active) VALUES($1,$2,$3,true)',[facility,user,role])
  await asUser(admin)
  pid=(await clinical('register',{first_name:'Test',last_name:'Patient'})).id
  await db.exec('RESET ROLE')
  await db.query('UPDATE public.patients SET auth_user_id=$1 WHERE id=$2',[patient,pid])
})
after(()=>db.close())

test('concerns require a linked patient or local care team, and a recorded response',async()=>{
  await asUser(outsider)
  await assert.rejects(command('concern_add',{patient_id:pid,concern:'Unauthorized'},f),/registered/)
  await asUser(patient)
  await assert.rejects(command('concern_add',{patient_id:pid,concern:'Wrong institution'},other),/registered/)
  const concern=await command('concern_add',{patient_id:pid,concern:'Transport makes return visits difficult',preferred_language:'French'})
  await assert.rejects(command('concern_review',{id:concern.id,response:'Self review'}),/access denied/)
  await asUser(outsider)
  assert.equal(await row('patient_concerns',concern.id),undefined)
  await asUser(nurse)
  await assert.rejects(command('concern_review',{id:concern.id,response:' '}),/response required/)
  await command('concern_review',{id:concern.id,response:'Discussed return arrangements with patient'})
  await asUser(patient)
  assert.equal((await row('patient_concerns',concern.id)).status,'reviewed')
  await assert.rejects(db.query("UPDATE public.patient_concerns SET response='changed' WHERE id=$1",[concern.id]),/permission denied/)
})

test('care plan drafts stay private until clinician approval; stale changes fail',async()=>{
  await asUser(nurse)
  await assert.rejects(command('plan_save',{patient_id:pid,summary:'Unauthorized'}),/Clinician/)
  await asUser(admin)
  const plan=await command('plan_save',{patient_id:pid,summary:'Agreed care instructions',next_steps:'Return at the agreed date'})
  await asUser(patient)
  assert.equal(await row('care_plans',plan.id),undefined)
  await assert.rejects(command('plan_acknowledge',{id:plan.id}),/unavailable/)
  await asUser(nurse)
  await assert.rejects(command('plan_publish',{id:plan.id,version:1}),/Clinician/)
  await asUser(admin)
  await command('plan_save',{id:plan.id,patient_id:pid,version:1,summary:'Updated instructions'})
  await assert.rejects(command('plan_publish',{id:plan.id,version:1}),/changed/)
  await command('plan_publish',{id:plan.id,version:2})
  await assert.rejects(command('plan_save',{id:plan.id,patient_id:pid,version:3,summary:'Overwrite'}),/draft/)
  await asUser(outsider)
  assert.equal(await row('care_plans',plan.id),undefined)
  await assert.rejects(command('plan_acknowledge',{id:plan.id}),/unavailable/)
  await asUser(patient)
  assert.equal((await row('care_plans',plan.id)).summary,'Updated instructions')
  await command('plan_acknowledge',{id:plan.id})
  assert.ok((await row('care_plans',plan.id)).acknowledged_at)
  await asUser(admin)
  const replacement=await command('plan_save',{patient_id:pid,summary:'New visit instructions'})
  await command('plan_publish',{id:replacement.id,version:1})
  assert.equal((await row('care_plans',plan.id)).status,'superseded')
  assert.equal((await db.query("SELECT * FROM public.care_plans WHERE status='published' AND patient_id=$1",[pid])).rows.length,1)
})

test('tasks validate ownership, deadline, handover version and completion outcome',async()=>{
  await asUser(nurse)
  const payload={id:id(30),title:'Confirm return arrangements',patient_id:pid,assigned_to:nurse,due_at:'2099-01-01T09:00:00Z'}
  await assert.rejects(command('task_create',{...payload,assigned_to:outsider}),/active colleague/)
  await assert.rejects(command('task_create',{...payload,due_at:''}),/due date/)
  await command('task_create',payload);await command('task_create',payload)
  assert.equal((await db.query('SELECT * FROM public.care_tasks WHERE id=$1',[payload.id])).rows.length,1)
  await asUser(labtech)
  assert.equal(await row('care_tasks',payload.id),undefined)
  await assert.rejects(command('task_update',{id:payload.id,version:1,status:'completed',outcome:'Unauthorized'}),/access denied/)
  await asUser(nurse)
  await command('task_update',{id:payload.id,version:1,assigned_to:admin,status:'in_progress',outcome:'Handed over at shift change'})
  await assert.rejects(command('task_update',{id:payload.id,version:1,status:'waiting',outcome:'Old version'}),/changed/)
  await asUser(admin)
  await assert.rejects(command('task_update',{id:payload.id,version:2,status:'completed'}),/outcome/)
  await command('task_update',{id:payload.id,version:2,status:'completed',outcome:'Return arrangements agreed'})
  assert.equal((await row('care_tasks',payload.id)).completed_by,admin)
  await assert.rejects(command('task_update',{id:payload.id,version:3,status:'open'}),/Closed/)
})

test('unassigned imported tasks cannot bypass authorization through null values',async()=>{
  await db.exec('RESET ROLE')
  await db.query("INSERT INTO public.care_tasks(id,facility_id,title,required_role,due_at) VALUES($1,$2,'Imported clinician task','doctor',now())",[id(31),f])
  await asUser(nurse)
  assert.equal(await row('care_tasks',id(31)),undefined)
  await assert.rejects(command('task_update',{id:id(31),version:1,status:'in_progress'}),/access denied/)
})

test('completed labs create one review task; urgent escalation needs a clinician and review closes it',async()=>{
  await asUser(admin)
  const lab=await clinical('lab_order',{patient_id:pid,test_type:'Example test'})
  await asUser(labtech)
  await clinical('lab_complete',{id:lab.id,summary:'Test result for workflow validation'})
  await assert.rejects(command('lab_escalate',{id:lab.id,assigned_to:nurse,reason:'Staff flagged for urgent review'}),/clinician/)
  await assert.rejects(command('lab_escalate',{id:lab.id,assigned_to:admin,reason:''}),/reason required/)
  await command('lab_escalate',{id:lab.id,assigned_to:admin,reason:'Staff flagged for urgent review'})
  await asUser(admin)
  const tasks=(await db.query("SELECT * FROM public.care_tasks WHERE linked_id=$1 AND source='lab_review'",[lab.id])).rows
  assert.equal(tasks.length,1)
  const task=tasks[0];assert.equal(task.priority,'urgent');assert.equal(task.assigned_to,admin)
  assert.equal((await row('lab_results',lab.id)).critical,true)
  await assert.rejects(command('task_update',{id:task.id,version:task.version,status:'completed',outcome:'Bypass'}),/Review the laboratory/)
  await assert.rejects(command('task_update',{id:task.id,version:task.version,due_at:'2099-01-01'}),/cannot be postponed/)
  await clinical('lab_review',{id:lab.id})
  assert.equal((await row('care_tasks',task.id)).status,'completed')
  assert.equal((await row('care_tasks',task.id)).completed_by,admin)
  await assert.rejects(command('lab_escalate',{id:lab.id,assigned_to:admin,reason:'Too late'}),/unreviewed/)
})

test('follow-up tasks use Cameroon time, track date changes and cancel when removed',async()=>{
  await asUser(admin)
  const visit=await clinical('arrive',{patient_id:pid})
  await clinical('visit',{id:visit.id,version:1,status:'consultation',follow_up_date:'2099-01-02'})
  const getTask=async()=>(await db.query("SELECT * FROM public.care_tasks WHERE linked_id=$1 AND source='follow_up'",[visit.id])).rows[0]
  assert.equal(new Date((await getTask()).due_at).toISOString(),'2099-01-02T08:00:00.000Z')
  await clinical('visit',{id:visit.id,version:2,status:'consultation',follow_up_date:'2099-01-03'})
  assert.equal(new Date((await getTask()).due_at).toISOString(),'2099-01-03T08:00:00.000Z')
  await clinical('visit',{id:visit.id,version:3,status:'consultation',follow_up_date:''})
  assert.equal((await getTask()).status,'cancelled')
})

test('repeat installation preserves plans and tasks and denies anonymous coordination',async()=>{
  await db.exec('RESET ROLE')
  const before=(await db.query('SELECT count(*)::int n FROM public.care_tasks')).rows[0].n
  await db.exec('GRANT UPDATE(status) ON public.care_tasks TO authenticated; GRANT UPDATE(summary) ON public.care_plans TO authenticated')
  await db.exec(await readFile('database.sql','utf8'))
  await asUser(admin)
  await assert.rejects(db.exec("UPDATE public.care_tasks SET status='completed'"),/permission denied/)
  await assert.rejects(db.exec("UPDATE public.care_plans SET summary='Bypassed approval'"),/permission denied/)
  await db.exec('RESET ROLE')
  assert.equal((await db.query('SELECT count(*)::int n FROM public.care_tasks')).rows[0].n,before)
  await db.exec('SET ROLE anon')
  await assert.rejects(command('task_create',{}),/permission denied/)
})
