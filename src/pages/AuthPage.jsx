import { useState } from 'react'
import { Link,useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { normalizePhone } from '../lib/careline'
import useAuthStore from '../stores/authStore'
import { Field } from '../components/ui/CarelineUI'
export default function AuthPage(){
 const register=useLocation().pathname==='/register',login=useAuthStore(s=>s.login)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[pendingPhone,setPendingPhone]=useState(''),[recover,setRecover]=useState(false)
 async function submit(e){
  e.preventDefault();if(busy)return;const p=Object.fromEntries(new FormData(e.currentTarget));setBusy(true);setError('');setMessage('')
  try{
   if(pendingPhone){const {error}=await supabase.auth.verifyOtp({phone:pendingPhone,token:p.code,type:'sms'});if(error)throw error;return}
   if(recover){const {error}=await supabase.auth.resetPasswordForEmail(p.identifier,{redirectTo:window.location.origin+'/account'});if(error)throw error;setMessage('If this email has an account, a password reset link will be sent.');return}
   if(!register){const result=await login(p.identifier,p.password);if(!result.success)throw Error(result.error);return}
   if(p.purpose==='new_patient'&&(!p.first_name.trim()||!p.last_name.trim()))throw Error('Enter the patient first and last names.')
   const identity=p.identifier.includes('@')?{email:p.identifier.trim()}:{phone:normalizePhone(p.identifier)}
   const metadata={name:p.name, ...(p.purpose==='new_patient'?{first_name:p.first_name,last_name:p.last_name}:{}),phone:identity.phone||null}
   const {data,error}=await supabase.auth.signUp({...identity,password:p.password,options:{data:metadata,emailRedirectTo:window.location.origin+'/my-records'}})
   if(error)throw error
   if(!data.session&&identity.phone){setPendingPhone(identity.phone);setMessage('Enter the verification code sent to your phone.')}
   else if(!data.session)setMessage('Check your email and confirm your account before signing in.')
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <main className="care-auth"><Link className="care-wordmark" to="/">careline<span>+</span></Link><div className="care-auth-card"><p className="care-eyebrow">YOUR CARE, CONNECTED</p><h1>{pendingPhone?'Verify your phone':recover?'Recover your account':register?'Welcome to Careline.':'Good to see you again.'}</h1><p>{register?'Patients and staff start with a verified personal account. Your institution assigns staff access.':'Sign in to your patient record or institution workspace.'}</p><form className="care-form" onSubmit={submit}><fieldset disabled={busy}>{pendingPhone?<Field label="SMS verification code" name="code" inputMode="numeric" autoComplete="one-time-code" required/>:<>{register&&<><Field label="Account purpose" name="purpose" options={[{value:'new_patient',label:'Create my first patient record'},{value:'existing_patient',label:'I already have a Careline patient card'},{value:'staff',label:'Institution staff / owner'}]}/><Field label="Your display name" name="name" required/><div className="care-grid"><Field label="Patient first name (new records only)" name="first_name"/><Field label="Patient last name (new records only)" name="last_name"/></div></>}<Field label={recover?'Account email':'Email or Cameroon phone number'} name="identifier" type={recover?'email':'text'} autoComplete="username" required placeholder="+237 6XX XXX XXX"/>{!recover&&<Field label="Password" name="password" type="password" autoComplete={register?'new-password':'current-password'} minLength={register?8:undefined} required/>}</>}<button className="btn btn-primary" disabled={busy}>{busy?'Please wait…':pendingPhone?'Verify and continue':recover?'Send recovery email':register?'Create account':'Sign in'}</button></fieldset></form>{error&&<p className="care-error" role="alert">{error}</p>}{message&&<p className="care-notice" role="status">{message}</p>}<div className="care-auth-links">{!register&&<button type="button" onClick={()=>{setRecover(!recover);setError('');setMessage('')}}>{recover?'Back to sign in':'Forgot your password?'}</button>}<Link to={register?'/login':'/register'}>{register?'Already registered? Sign in':'Create an account'}</Link></div></div><p className="care-muted">A facility can register you for care without a phone or online account.</p></main>
}
