import { test, expect } from '@playwright/test'

const uid='10000000-0000-4000-8000-000000000001',f='20000000-0000-4000-8000-000000000001'
const patient={id:'CL-demo-patient',first_name:'Amina',last_name:'Ngwa',date_of_birth:null,phone:'+237677123456',facility_id:f,auth_user_id:uid,created_at:'2026-09-10T08:00:00Z',allergies:null,blood_group:null}
async function backend(page,role='nurse',seed={}){
 const patients=[{...patient}],visits=seed.visits||[],commands=[],notices=[],invitations=[],referrals=seed.referrals||[],concerns=seed.concerns||[],plans=seed.plans||[],tasks=[]
 const user={id:uid,email:'test@example.com',user_metadata:{role:'admin',name:'Untrusted role'},aud:'authenticated'}
 const auth={access_token:'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test',refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user}
 // Every remote request is intercepted. No tests touch the hosted project.
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url())
  if(url.hostname==='127.0.0.1'||url.protocol==='data:')return route.continue()
  let result=[]
  if(url.pathname.includes('/auth/v1/token'))result=auth
  else if(url.pathname.includes('/auth/v1/signup')){commands.push({action:'signup',payload:route.request().postDataJSON()});result={user,session:null}}
  else if(url.pathname.includes('/auth/v1/user'))result=user
  else if(url.pathname.includes('/rpc/careline_context'))result={name:'Nurse Marie',role,facility_id:role==='patient'?null:f,is_operator:false,memberships:role==='patient'?[]:[{facility_id:f,name:'Careline Demo Health Centre',facility_type:'health_centre',role}]}
  else if(url.pathname.includes('/rpc/careline_staff_activation')){
   if(route.request().postDataJSON().code!=='80000000-0000-4000-8000-000000000001')return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'Invitation unavailable or expired'})})
   result={email:'invited@example.com',role:'doctor',institution:'Careline Demo Health Centre'}
  }
  else if(url.pathname.includes('/rpc/careline_invite_staff')){const p=route.request().postDataJSON();commands.push({action:'invite_staff',payload:p});invitations.push({id:'invite-one',email:p.staff_email,role:p.staff_role,activation_code:'80000000-0000-4000-8000-000000000001',expires_at:'2099-01-01',created_at:new Date().toISOString()});result=null}
  else if(url.pathname.includes('/rpc/careline_staff_directory'))result=[{id:uid,name:'Nurse Marie',role}]
  else if((url.pathname.includes('/rpc/careline_command')||url.pathname.includes('/rpc/careline_coordination')||url.pathname.includes('/rpc/careline_staff_care'))){
   const {action,payload}=route.request().postDataJSON();commands.push({action,payload})
   if(action==='register'){result={...payload,id:'CL-'+payload.id,facility_id:f,created_at:new Date().toISOString()};patients.push(result)}
   else if(action==='arrive'){const v={id:payload.id,patient_id:payload.patient_id,facility_id:f,status:'waiting',version:1,date:new Date().toISOString(),created_at:new Date().toISOString()};visits.push(v);result=v}
   else if(action==='visit'){Object.assign(visits.find(v=>v.id===payload.id),payload,{version:payload.version+1});result={success:true}}
   else if(action==='notice'){notices.push({...payload,author_id:uid,author_name:'Nurse Marie',facility_id:f,created_at:new Date().toISOString()});result={success:true}}
   else if(action==='delete_notice'){notices.splice(notices.findIndex(n=>n.id===payload.id),1);result={success:true}}
   else if(action==='concern_add'){concerns.push({...payload,facility_id:f,status:'open',created_at:new Date().toISOString()});result={success:true}}
   else if(action==='concern_review'){Object.assign(concerns.find(c=>c.id===payload.id),payload,{status:'reviewed'});result={success:true}}
   else if(action==='plan_save'){const existing=plans.find(p=>p.id===payload.id);if(existing)Object.assign(existing,payload,{version:payload.version+1});else plans.push({...payload,facility_id:f,status:'draft',version:1,created_at:new Date().toISOString()});result={success:true}}
   else if(action==='plan_publish'){plans.filter(p=>p.status==='published').forEach(p=>p.status='superseded');Object.assign(plans.find(p=>p.id===payload.id),{status:'published',version:payload.version+1,published_at:new Date().toISOString(),published_by:uid});result={success:true}}
   else if(action==='plan_acknowledge'){Object.assign(plans.find(p=>p.id===payload.id),{acknowledged_at:new Date().toISOString()});result={success:true}}
   else if(action==='task_create'){tasks.push({...payload,facility_id:f,status:'open',source:'manual',version:1,created_at:new Date().toISOString()});result={success:true}}
   else if(action==='task_update'){Object.assign(tasks.find(t=>t.id===payload.id),payload,{version:payload.version+1});result={success:true}}
   else if(action==='revoke_invitation'){invitations.find(i=>i.id===payload.id).expires_at='2000-01-01';result={success:true}}
   else if(action==='assign_doctor'){Object.assign(visits.find(v=>v.id===payload.id),{assigned_doctor_id:payload.doctor_id,assigned_doctor_name:'Nurse Marie',version:payload.version+1});result={success:true}}
   else if(action==='referral_assign'){Object.assign(referrals.find(r=>r.id===payload.id),{receiving_doctor_id:payload.doctor_id,receiving_doctor_name:'Nurse Marie',version:payload.version+1});result={success:true}}
   else result={success:true}
  }
  else if(url.pathname.endsWith('/patients'))result=patients.filter(p=>!url.searchParams.get('id')||p.id===url.searchParams.get('id').slice(3))
  else if(url.pathname.endsWith('/visits'))result=visits
  else if(url.pathname.endsWith('/staff_invitations'))result=invitations
  else if(url.pathname.endsWith('/referrals'))result=referrals
  else if(url.pathname.endsWith('/patient_concerns'))result=concerns
  else if(url.pathname.endsWith('/care_plans'))result=plans.filter(p=>role!=='patient'||p.status!=='draft')
  else if(url.pathname.endsWith('/care_tasks'))result=tasks.filter(t=>!url.searchParams.get('status')||url.searchParams.get('status').includes(t.status))
  else if(url.pathname.endsWith('/patient_facilities'))result=[{patient_id:patient.id,facility_id:f}]
  else if(url.pathname.endsWith('/staff_broadcasts'))result=notices
  else if(url.pathname.endsWith('/facilities'))result=[{id:f,name:'Careline Demo Health Centre',status:'active',facility_type:'health_centre',region:'South-West',location:'Buea',services:'Consultations and laboratory',created_at:'2026-09-10T08:00:00Z'}]
  else if(!url.pathname.includes('/rest/v1/')&&!url.pathname.includes('/auth/v1/'))return route.abort()
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)})
 })
 return commands
}
async function login(page){await page.goto('/login');await page.getByLabel('Email or Cameroon phone number').fill('test@example.com');await page.getByLabel('Password',{exact:true}).fill('testpassword');await page.getByRole('button',{name:'Sign in',exact:true}).click()}

