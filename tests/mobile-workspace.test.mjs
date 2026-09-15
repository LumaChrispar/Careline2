import {test} from 'node:test'
import assert from 'node:assert/strict'
import {dashboardRoles,dashboardWork,loadDashboard,cameroonDate,connected,transientConnectionError} from '../ecomedik-mobile/src/lib/dashboard.mjs'
import {validateAttachment,submitNativeResult} from '../ecomedik-mobile/src/lib/nativeUpload.mjs'

const now=new Date('2026-09-15T23:30:00Z')
test('native homes expose distinct primary work for all six roles',()=>{
  assert.deepEqual(Object.keys(dashboardRoles).sort(),['admin','doctor','labtech','nurse','patient','pharmacist'])
  assert.equal(dashboardRoles.nurse.actions[0][0],'register')
  assert.equal(dashboardRoles.doctor.actions[0][0],'patients')
  assert.equal(dashboardRoles.pharmacist.actions[0][0],'pharmacy')
  assert.equal(dashboardRoles.admin.actions[0][0],'team')
  assert.equal(dashboardRoles.patient.actions[0][0],'plan')
  for(const [role,config] of Object.entries(dashboardRoles)){
    assert.equal(config.actions.length,3)
    if(role!=='labtech')assert.ok(!config.actions.some(([key])=>key==='upload'))
    if(role!=='admin')assert.ok(!config.actions.some(([key])=>key==='team'))
  }
})
test('clinical dashboard prioritizes urgent visits and limits tasks to the signed-in owner',()=>{
  const work=dashboardWork('doctor',{
    visits:[{id:'old',facility_id:'f',status:'waiting',priority:'routine',date:'2026-01-01'}, {id:'emergency',facility_id:'f',status:'triage',priority:'emergency',date:'2026-09-15'}, {id:'closed',facility_id:'f',status:'completed'}, {id:'other',facility_id:'elsewhere',status:'waiting'}],
    tasks:[{id:'mine',facility_id:'f',assigned_to:'me',status:'open',due_at:'2026-01-01'},{id:'colleague',facility_id:'f',assigned_to:'other',status:'open'},{id:'closed',facility_id:'f',assigned_to:'me',status:'completed'},{id:'unassigned',facility_id:'f',status:'open',due_at:'2099-01-01'}],
    labs:[{id:'regular',facility_id:'f',status:'completed',uploaded_at:'2026-01-01'},{id:'urgent',facility_id:'f',status:'completed',critical:true,uploaded_at:'2026-09-01'},{id:'reviewed',facility_id:'f',status:'reviewed'}],
  },'f','me',now)
  assert.deepEqual(work.visits.map(v=>v.id),['emergency','old'])
  assert.deepEqual(work.tasks.map(t=>t.id),['mine','unassigned'])
  assert.deepEqual(work.labs.map(l=>l.id),['urgent','regular'])
})
test('pharmacy home excludes completed, ended, future and externally assigned prescriptions',()=>{
  const base={facility_id:'f',status:'active',starts_on:'2026-01-01'}
  const work=dashboardWork('pharmacist',{prescriptions:[{...base,id:'current'},{...base,id:'other',pharmacy_id:'other'},{...base,id:'ended',ends_on:'2026-09-15'},{...base,id:'future',starts_on:'2099-01-01'},{...base,id:'completed',status:'completed'}],stock:[{id:'expired',facility_id:'f',quantity:10,expires_on:'2026-09-16'},{id:'low',facility_id:'f',quantity:2,expires_on:'2099-01-01'},{id:'empty',facility_id:'f',quantity:0,expires_on:'2026-01-01'},{id:'healthy',facility_id:'f',quantity:100,expires_on:'2099-01-01'}]},'f','me',now)
  assert.equal(cameroonDate(now),'2026-09-16')
  assert.deepEqual(work.prescriptions.map(p=>p.id),['current'])
  assert.deepEqual(work.stock.map(b=>b.id),['expired','low'])
})
test('patient home excludes past and cancelled appointments and keeps upcoming ones chronological',()=>{
  const work=dashboardWork('patient',{appointments:[{id:'later',status:'confirmed',scheduled_at:'2099-01-01'},{id:'next',status:'requested',scheduled_at:'2026-09-16T09:00:00Z'},{id:'cancelled',status:'cancelled',scheduled_at:'2099-01-01'},{id:'past',status:'confirmed',scheduled_at:'2026-01-01'}]},null,'me',now)
  assert.deepEqual(work.appointments.map(a=>a.id),['next','later'])
})
test('dashboard queries filter open work before bounding it and respect role data needs',async()=>{
  const calls=[]
  const client={from(table){const chain={then(resolve){return Promise.resolve({data:[]}).then(resolve)}};for(const method of ['select','eq','in','order','limit','gte','gt','lte','or'])chain[method]=(...args)=>{calls.push([table,method,...args]);return chain};return chain}}
  await loadDashboard(client,'labtech','f')
  assert.ok(calls.every(c=>c[0]==='lab_results'))
  assert.deepEqual(calls.find(c=>c[1]==='in').slice(2),['status',['requested','processing']])
  assert.ok(calls.findIndex(c=>c[1]==='in')<calls.findIndex(c=>c[1]==='limit'))
  calls.length=0
  await loadDashboard(client,'pharmacist','f')
  assert.ok(calls.some(c=>c[0]==='prescriptions'&&c[1]==='or'&&c[2].includes('pharmacy_id.eq.f')))
  assert.ok(!calls.some(c=>c[0]==='visits'||c[0]==='facility_members'))
})
test('connection checks distinguish disconnected devices from unknown reachability and authorization failures',()=>{
  assert.equal(connected({isConnected:false}),false)
  assert.equal(connected({isConnected:true,isInternetReachable:false}),false)
  assert.equal(connected({isConnected:true,isInternetReachable:null}),true)
  assert.equal(transientConnectionError({message:'Network request failed'}),true)
  assert.equal(transientConnectionError({message:'Facility access denied'}),false)
})
test('native attachments validate MIME and actual byte length before uploading',()=>{
  assert.equal(validateAttachment({mimeType:'application/pdf'},1024),'pdf')
  assert.throws(()=>validateAttachment({mimeType:'image/gif'},100),/PDF/)
  for(const size of [0,undefined,10*1024*1024+1])assert.throws(()=>validateAttachment({mimeType:'image/png'},size),/10 MB/)
})
test('native result retry reuses the same private path and database ID after a lost commit response',async()=>{
  const uploads=[],commands=[],bytes=new ArrayBuffer(12)
  let committed=false
  const client={storage:{from(bucket){
    assert.equal(bucket,'LAB_result')
    return {upload:async(path,body,options)=>{
      uploads.push(path);assert.equal(body,bytes);assert.equal(options.upsert,false)
      return {error:uploads.length>1?{statusCode:'409'}:null}
    }}
  }}}
  const command=async(action,f,payload)=>{commands.push(payload);assert.equal(action,'lab_upload');assert.equal(f,'facility');if(!committed){committed=true;throw Error('Network response lost after commit')}}
  const submission={id:'same-id',facility:'facility',patient_id:'CL-patient',test_type:' Example test ',summary:' Validated findings ',asset:{mimeType:'application/pdf'}}
  await assert.rejects(submitNativeResult({client,command,submission,readFile:async()=>bytes}),/Network/)
  await submitNativeResult({client,command,submission,readFile:async()=>bytes})
  assert.deepEqual(uploads,['facility/CL-patient/same-id.pdf','facility/CL-patient/same-id.pdf'])
  assert.deepEqual(commands[0],commands[1])
  assert.equal(commands[1].summary,'Validated findings')
})
test('a failed native attachment upload never creates an attachment-less clinical result',async()=>{
  let called=false
  const client={storage:{from:()=>({upload:async()=>({error:Error('Upload denied')})})}}
  const submission={id:'id',facility:'f',patient_id:'p',test_type:'Test',summary:'Result',asset:{mimeType:'image/jpeg'}}
  await assert.rejects(submitNativeResult({client,command:async()=>{called=true},submission,readFile:async()=>new ArrayBuffer(12)}),/Upload denied/)
  assert.equal(called,false)
})
