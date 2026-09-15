import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const admin = '10000000-0000-4000-8000-000000000001'
const nurse = '10000000-0000-4000-8000-000000000002'
const outsider = '10000000-0000-4000-8000-000000000003'
const facility = '20000000-0000-4000-8000-000000000001'
const otherFacility = '20000000-0000-4000-8000-000000000002'
const requestId = '30000000-0000-4000-8000-000000000001'
async function asUser(id) {
  await db.exec('RESET ROLE; SET ROLE authenticated;')
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id])
}
async function cmd(action, payload, f=facility) { return (await db.query('SELECT public.careline_command($1,$2,$3) AS result',[action,f,JSON.stringify(payload)])).rows[0].result }
before(async () => {
  await db.exec(await readFile('tests/fixtures/supabase-platform.sql','utf8'))
  await db.exec(await readFile('database-migrations/20260910_careline.sql','utf8'))
  await db.query(`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,'admin@example.com',now()),($2,'nurse@example.com',now()),($3,'outsider@example.com',now())`,[admin,nurse,outsider])
  await db.query(`INSERT INTO public.facilities(id,name,status) VALUES($1,'Centre A','active'),($2,'Centre B','active')`,[facility,otherFacility])
  await db.query(`INSERT INTO public.facility_members(facility_id,user_id,role,active) VALUES($1,$2,'admin',true),($1,$3,'nurse',true),($4,$5,'doctor',true)`,[facility,admin,nurse,otherFacility,outsider])
})
after(() => db.close())

