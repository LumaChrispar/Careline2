import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import { command, normalizePhone } from '../lib/careline'
import { queueIntake } from '../lib/offline'
import { Panel, Field } from '../components/ui/CarelineUI'
export default function CareIntakePage(){
  const {user}=useAuthStore(), navigate=useNavigate()
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[id]=useState(()=>crypto.randomUUID())
  async function submit(e){
    e.preventDefault();if(busy)return;setBusy(true);setError('')
    const payload={...Object.fromEntries(new FormData(e.currentTarget)),id}
    try{
      if(payload.phone)payload.phone=normalizePhone(payload.phone)
      if(payload.date_of_birth>new Date().toISOString().slice(0,10))throw Error('Birth date cannot be in the future.')
      const f=user.user_metadata.facility_id
      if(!navigator.onLine){
        if(payload.offline_consent!=='on')throw Error('Confirm temporary storage to save this intake while offline.')
        delete payload.offline_consent
        await queueIntake(user.id,f,payload);navigate('/pending');return
      }
      const patient=await command('register',f,payload)
      window.dispatchEvent(new Event('careline:refresh'));navigate('/patients/'+patient.id)
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <div className="care-stack care-narrow"><div><p className="care-eyebrow">NURSING & RECEPTION</p><h1>Register a patient</h1><p>No email, smartphone or portal password is required to receive care.</p><Link to="/patients" className="btn btn-ghost">Search existing patients first →</Link></div><Panel title="Patient details"><form className="care-form" onSubmit={submit}><fieldset disabled={busy}><div className="care-grid"><Field label="First name" name="first_name" required autoComplete="given-name"/><Field label="Last name" name="last_name" required autoComplete="family-name"/><Field label="Date of birth, if known" name="date_of_birth" type="date" max={new Date().toISOString().slice(0,10)}/><Field label="Birth date accuracy" name="birth_date_accuracy" options={['unknown','exact','approximate']}/><Field label="Sex / gender, if known" name="gender" options={[{value:'',label:'Not recorded'},'Male','Female','Other']}/><Field label="Contact phone (may be shared)" name="phone" placeholder="+237 6XX XXX XXX" autoComplete="tel"/><Field label="Email, optional" name="email" type="email"/><Field label="Region" name="region" options={['','Adamawa','Centre','East','Far-North','Littoral','North','North-West','South','South-West','West']}/><Field label="Village, neighbourhood or landmark" name="village"/><Field label="Blood group, if known" name="blood_group" options={[{value:'',label:'Unknown'},'A+','A-','B+','B-','AB+','AB-','O+','O-']}/><Field label="Reported allergies" name="allergies" placeholder="Leave blank if unknown"/><Field label="Next of kin and contact" name="next_of_kin"/></div><div className="care-notice"><label><input type="checkbox" name="offline_consent"/> Allow encrypted temporary intake storage in this browser if offline.</label><p>Keep this tab open until synced. Closing the browser session can make a pending draft unrecoverable. Retain your source notes until the patient is saved to Careline.</p></div><button className="btn btn-primary" disabled={busy}>{busy?'Saving…':'Register patient'}</button></fieldset>{error&&<p role="alert" className="care-error">{error}</p>}</form></Panel></div>
}
