export const dashboardRoles = {
  doctor: { eyebrow:'DOCTOR', title:'Your next consultation.', description:'See who needs you, review results, and keep care moving.', actions:[['patients','Open patient records'],['lab','Review results'],['tasks','My follow-ups']] },
  nurse: { eyebrow:'NURSING & RECEPTION', title:'Welcome. Assess. Coordinate.', description:'Register arrivals and help each patient reach the next step.', actions:[['register','Register a patient'],['patients','Arrivals & triage'],['appointments','Appointments']] },
  labtech: { eyebrow:'LABORATORY', title:'From specimen to result.', description:'Process requested tests and pass validated results to the care team.', actions:[['lab','Open test worklist'],['upload','Add standalone result'],['tasks','My tasks']] },
  pharmacist: { eyebrow:'PHARMACY', title:'Ready for safe dispensing.', description:'Check prescriptions, available batches, and stock that needs attention.', actions:[['pharmacy','Dispense medicines'],['stock','Stock & expiry'],['billing','Record a receipt']] },
  admin: { eyebrow:'INSTITUTION ADMINISTRATOR', title:'Keep your care team connected.', description:'Review outstanding work, patient access, and your active team.', actions:[['team','Team & patient access'],['tasks','Coordinate work'],['register','Register a patient']] },
  patient: { eyebrow:'MY CARE', title:'Your care, in your hands.', description:'Find your next appointment, agreed instructions, and current medicines.', actions:[['plan','My care plan'],['book','Request appointment'],['card','My patient card']] },
}
export const connected = state => state?.isConnected !== false && state?.isInternetReachable !== false
export const transientConnectionError = error => /network|failed to fetch|fetch failed|internet|timed?\s*out/i.test(error?.message||'')
export function cameroonDate(date=new Date()) {
  return new Date(date.getTime()+3600000).toISOString().slice(0,10)
}
const activeRx=(p,today)=>p.status==='active'&&p.starts_on<=today&&(!p.ends_on||p.ends_on>=today)
const priority={emergency:0,urgent:1,routine:2}
export function dashboardWork(role,data,facility,userId,now=new Date()) {
  const today=cameroonDate(now), rows=key=>data[key]||[]
  const visits=rows('visits').filter(v=>v.facility_id===facility&&!['completed','cancelled'].includes(v.status)).sort((a,b)=>(priority[a.priority]??2)-(priority[b.priority]??2)||new Date(a.date)-new Date(b.date))
  const labs=rows('labs').filter(l=>l.facility_id===facility&&(role==='labtech'?['requested','processing'].includes(l.status):l.status==='completed')).sort((a,b)=>Number(!!b.critical)-Number(!!a.critical)||new Date(a.uploaded_at)-new Date(b.uploaded_at))
  const prescriptions=rows('prescriptions').filter(p=>activeRx(p,today)&&(role==='patient'||(p.pharmacy_id||p.facility_id)===facility))
  const stock=rows('stock').filter(b=>b.facility_id===facility&&b.quantity>0&&(b.quantity<=5||b.expires_on<=today))
  const appointments=rows('appointments').filter(a=>['requested','confirmed'].includes(a.status)&&(role==='patient'||a.facility_id===facility)&&new Date(a.scheduled_at)>=now).sort((a,b)=>new Date(a.scheduled_at)-new Date(b.scheduled_at))
  const tasks=rows('tasks').filter(t=>t.facility_id===facility&&!['completed','cancelled'].includes(t.status)&&(!t.assigned_to||t.assigned_to===userId)).sort((a,b)=>Number(b.priority==='urgent')-Number(a.priority==='urgent')||new Date(a.due_at)-new Date(b.due_at))
  return {visits,labs,prescriptions,stock,appointments,tasks,
    links:rows('links').filter(l=>l.facility_id===facility&&l.status==='pending'),
    members:rows('members').filter(m=>m.facility_id===facility&&m.active)}
}

// Filter open work before applying the limit, so recent closed records cannot hide it.
export async function loadDashboard(client,role,facility) {
  const jobs=[]
  const add=(key,table,{statuses,order='created_at',field='facility_id',ascending=true}={})=>{
    let query=client.from(table).select('*')
    if(field)query=query.eq(field,facility)
    if(statuses)query=query.in('status',statuses)
    jobs.push([key,query.order(order,{ascending}).limit(100)])
  }
  if(['admin','doctor','nurse'].includes(role))add('visits','visits',{statuses:['waiting','triage','consultation','awaiting_tests'],order:'date'})
  if(['admin','doctor','labtech'].includes(role))add('labs','lab_results',{statuses:role==='labtech'?['requested','processing']:['completed'],order:'uploaded_at'})
  if(['nurse','doctor'].includes(role)){
    let query=client.from('appointments').select('*').eq('facility_id',facility).in('status',['requested','confirmed']).gte('scheduled_at',new Date().toISOString()).order('scheduled_at',{ascending:true}).limit(100)
    jobs.push(['appointments',query])
  }
  if(role==='pharmacist'){
    const today=cameroonDate()
    jobs.push(['prescriptions',client.from('prescriptions').select('*').eq('status','active').lte('starts_on',today).or('ends_on.is.null,ends_on.gte.'+today).or('pharmacy_id.eq.'+facility+',and(pharmacy_id.is.null,facility_id.eq.'+facility+')').order('created_at',{ascending:true}).limit(100)])
    jobs.push(['stock',client.from('stock_batches').select('*').eq('facility_id',facility).gt('quantity',0).or('quantity.lte.5,expires_on.lte.'+cameroonDate()).order('expires_on',{ascending:true}).limit(100)])
  }
  if(role==='admin'){add('members','facility_members');add('links','record_links',{statuses:['pending']})}
  const values=await Promise.all(jobs.map(async([key,query])=>{const {data,error}=await query;if(error)throw error;return [key,data||[]]}))
  const result=Object.fromEntries(values)
  const ids=[...new Set((result.visits||[]).map(v=>v.patient_id))]
  if(ids.length){const {data,error}=await client.from('patients').select('id,first_name,last_name').in('id',ids);if(error)throw error;result.patientNames=data||[]}
  return result
}
