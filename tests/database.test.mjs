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
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,phone text,raw_user_meta_data jsonb DEFAULT '{}',email_confirmed_at timestamptz,updated_at timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth,public TO authenticated,anon;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text,owner_id text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array($1,'/') $$;
  `)
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
test('membership revocation is immediate and the last administrator is protected', async () => {
  await asUser(admin)
  await assert.rejects(db.query('SELECT public.careline_manage_member($1,$2,$3,$4)',[facility,admin,'nurse',true]),/at least one/)
  await db.query('SELECT public.careline_manage_member($1,$2,$3,$4)',[facility,nurse,'nurse',false])
  await asUser(nurse)
  await assert.rejects(cmd('register',{first_name:'A',last_name:'B'}),/access denied/)
})