test('schema installs and can be applied twice without duplicates or weakened permissions', async () => {
  await db.exec(await readFile('database-migrations/20260910_careline.sql','utf8'))
  assert.equal((await db.query("SELECT public FROM storage.buckets WHERE id='LAB_result'")).rows[0].public,false)
})
test('anonymous users cannot call privileged workflow commands', async () => {
  await db.exec('SET ROLE anon')
  await assert.rejects(cmd('register',{first_name:'A',last_name:'B'}),/permission denied/)
})
test('metadata cannot promote a user or grant another institution', async () => {
  await db.exec('RESET ROLE')
  await db.query(`UPDATE auth.users SET raw_user_meta_data='{"role":"admin"}' WHERE id=$1`,[outsider])
  await asUser(outsider)
  assert.equal((await db.query('SELECT public.careline_role($1) r',[facility])).rows[0].r,null)
  await assert.rejects(cmd('register',{first_name:'A',last_name:'B'}),/access denied/)
})
test('nurse can register without birth date; retry does not duplicate patient', async () => {
  await asUser(nurse)
  const payload={id:requestId,first_name:'Amina',last_name:'Ngwa',phone:'+237677123456'}
  const one=await cmd('register',payload), two=await cmd('register',payload)
  assert.equal(one.id,two.id); assert.equal(one.date_of_birth,null)
  assert.equal((await db.query('SELECT count(*)::int count FROM public.patients')).rows[0].count,1)
})
test('shared phone numbers are allowed; staff cannot see another facility patient', async () => {
  await asUser(nurse)
  await cmd('register',{first_name:'Child',last_name:'Ngwa',phone:'+237677123456'})
  await asUser(outsider)
  assert.equal((await db.query('SELECT * FROM public.patients')).rows.length,0)
})
test('arrivals are unique and stale updates are rejected', async () => {
  await asUser(nurse)
  const v=await cmd('arrive',{patient_id:'CL-'+requestId})
  await assert.rejects(cmd('arrive',{patient_id:'CL-'+requestId}),/duplicate key/)
  await cmd('visit',{id:v.id,version:1,status:'triage'})
  await assert.rejects(cmd('visit',{id:v.id,version:1,status:'consultation'}),/changed/)
  await assert.rejects(cmd('visit',{id:v.id,version:2,status:'completed',diagnosis:'Example'}),/clinician/)
})
test('partial dispensing is atomic, bounded by stock and the prescription', async () => {
  await asUser(admin)
  const rx=(await cmd('prescribe',{patient_id:'CL-'+requestId,medication:'Example medicine',instructions:'As prescribed',quantity:10})).id
  const batch=(await cmd('stock',{medication:'Example medicine',batch_number:'TEST-1',expires_on:'2099-01-01',quantity:20,unit_price:100})).id
  const dispensing={id:'40000000-0000-4000-8000-000000000001',prescription_id:rx,batch_id:batch,quantity:6}
  await cmd('dispense',dispensing); await cmd('dispense',dispensing)
  await assert.rejects(cmd('dispense',{prescription_id:rx,batch_id:batch,quantity:5}),/remaining prescription/)
  assert.equal((await db.query('SELECT quantity FROM public.stock_batches WHERE id=$1',[batch])).rows[0].quantity,14)
})
test('partial payments prevent overpayment and repeated transactions', async () => {
  await asUser(admin)
  const invoice=(await cmd('invoice',{patient_id:'CL-'+requestId,description:'Consultation',total:5000})).id
  const payment={id:'50000000-0000-4000-8000-000000000001',invoice_id:invoice,amount:2000,method:'cash'}
  await cmd('pay',payment); await cmd('pay',payment)
  await assert.rejects(cmd('pay',{invoice_id:invoice,amount:4000,method:'cash'}),/exceeds balance/)
  await cmd('pay',{invoice_id:invoice,amount:3000,method:'orange_money',reference:'TEST-RECEIPT'})
  assert.equal((await db.query('SELECT status FROM public.invoices WHERE id=$1',[invoice])).rows[0].status,'paid')
})
test('completed laboratory results require clinician review', async () => {
  await asUser(admin)
  const lab=(await cmd('lab_order',{patient_id:'CL-'+requestId,test_type:'Example test'})).id
  await assert.rejects(cmd('lab_review',{id:lab}),/completed/)
  await cmd('lab_progress',{id:lab,specimen_reference:'S-1'})
  await cmd('lab_complete',{id:lab,summary:'Example result'})
  await asUser(nurse)
  await assert.rejects(cmd('lab_review',{id:lab}),/Clinician/)
  await asUser(admin)
  await cmd('lab_review',{id:lab})
  assert.equal((await db.query('SELECT reviewed_by FROM public.lab_results WHERE id=$1',[lab])).rows[0].reviewed_by,admin)
})
test('historical column grants cannot bypass command validation', async () => {
  await db.exec('RESET ROLE; GRANT UPDATE(notes) ON public.visits TO authenticated; GRANT INSERT ON public.lab_results TO authenticated;')
  await db.exec(await readFile('database.sql','utf8'))
  await asUser(admin)
  await assert.rejects(db.exec("UPDATE public.visits SET notes='Bypassed'"),/permission denied/)
  await assert.rejects(db.query("INSERT INTO public.lab_results(patient_id,test_type) VALUES($1,'Bypassed')",['CL-'+requestId]),/permission denied/)
})

test('directory and targeted notices respect active facility memberships', async () => {
  await asUser(nurse)
  const directory=(await db.query('SELECT public.careline_staff_directory($1) AS result',[facility])).rows[0].result
  assert.equal(directory.length,2)
  assert.ok(directory.every(p=>!('email' in p)))
  await assert.rejects(db.query('SELECT public.careline_staff_directory($1)',[otherFacility]),/access denied/)
  const notice=(await cmd('notice',{content:'Shift handover',priority:'urgent',target_type:'individual',target_user_id:admin})).id
  await assert.rejects(cmd('notice',{content:'Invalid audience',priority:'normal',target_type:'individual',target_user_id:outsider}),/active colleague/)
  await asUser(outsider)
  assert.equal((await db.query('SELECT * FROM public.staff_broadcasts WHERE id=$1',[notice])).rows.length,0)
  await assert.rejects(cmd('delete_notice',{id:notice}),/access denied/)
  await asUser(admin)
  assert.equal((await db.query('SELECT content FROM public.staff_broadcasts WHERE id=$1',[notice])).rows[0].content,'Shift handover')
  await cmd('delete_notice',{id:notice})
  assert.equal((await db.query("SELECT * FROM public.audit_events WHERE entity='staff_broadcasts' AND action='DELETE' AND entity_id=$1",[notice])).rows.length,1)
})

