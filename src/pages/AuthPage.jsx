import { useState,useEffect } from 'react'
import { Link,useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { normalizePhone } from '../lib/careline'
import useAuthStore from '../stores/authStore'
import { Field } from '../components/ui/CarelineUI'
export default function AuthPage(){
 const location=useLocation(),activation=location.pathname==='/activate',code=new URLSearchParams(location.search).get('code'),register=location.pathname==='/register'||activation,login=useAuthStore(s=>s.login)
 const [resolvedInvitation,setInvitation]=useState(null)
 const invitation=resolvedInvitation?.code===code?resolvedInvitation:null
 useEffect(()=>{if(!activation)return;setInvitation(null);setError('');let active=true;supabase.rpc('careline_staff_activation',{code}).then(({data,error})=>{if(active){setInvitation(data?{...data,code}:null);if(error)setError(error.message)}});return()=>{active=false}},[activation,code])
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[pendingPhone,setPendingPhone]=useState(''),[recover,setRecover]=useState(false)
 useEffect(()=>{setRecover(false);setPendingPhone('');setError('');setMessage('')},[location.pathname])
 async function submit(e){
  e.preventDefault();if(busy)return;const p=Object.fromEntries(new FormData(e.currentTarget));setBusy(true);setError('');setMessage('')
  try{
   if(pendingPhone){const {error}=await supabase.auth.verifyOtp({phone:pendingPhone,token:p.code,type:'sms'});if(error)throw error;return}
   if(recover){const {error}=await supabase.auth.resetPasswordForEmail(p.identifier,{redirectTo:window.location.origin+'/account'});if(error)throw error;setMessage('If this email has an account, a password reset link will be sent.');return}
   if(!register){const result=await login(p.identifier,p.password);if(!result.success)throw Error(result.error);return}
   if(!p.first_name?.trim()||!p.last_name?.trim())throw Error('Enter your first and last names.')
   if(activation&&!invitation)throw Error('Ask your administrator for a valid invitation.')
   const identifier=activation?invitation.email:p.identifier
   const identity=identifier.includes('@')?{email:identifier.trim()}:{phone:normalizePhone(identifier)}
   const metadata={name:[p.first_name.trim(),p.last_name.trim()].join(' '),...(!activation&&p.existing_record!=='on'?{first_name:p.first_name.trim(),last_name:p.last_name.trim()}:{}),...(activation?{staff_invitation:code}:{}),phone:identity.phone||null}
   const {data,error}=await supabase.auth.signUp({...identity,password:p.password,options:{data:metadata,emailRedirectTo:window.location.origin+'/my-records'}})
   if(error)throw error
   if(!data.session&&identity.phone){setPendingPhone(identity.phone);setMessage('Enter the verification code sent to your phone.')}
   else if(!data.session)setMessage('Check your email and confirm your account before signing in.')
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <main className="care-auth"><Link className="care-wordmark" to="/"><img src="/careline-mark-v2.png" alt="" aria-hidden="true"/>careline<span>+</span></Link><div className="care-auth-card"><p className="care-eyebrow">YOUR CARE, CONNECTED</p><h1>{pendingPhone?'Verify your phone':recover?'Recover your account':activation?'Set up your staff account':register?'Create your patient account':'Good to see you again.'}</h1><p>{activation?(invitation?invitation.institution+' has invited you as '+invitation.role+'. Confirm your email, then sign in.':'Checking your private invitation...'):register?'Your health information, in one place.':'Enter your credentials to open your workspace.'}</p><form className="care-form" onSubmit={submit}><fieldset disabled={busy||(activation&&!invitation)}>{pendingPhone?<Field label="SMS verification code" name="code" inputMode="numeric" autoComplete="one-time-code" required/>:<>{register&&<><div className="care-grid"><Field label="First name" name="first_name" required autoComplete="given-name"/><Field label="Last name" name="last_name" required autoComplete="family-name"/></div></>}{activation?<p>Invited email: <strong>{invitation?.email}</strong></p>:<Field label={recover?'Account email':'Email or Cameroon phone number'} name="identifier" type={recover?'email':'text'} autoComplete="username" required placeholder="+237 6XX XXX XXX"/>}{!recover&&<Field label="Password" name="password" type="password" autoComplete={register?'new-password':'current-password'} minLength={register?8:undefined} required/>}{register&&!activation&&<label className="care-checkbox"><input type="checkbox" name="existing_record"/> I already have a Careline patient card</label>}</>}<button className="btn btn-primary" disabled={busy}>{busy?'Please wait…':pendingPhone?'Verify and continue':recover?'Send recovery email':activation?'Set password and verify email':register?'Create account':'Sign in'}</button></fieldset></form>{error&&<p className="care-error" role="alert">{error}</p>}{message&&<p className="care-notice" role="status">{message}</p>}<div className="care-auth-links">{!register&&<button type="button" onClick={()=>{setRecover(!recover);setError('');setMessage('')}}>{recover?'Back to sign in':'Forgot your password?'}</button>}<Link to={register?'/login':'/register'}>{register?'Already registered? Sign in':'Create an account'}</Link></div></div><p className="care-muted">A facility can register you for care without a phone or online account.</p></main>
}