test('landing is usable on desktop and a narrow phone',async({page})=>{
 await backend(page)
 await page.goto('/')
 await expect(page.getByRole('heading',{name:'Good care. Connected.'})).toBeVisible()
 await page.screenshot({path:'artifacts/careline-desktop.png',fullPage:true})
 await page.setViewportSize({width:390,height:844})
 await page.screenshot({path:'artifacts/careline-mobile-web.png',fullPage:true})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
})
test('nurse can register without demographics, open the record and triage an arrival',async({page})=>{
 const commands=await backend(page)
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await login(page)
 await expect(page).toHaveURL(/dashboard/)
 await expect(page.getByText('Nurse · reception & care')).toBeVisible()
 await page.getByRole('link',{name:'Register a patient',exact:true}).click()
 await page.getByLabel('First name',{exact:true}).fill('Moussa')
 await page.getByLabel('Last name',{exact:true}).fill('Bello')
 await page.getByRole('button',{name:'Register patient',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Moussa Bello'})).toBeVisible()
 await page.getByRole('button',{name:'Current visit',exact:true}).click()
 await page.getByRole('button',{name:'Add to waiting list'}).click()
 await expect(page.getByRole('heading',{name:'Current visit',exact:true})).toBeVisible()
 await page.getByLabel('Next stage').selectOption('triage')
 await page.getByRole('button',{name:'Update visit',exact:true}).click()
 await expect(page.getByText('triage',{exact:true}).first()).toBeVisible()
 await expect(page.getByLabel('Diagnosis / assessment')).toHaveCount(0)
 expect(commands.map(c=>c.action)).toEqual(['register','arrive','visit'])
 expect(errors).toEqual([])
 await page.screenshot({path:'artifacts/careline-nurse-workflow.png',fullPage:true})
})
test('patient can request an appointment and generate their card locally',async({page})=>{
 const commands=await backend(page,'patient')
 await login(page)
 await expect(page).toHaveURL(/my-records/)
 await page.getByRole('button',{name:'Appointments',exact:true}).click()
 await page.getByLabel('Institution',{exact:true}).selectOption(f)
 await page.getByLabel('Preferred date and time (local time)').fill('2099-01-01T10:00')
 await page.getByLabel('Reason / service').fill('Follow-up')
 await page.getByRole('button',{name:'Send request'}).click()
 await expect(page.getByText('Saved successfully.')).toBeVisible()
 expect(commands[0].action).toBe('appointment')
 await page.getByRole('button',{name:'My patient card',exact:true}).click()
 const qr=page.getByAltText('Careline patient identification QR')
 await expect(qr).toHaveAttribute('src',/^data:image\/png/)
})

const roleRoutes={
 admin:['/dashboard','/tasks','/patients','/patients/new','/patients/CL-demo-patient','/lab','/lab/upload','/pharmacy','/appointments','/referrals','/billing','/institutions','/admin/users','/pending','/account','/communication'],
 nurse:['/dashboard','/tasks','/patients','/appointments','/lab','/referrals','/billing','/pending','/communication'],
 doctor:['/dashboard','/tasks','/patients','/appointments','/lab','/referrals','/communication'],
 labtech:['/dashboard','/tasks','/lab','/lab/upload','/communication'],
 pharmacist:['/dashboard','/tasks','/pharmacy','/billing','/communication'],
 patient:['/my-records','/institutions','/account'],
}
for(const [role,routes] of Object.entries(roleRoutes)){
 test(`${role} pages render on desktop and a narrow phone`,async({page})=>{
  await backend(page,role)
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await login(page)
  await expect(page).toHaveURL(role==='patient'?/my-records/:/dashboard/)
  for(const width of [1440,320]){
   await page.setViewportSize({width,height:900})
   for(const route of routes){
    await page.goto(route)
    await expect(page.locator('#main-content')).toBeVisible()
    await expect(page.locator('#main-content h1, #main-content h2').first()).toBeVisible()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${role} ${route} at ${width}px`).toBe(true)
   }
   await page.goto(role==='patient'?'/my-records':'/dashboard')
   await expect(page.locator('#main-content')).toBeVisible()
   await page.screenshot({path:`artifacts/careline-${role}-${width}.png`,fullPage:true})
  }
  expect(errors).toEqual([])
 })
}

test('mobile navigation closes with Escape and restores keyboard focus',async({page})=>{
 await backend(page)
 await page.setViewportSize({width:390,height:844})
 await login(page)
 const toggle=page.getByRole('button',{name:'Open navigation'})
 await expect(toggle).toBeVisible()
 await expect(page.locator('#workspace-navigation').getByRole('link',{name:'Patients',exact:true})).toHaveCount(0)
 await toggle.click()
 await expect(page.getByRole('link',{name:'Patients',exact:true})).toBeVisible()
 await page.keyboard.press('Escape')
 await expect(toggle).toBeFocused()
 await expect(toggle).toHaveAttribute('aria-expanded','false')
})

test('nurse can post and remove a notice with visible confirmation',async({page})=>{
 const commands=await backend(page)
 await login(page)
 await page.goto('/communication')
 await page.getByLabel('Notice',{exact:true}).fill('Please prepare the triage desk.')
 await page.getByRole('button',{name:'Post notice',exact:true}).click()
 await expect(page.getByText('Please prepare the triage desk.')).toBeVisible()
 await page.getByRole('button',{name:'Remove notice',exact:true}).click()
 await expect(page.getByText('Please prepare the triage desk.')).toHaveCount(0)
 expect(commands.map(c=>c.action)).toEqual(['notice','delete_notice'])
})

test('patient picker searches full names and role guards deny administration',async({page})=>{
 await backend(page)
 await login(page)
 await page.goto('/appointments')
 const request=page.waitForRequest(r=>r.url().includes('/patients?')&&r.url().includes('first_name=ilike.'))
 await page.getByLabel('Find patient',{exact:true}).fill('Amina Ngwa')
 const url=new URL((await request).url())
 expect(url.searchParams.get('first_name')).toBe('ilike.%Amina%')
 expect(url.searchParams.get('last_name')).toBe('ilike.%Ngwa%')
 await expect(page.getByLabel('Patient',{exact:true})).toBeEnabled()
 await page.goto('/admin/users')
 await expect(page).toHaveURL(/dashboard/)
 await expect(page.getByText('Invite staff',{exact:true})).toHaveCount(0)
})

test('offline intake stays encrypted, survives focus, and syncs once on reconnect',async({page,context})=>{
 const commands=await backend(page)
 await login(page)
 await page.getByRole('link',{name:'Register a patient',exact:true}).click()
 await page.getByLabel('First name',{exact:true}).fill('OfflineAmina')
 await page.getByLabel('Last name',{exact:true}).fill('OfflineNgwa')
 await page.getByLabel('Allow encrypted temporary intake storage in this browser if offline.').check()
 await context.setOffline(true)
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')))
 await page.getByRole('button',{name:'Register patient',exact:true}).click()
 await expect(page).toHaveURL(/pending/)
 await expect(page.getByRole('button',{name:'Discard draft'})).toBeVisible()
 const draft=await page.evaluate(()=>new Promise((resolve,reject)=>{
  const request=indexedDB.open('careline-pending-intake')
  request.onerror=()=>reject(request.error)
  request.onsuccess=()=>{const db=request.result,read=db.transaction('drafts').objectStore('drafts').getAll();read.onsuccess=()=>{resolve(read.result[0]);db.close()};read.onerror=()=>reject(read.error)}
 }))
 expect(draft.owner).toBe(uid)
 expect(draft.facility).toBe(f)
 expect(draft.encrypted.length).toBeGreaterThan(0)
 expect(JSON.stringify(draft)).not.toContain('OfflineAmina')
 expect(commands).toEqual([])
 await context.setOffline(false)
 await expect(page.getByText('All intake is synced. No pending drafts.')).toBeVisible()
 expect(commands.filter(c=>c.action==='register')).toHaveLength(1)
 expect(commands[0].payload.first_name).toBe('OfflineAmina')
})


test('clinician responds to a patient concern, publishes a plan and prints only those instructions',async({page})=>{
 const commands=await backend(page,'doctor',{concerns:[{id:'concern-one',patient_id:patient.id,facility_id:f,concern:'Transport is difficult',status:'open',created_at:new Date().toISOString()}]})
 await login(page)
 await page.goto('/patients/'+patient.id)
 await expect(page.getByText('Transport is difficult')).toBeVisible()
 await page.getByText('Respond to this concern',{exact:true}).click()
 await page.getByLabel('Response discussed with the patient').fill('Return arrangements discussed together.')
 await page.getByRole('button',{name:'Record response',exact:true}).click()
 await expect(page.getByText('Return arrangements discussed together.')).toBeVisible()
 await page.getByRole('button',{name:'Care plan',exact:true}).click()
 await page.getByRole('button',{name:'Write a care plan',exact:true}).click()
 await page.getByLabel('Care summary in plain language').fill('We agreed on the following care steps.')
 await page.getByLabel('Next steps and return arrangements').fill('Return on the date agreed with your clinician.')
 await page.getByRole('button',{name:'Save draft',exact:true}).click()
 await expect(page.getByText('draft',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Approve and share with patient'}).click()
 await expect(page.getByText('published',{exact:true})).toBeVisible()
 await page.evaluate(()=>{window.print=()=>{window.printedCarePlan=document.getElementById('care-print-container')?.textContent}})
 await page.getByRole('button',{name:'Print care instructions'}).click()
 const printed=await page.evaluate(()=>window.printedCarePlan)
 expect(printed).toContain('We agreed on the following care steps.')
 expect(printed).not.toContain('Transport is difficult')
 expect(commands.map(c=>c.action)).toEqual(['concern_review','plan_save','plan_publish'])
 await page.setViewportSize({width:390,height:844})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:'artifacts/careline-care-plan-mobile.png',fullPage:true})
})

test('patient sees approved care instructions, acknowledges them and records access needs',async({page})=>{
 const commands=await backend(page,'patient',{plans:[{id:'published-one',patient_id:patient.id,facility_id:f,status:'published',summary:'Your agreed care instructions',language:'English',published_at:new Date().toISOString(),created_at:new Date().toISOString()}]})
 await login(page)
 await page.getByRole('button',{name:'Care plan',exact:true}).click()
 await expect(page.getByText('Your agreed care instructions')).toBeVisible()
 await page.getByRole('button',{name:'I have read this plan'}).click()
 await expect(page.getByText(/Patient marked as read/)).toBeVisible()
 await page.getByRole('button',{name:'Add a concern',exact:true}).click()
 await page.getByLabel('What would you like the care team to know?').fill('I need help understanding the return arrangements.')
 await page.getByLabel('Preferred language',{exact:true}).fill('French')
 await page.getByLabel('What might make your care difficult?').fill('Transport costs')
 await page.getByRole('button',{name:'Save concern',exact:true}).click()
 await expect(page.getByText('Access needs: Transport costs')).toBeVisible()
 expect(commands.map(c=>c.action)).toEqual(['plan_acknowledge','concern_add'])
})

test('staff assigns an overdue task, records completion and finds it in closed history',async({page})=>{
 const commands=await backend(page)
 await login(page)
 await page.goto('/tasks')
 await page.getByRole('button',{name:'Assign a task',exact:true}).click()
 await page.getByLabel('What needs to happen?').fill('Confirm patient transport arrangements')
 await page.getByLabel('Responsible colleague',{exact:true}).selectOption(uid)
 await page.getByLabel('Due date and time',{exact:true}).fill('2020-01-01T10:00')
 await page.getByRole('button',{name:'Assign task',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Confirm patient transport arrangements'})).toBeVisible()
 await page.getByText('Update or hand over task',{exact:true}).click()
 await page.getByLabel('Task status').selectOption('completed')
 await page.getByLabel('Outcome or reason for waiting').fill('Return arrangements confirmed with patient.')
 await page.getByRole('button',{name:'Save task update'}).click()
 await expect(page.getByRole('heading',{name:'Confirm patient transport arrangements'})).toHaveCount(0)
 await page.getByRole('button',{name:'Closed',exact:true}).click()
 await expect(page.getByText('Latest update: Return arrangements confirmed with patient.')).toBeVisible()
 expect(commands.map(c=>c.action)).toEqual(['task_create','task_update'])
 expect(commands[1].payload.version).toBe(1)
})


test('public signup is a simple patient form and existing-card signup avoids creating another record',async({page})=>{
 const commands=await backend(page,'patient')
 await page.goto('/register')
 await expect(page.getByRole('heading',{name:'Create your patient account'})).toBeVisible()
 await expect(page.getByLabel('Account purpose')).toHaveCount(0)
 await expect(page.getByText('Institution staff / owner',{exact:true})).toHaveCount(0)
 await page.getByLabel('First name',{exact:true}).fill('Amina')
 await page.getByLabel('Last name',{exact:true}).fill('Ngwa')
 await page.getByLabel('Email or Cameroon phone number').fill('amina@example.com')
 await page.getByLabel('Password',{exact:true}).fill('testpassword')
 await page.getByRole('checkbox',{name:'I already have a Careline patient card'}).check()
 await page.getByRole('button',{name:'Create account',exact:true}).click()
 await expect(page.getByText('Check your email and confirm your account before signing in.')).toBeVisible()
 expect(commands[0].payload.data.name).toBe('Amina Ngwa')
 expect(commands[0].payload.data.first_name).toBeUndefined()
 expect(commands[0].payload.data.role).toBeUndefined()
})

test('private staff setup locks the invited email and rejects invalid setup links',async({page})=>{
 const commands=await backend(page)
 await page.goto('/activate?code=80000000-0000-4000-8000-000000000001')
 await expect(page.getByText('invited@example.com',{exact:true})).toBeVisible()
 await expect(page.getByLabel('Email or Cameroon phone number')).toHaveCount(0)
 await page.getByLabel('First name',{exact:true}).fill('Marie')
 await page.getByLabel('Last name',{exact:true}).fill('Ngwa')
 await page.getByLabel('Password',{exact:true}).fill('testpassword')
 await page.getByRole('button',{name:'Set password and verify email'}).click()
 await expect(page.getByText('Check your email and confirm your account before signing in.')).toBeVisible()
 expect(commands[0].payload.email).toBe('invited@example.com')
 expect(commands[0].payload.data.first_name).toBeUndefined()
 await page.goto('/activate?code=invalid')
 await expect(page.getByRole('alert')).toContainText('Invitation unavailable')
 await expect(page.getByRole('button',{name:'Set password and verify email'})).toBeDisabled()
})

test('administrator confirms employment, creates a private invitation and revokes it',async({page})=>{
 const commands=await backend(page,'admin')
 await login(page);await page.goto('/admin/users')
 await page.getByLabel('Staff email',{exact:true}).fill('colleague@example.com')
 await page.getByLabel('Responsibility',{exact:true}).selectOption('doctor')
 await page.getByRole('checkbox',{name:'I have confirmed this person works at this institution.'}).check()
 await page.getByRole('button',{name:'Add staff member',exact:true}).click()
 await expect(page.getByLabel('Private setup link for colleague@example.com')).toHaveValue(/activate\?code=/)
 await page.getByRole('button',{name:'Revoke invitation',exact:true}).click()
 await expect(page.getByRole('button',{name:'Copy private setup link'})).toHaveCount(0)
 expect(commands.map(c=>c.action)).toEqual(['invite_staff','revoke_invitation'])
})

test('receiving care team can see handover attribution and assign its own clinician',async({page})=>{
 const commands=await backend(page,'doctor',{referrals:[{id:'referral-one',patient_id:patient.id,facility_id:'other',target_facility_id:f,status:'accepted',version:2,origin_facility_name:'Centre A',referring_staff_name:'Nurse Ada',referring_staff_role:'nurse',referring_doctor_name:'Doctor Jean',reason:'Agreed transfer summary',created_at:new Date().toISOString()}]})
 await login(page);await page.goto('/referrals')
 await expect(page.getByText('Previous responsible clinician: Doctor Jean')).toBeVisible()
 await page.getByText('Assign responsible clinician',{exact:true}).click()
 await page.getByLabel('Clinician at this institution').selectOption(uid)
 await page.getByRole('button',{name:'Save clinician assignment'}).click()
 await expect(page.getByText('Receiving clinician: Nurse Marie')).toBeVisible()
 expect(commands[0].action).toBe('referral_assign')
 expect(commands[0].payload.version).toBe(2)
})