test('referrals require consent and acceptance without exposing originating visits', async () => {
  await asUser(admin)
  await assert.rejects(cmd('refer',{patient_id:'CL-'+requestId,target_facility_id:otherFacility,reason:'Follow-up',consent_recorded:false}),/check constraint/)
  const referral=(await cmd('refer',{patient_id:'CL-'+requestId,target_facility_id:otherFacility,reason:'Follow-up',consent_recorded:true})).id
  await asUser(outsider)
  await assert.rejects(cmd('referral_status',{id:referral,status:'completed'},otherFacility),/invalid transition/)
  await cmd('referral_status',{id:referral,status:'accepted'},otherFacility)
  assert.equal((await db.query('SELECT * FROM public.patients WHERE id=$1',['CL-'+requestId])).rows.length,1)
  assert.equal((await db.query('SELECT * FROM public.visits')).rows.length,0)
  await cmd('referral_status',{id:referral,status:'completed'},otherFacility)
})

test('appointment arrival creates one visit and closed appointments stay closed', async () => {
  await asUser(admin)
  const patient=await cmd('register',{first_name:'Booking',last_name:'Test'})
  const appointment=(await cmd('appointment',{patient_id:patient.id,scheduled_at:'2099-01-01T10:00:00Z',reason:'Follow-up'})).id
  await assert.rejects(cmd('appointment_status',{id:appointment,status:'requested'}),/Invalid appointment status/)
  await cmd('appointment_status',{id:appointment,status:'arrived'})
  await assert.rejects(cmd('appointment_status',{id:appointment,status:'arrived'}),/unavailable/)
  assert.equal((await db.query('SELECT count(*)::int n FROM public.visits WHERE patient_id=$1',[patient.id])).rows[0].n,1)
})

test('standalone results require laboratory permission and the correct private attachment', async () => {
  await asUser(nurse)
  await assert.rejects(cmd('lab_upload',{patient_id:'CL-'+requestId,test_type:'Test',summary:'Result'}),/Laboratory/)
  await asUser(admin)
  await assert.rejects(cmd('lab_upload',{patient_id:'CL-'+requestId,test_type:'Test',summary:'Result',storage_path:otherFacility+'/other/file.pdf'}),/private attachment/)
  const lab=(await cmd('lab_upload',{patient_id:'CL-'+requestId,test_type:'Test',summary:'Result'})).id
  assert.equal((await db.query('SELECT status FROM public.lab_results WHERE id=$1',[lab])).rows[0].status,'completed')
})

test('fully dispensed prescriptions leave the active queue', async () => {
  await asUser(admin)
  const rx=(await cmd('prescribe',{patient_id:'CL-'+requestId,medication:'Complete test',instructions:'Example',quantity:2})).id
  const batch=(await cmd('stock',{medication:'Complete test',batch_number:'COMPLETE-1',expires_on:'2099-01-01',quantity:4,unit_price:100})).id
  await cmd('dispense',{prescription_id:rx,batch_id:batch,quantity:2})
  assert.equal((await db.query('SELECT status FROM public.prescriptions WHERE id=$1',[rx])).rows[0].status,'completed')
  await assert.rejects(cmd('dispense',{prescription_id:rx,batch_id:batch,quantity:1}),/Active prescription/)
})

test('membership revocation is immediate and the last administrator is protected', async () => {
  await asUser(admin)
  await assert.rejects(db.query('SELECT public.careline_manage_member($1,$2,$3,$4)',[facility,admin,'nurse',true]),/at least one/)
  await db.query('SELECT public.careline_manage_member($1,$2,$3,$4)',[facility,nurse,'nurse',false])
  await asUser(nurse)
  await assert.rejects(cmd('register',{first_name:'A',last_name:'B'}),/access denied/)
})

