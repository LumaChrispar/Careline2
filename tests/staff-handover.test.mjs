import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
const db=new PGlite(),id=n=>'70000000-0000-4000-8000-'+String(n).padStart(12,'0')
const admin=id(1),nurse=id(2),doctor=id(3),receiver=id(4),invited=id(5),f=id(10),other=id(11)
let patient,visit,referral
async function asUser(user){await db.exec('RESET ROLE; SET ROLE authenticated');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user])}
async function rpc(fn,args){return (await db.query('SELECT public.'+fn+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') result',args)).rows[0].result}
const cmd=(action,payload,facility=f)=>rpc('careline_command',[action,facility,JSON.stringify(payload)])
const care=(action,payload,facility=f)=>rpc('careline_staff_care',[action,facility,JSON.stringify(payload)])
before(async()=>{
 await db.exec(await readFile('tests/fixtures/supabase-platform.sql','utf8'));await db.exec(await readFile('database.sql','utf8'))
 for(const [user,name] of [[admin,'Head A'],[nurse,'Nurse A'],[doctor,'Doctor A'],[receiver,'Doctor B']])await db.query('INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES($1,$2,now(),$3)',[user,user+'@test.invalid',JSON.stringify({name})])
 await db.query("INSERT INTO public.facilities(id,name,status) VALUES($1,'Centre A','active'),($2,'Centre B','active')",[f,other])
 for(const [user,role,facility] of [[admin,'admin',f],[nurse,'nurse',f],[doctor,'doctor',f],[receiver,'doctor',other]])await db.query('INSERT INTO public.facility_members(facility_id,user_id,role,active) VALUES($1,$2,$3,true)',[facility,user,role])
})
after(()=>db.close())
test('only institution administrators add staff; private activation requires a valid code',async()=>{
 await asUser(nurse);await assert.rejects(rpc('careline_invite_staff',[f,'invited@test.invalid','doctor']),/administrator/)
 await asUser(admin);await rpc('careline_invite_staff',[f,'invited@test.invalid','doctor'])
 const invitation=(await db.query("SELECT * FROM public.staff_invitations WHERE email='invited@test.invalid'")).rows[0]
 await db.exec('SET ROLE anon')
 await assert.rejects(rpc('careline_staff_activation',[id(99)]),/unavailable/)
 const info=await rpc('careline_staff_activation',[invitation.activation_code]);assert.equal(info.institution,'Centre A');assert.equal(info.email,'invited@test.invalid')
 await assert.rejects(db.query('SELECT * FROM public.staff_invitations'),/permission denied/)
})
test('invitation membership requires confirmed email, exposes a stable badge and avoids accidental patient registration',async()=>{
 await db.exec('RESET ROLE')
 await db.query("INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,'invited@test.invalid',$2)",[invited,JSON.stringify({name:'Invited Doctor',first_name:'Invited',last_name:'Doctor',role:'admin',facility_id:other})])
 assert.equal((await db.query('SELECT * FROM public.patients WHERE auth_user_id=$1',[invited])).rows.length,0)
 await asUser(invited);assert.equal((await rpc('careline_context',[])).role,'patient')
 await db.exec('RESET ROLE');await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1',[invited])
 await asUser(invited);const context=await rpc('careline_context',[])
 assert.equal(context.role,'doctor');assert.equal(context.facility_id,f);assert.match(context.memberships[0].badge_id,/^CL-S-[A-F0-9]{12}$/)
 assert.equal((await rpc('careline_context',[])).memberships[0].badge_id,context.memberships[0].badge_id)
 await asUser(admin);const invitation=(await db.query("SELECT * FROM public.staff_invitations WHERE email='invited@test.invalid'")).rows[0]
 await assert.rejects(rpc('careline_staff_activation',[invitation.activation_code]),/unavailable/)
 await rpc('careline_manage_member',[f,invited,'doctor',false]);await rpc('careline_invite_staff',[f,'invited@test.invalid','doctor'])
 await asUser(invited);assert.equal((await rpc('careline_context',[])).role,'patient')
})
test('revoking and renewing an invitation invalidates its old setup code',async()=>{
 await asUser(admin);await rpc('careline_invite_staff',[f,'second@test.invalid','nurse'])
 const old=(await db.query("SELECT * FROM public.staff_invitations WHERE email='second@test.invalid'")).rows[0]
 await care('revoke_invitation',{id:old.id})
 await assert.rejects(rpc('careline_staff_activation',[old.activation_code]),/unavailable/)
 await rpc('careline_invite_staff',[f,'second@test.invalid','nurse'])
 const renewed=(await db.query('SELECT * FROM public.staff_invitations WHERE id=$1',[old.id])).rows[0]
 assert.notEqual(renewed.activation_code,old.activation_code)
 await assert.rejects(rpc('careline_staff_activation',[old.activation_code]),/unavailable/)
 assert.equal((await rpc('careline_staff_activation',[renewed.activation_code])).role,'nurse')
})
test('reception arrivals do not label a nurse as the doctor; assignments validate role, institution and version',async()=>{
 await asUser(nurse);patient=(await cmd('register',{first_name:'Test',last_name:'Patient'})).id;visit=await cmd('arrive',{patient_id:patient})
 assert.equal(visit.assigned_doctor_id,null)
 await assert.rejects(care('assign_doctor',{id:visit.id,version:1,doctor_id:nurse}),/active clinician/)
 await assert.rejects(care('assign_doctor',{id:visit.id,version:1,doctor_id:receiver}),/active clinician/)
 await care('assign_doctor',{id:visit.id,version:1,doctor_id:doctor})
 await assert.rejects(care('assign_doctor',{id:visit.id,version:1,doctor_id:admin}),/changed/)
 assert.equal((await db.query('SELECT assigned_doctor_name FROM public.visits WHERE id=$1',[visit.id])).rows[0].assigned_doctor_name,'Doctor A')
})
test('consented referral snapshots the originating clinician without opening private consultations',async()=>{
 await asUser(nurse);referral=(await cmd('refer',{patient_id:patient,target_facility_id:other,reason:'Agreed handover summary',consent_recorded:true})).id
 await asUser(receiver)
 const row=(await db.query('SELECT * FROM public.referrals WHERE id=$1',[referral])).rows[0]
 assert.equal(row.origin_facility_name,'Centre A');assert.equal(row.referring_staff_name,'Nurse A');assert.equal(row.referring_doctor_name,'Doctor A')
 assert.equal((await db.query('SELECT * FROM public.visits WHERE id=$1',[visit.id])).rows.length,0)
 await assert.rejects(care('referral_assign',{id:referral,version:1,doctor_id:receiver},other),/Accept/)
 await cmd('referral_status',{id:referral,status:'accepted'},other)
 await care('referral_assign',{id:referral,version:2,doctor_id:receiver},other)
 await assert.rejects(care('referral_assign',{id:referral,version:2,doctor_id:receiver},other),/changed/)
 const arrival=await cmd('arrive',{patient_id:patient},other)
 assert.equal(arrival.assigned_doctor_name,'Doctor B')
 await asUser(nurse)
 assert.equal((await db.query('SELECT receiving_doctor_name FROM public.referrals WHERE id=$1',[referral])).rows[0].receiving_doctor_name,'Doctor B')
 assert.equal((await db.query('SELECT * FROM public.visits WHERE id=$1',[arrival.id])).rows.length,0)
})
