import { test, expect } from '@playwright/test'

const uid='10000000-0000-4000-8000-000000000001',f='20000000-0000-4000-8000-000000000001'
const patient={id:'CL-demo-patient',first_name:'Amina',last_name:'Ngwa',date_of_birth:null,phone:'+237677123456',facility_id:f,auth_user_id:uid,created_at:'2026-09-10T08:00:00Z',allergies:null,blood_group:null}
async function backend(page,role='nurse'){
 const patients=[{...patient}],visits=[],commands=[],notices=[]
 const user={id:uid,email:'test@example.com',user_metadata:{role:'admin',name:'Untrusted role'},aud:'authenticated'}
 const auth={access_token:'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.test',refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user}
 // Every remote request is intercepted. No tests touch the hosted project.
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url())
  if(url.hostname==='127.0.0.1'||url.protocol==='data:')return route.continue()
  let result=[]
  if(url.pathname.includes('/auth/v1/token'))result=auth
  else if(url.pathname.includes('/auth/v1/user'))result=user
  else if(url.pathname.includes('/rpc/careline_context'))result={name:'Nurse Marie',role,facility_id:role==='patient'?null:f,is_operator:false,memberships:role==='patient'?[]:[{facility_id:f,name:'Careline Demo Health Centre',facility_type:'health_centre',role}]}
  else if(url.pathname.includes('/rpc/careline_staff_directory'))result=[{id:uid,name:'Nurse Marie',role}]
  else if(url.pathname.includes('/rpc/careline_command')){
   const {action,payload}=route.request().postDataJSON();commands.push({action,payload})
   if(action==='register'){result={...payload,id:'CL-'+payload.id,facility_id:f,created_at:new Date().toISOString()};patients.push(result)}
   else if(action==='arrive'){const v={id:payload.id,patient_id:payload.patient_id,facility_id:f,status:'waiting',version:1,date:new Date().toISOString(),created_at:new Date().toISOString()};visits.push(v);result=v}
   else if(action==='visit'){Object.assign(visits.find(v=>v.id===payload.id),payload,{version:payload.version+1});result={success:true}}
   else if(action==='notice'){notices.push({...payload,author_id:uid,author_name:'Nurse Marie',facility_id:f,created_at:new Date().toISOString()});result={success:true}}
   else if(action==='delete_notice'){notices.splice(notices.findIndex(n=>n.id===payload.id),1);result={success:true}}
   else result={success:true}
  }
  else if(url.pathname.endsWith('/patients'))result=patients.filter(p=>!url.searchParams.get('id')||p.id===url.searchParams.get('id').slice(3))
  else if(url.pathname.endsWith('/visits'))result=visits
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
 admin:['/dashboard','/patients','/patients/new','/patients/CL-demo-patient','/lab','/lab/upload','/pharmacy','/appointments','/referrals','/billing','/institutions','/admin/users','/pending','/account','/communication'],
 nurse:['/dashboard','/patients','/appointments','/lab','/referrals','/billing','/pending','/communication'],
 doctor:['/dashboard','/patients','/appointments','/lab','/referrals','/communication'],
 labtech:['/dashboard','/lab','/lab/upload','/communication'],
 pharmacist:['/dashboard','/pharmacy','/billing','/communication'],
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
 await expect(page.getByRole('link',{name:'Patients',exact:true})).toHaveCount(0)
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