test('an assigned external pharmacy can identify and bill a patient without seeing consultations', async () => {
  const pharmacist='10000000-0000-4000-8000-000000000004',pharmacy='20000000-0000-4000-8000-000000000004'
  await db.exec('RESET ROLE')
  await db.query("INSERT INTO auth.users(id,email) VALUES($1,'pharmacist@example.com')",[pharmacist])
  await db.query("INSERT INTO public.facilities(id,name,status,facility_type) VALUES($1,'External pharmacy','active','pharmacy')",[pharmacy])
  await db.query("INSERT INTO public.facility_members(facility_id,user_id,role,active) VALUES($1,$2,'pharmacist',true)",[pharmacy,pharmacist])
  await asUser(pharmacist)
  assert.equal((await db.query('SELECT * FROM public.patients WHERE id=$1',['CL-'+requestId])).rows.length,0)
  await asUser(admin)
  const rx=(await cmd('prescribe',{patient_id:'CL-'+requestId,pharmacy_id:pharmacy,medication:'External test',instructions:'Example',quantity:2})).id
  await asUser(pharmacist)
  assert.equal((await db.query('SELECT * FROM public.patients WHERE id=$1',['CL-'+requestId])).rows.length,1)
  assert.equal((await db.query('SELECT * FROM public.visits')).rows.length,0)
  const batch=(await cmd('stock',{medication:'External test',batch_number:'EXT-1',expires_on:'2099-01-01',quantity:2,unit_price:100},pharmacy)).id
  await cmd('dispense',{prescription_id:rx,batch_id:batch,quantity:2},pharmacy)
  const invoice=await cmd('invoice',{patient_id:'CL-'+requestId,description:'Dispensed medicine',total:200},pharmacy)
  assert.ok(invoice.id)
})

test('root SQL is the complete current installation script', async () => {
  assert.equal(await readFile('database.sql','utf8'),await readFile('database-migrations/20260910_careline.sql','utf8'))
})

test('original database upgrades without losing records or trusting legacy roles', async () => {
  const legacy=new PGlite()
  try {
    await legacy.exec(await readFile('tests/fixtures/supabase-platform.sql','utf8'))
    // gen_random_uuid is built in; PGlite has no Supabase realtime publication.
    const oldSql=(await readFile('tests/fixtures/legacy-database.sql','utf8')).replace(/^CREATE EXTENSION.*$/gm,'').replace(/^ALTER PUBLICATION.*$/gm,'')
    await legacy.exec(oldSql)
    await legacy.query("INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,'legacy@example.com',$2)",[admin,JSON.stringify({role:'doctor',name:'Legacy doctor'})])
    await legacy.query("INSERT INTO public.facilities(id,name) VALUES($1,'Legacy centre')",[facility])
    await legacy.query("UPDATE public.profiles SET facility_id=$1,role='doctor' WHERE id=$2",[facility,admin])
    await legacy.query("INSERT INTO public.patients(id,first_name,last_name,date_of_birth,facility_id) VALUES('LEGACY-1','Existing','Patient','1990-01-01',$1)",[facility])
    await legacy.query("INSERT INTO public.lab_results(patient_id,test_type,summary,notified_at,facility_id) VALUES('LEGACY-1','Historical test','Historical result',now(),$1)",[facility])
    await legacy.exec(await readFile('database.sql','utf8'))
    await legacy.exec(await readFile('database.sql','utf8'))
    assert.equal((await legacy.query("SELECT count(*)::int n FROM public.patients WHERE id='LEGACY-1'")).rows[0].n,1)
    assert.equal((await legacy.query('SELECT active FROM public.facility_members WHERE user_id=$1',[admin])).rows[0].active,false)
    assert.equal((await legacy.query("SELECT status FROM public.lab_results WHERE patient_id='LEGACY-1'")).rows[0].status,'completed')
    assert.equal((await legacy.query("SELECT public FROM storage.buckets WHERE id='LAB_result'")).rows[0].public,false)
    await legacy.exec('SET ROLE authenticated')
    await legacy.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[admin])
    await assert.rejects(legacy.query('SELECT public.admin_delete_user($1)',[admin]),/permission denied/)
  } finally { await legacy.close() }
})
