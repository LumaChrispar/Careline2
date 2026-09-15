import React,{useState,useEffect} from 'react'
import {Text,View,ScrollView,KeyboardAvoidingView,Platform,Image,Switch} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {supabase} from '../lib/supabase'
import {normalizePhone,signIn} from '../lib/careline'
import {Button,Field,Card,styles} from '../components/CareUI'
export default function CareAuthScreen({invitationCode}){
 const inset=useSafeAreaInsets(),[mode,setMode]=useState(invitationCode?'activate':'login'),[form,setForm]=useState({}),[existing,setExisting]=useState(false),[resolvedInvitation,setInvitation]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[pending,setPending]=useState('')
 const invitation=resolvedInvitation?.code===invitationCode?resolvedInvitation:null
 useEffect(()=>{if(!invitationCode)return;setMode('activate');setInvitation(null);setError('');let active=true;supabase.rpc('careline_staff_activation',{code:invitationCode}).then(({data,error})=>{if(active){setInvitation(data?{...data,code:invitationCode}:null);if(error)setError(error.message)}});return()=>{active=false}},[invitationCode])
 const registering=['register','activate'].includes(mode)
 const fields=pending?[['code','SMS verification code','number']]:registering?[['first_name','First name'],['last_name','Last name'],...(mode==='activate'?[]:[['identifier','Email or +237 phone']]),['password','Password (at least 8 characters)','password']]:mode==='recover'?[['identifier','Account email','email']]:[['identifier','Email or +237 phone'],['password','Password','password']]
 async function submit(){
  if(busy)return;setBusy(true);setError('');setMessage('')
  try{
   if(pending){const {error}=await supabase.auth.verifyOtp({phone:pending,token:form.code,type:'sms'});if(error)throw error;return}
   if(mode==='activate'&&!invitation)throw Error('Ask your administrator for a valid invitation.');
   if(mode!=='activate'&&!form.identifier)throw Error('Enter your email or phone.')
   if(mode==='recover'){const {error}=await supabase.auth.resetPasswordForEmail(form.identifier);if(error)throw error;setMessage('Check your email for recovery instructions.');return}
   if(!form.password)throw Error('Enter your password.')
   if(mode==='login'){const {error}=await signIn(form.identifier,form.password);if(error)throw error;return}
   if(form.password.length<8)throw Error('Use at least 8 characters.')
   if(!form.first_name?.trim()||!form.last_name?.trim())throw Error('Enter your first and last names.')
   const identifier=mode==='activate'?invitation.email:form.identifier
   const identity=identifier.includes('@')?{email:identifier.trim()}:{phone:normalizePhone(identifier)}
   const {data,error}=await supabase.auth.signUp({...identity,password:form.password,options:{data:{name:[form.first_name.trim(),form.last_name.trim()].join(' '),...(mode==='register'&&!existing?{first_name:form.first_name.trim(),last_name:form.last_name.trim()}:{}),...(mode==='activate'?{staff_invitation:invitationCode}:{}),phone:identity.phone||null}}})
   if(error)throw error
   if(!data.session&&identity.phone){setPending(identity.phone);setMessage('Enter the SMS verification code.')}else if(!data.session)setMessage('Confirm the email sent to you, then sign in.')
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <KeyboardAvoidingView style={[styles.page,{paddingTop:inset.top}]} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={[styles.content,{paddingTop:45}]} keyboardShouldPersistTaps="handled"><Image source={require('../../assets/careline-mark-v2.png')} accessibilityLabel="Careline logo" style={{width:76,height:76,marginBottom:12}}/><Text style={[styles.title,{fontSize:42,marginBottom:20}]}>careline<Text style={{color:'#c77851'}}>+</Text></Text><Text style={styles.title}>{pending?'Verify your phone':mode==='activate'?'Set up your staff account':mode==='register'?'Create your patient account':mode==='recover'?'Recover your account':'Welcome back.'}</Text><Text style={styles.subtitle}>{mode==='activate'?(invitation?invitation.institution+' has invited you as '+invitation.role+'. Confirm your email, then sign in.':'Checking your private invitation...'):'Your care, connected.'}</Text>{mode==='activate'&&invitation&&<Text style={styles.subtitle}>Invited email: {invitation.email}</Text>}<Card>{fields.map(field=><Field key={field[0]} field={field} value={form[field[0]]} onChange={value=>setForm(p=>({...p,[field[0]]:value}))}/>)}{mode==='register'&&!pending&&<View style={styles.row}><Text style={[styles.subtitle,{flex:1}]}>I already have a Careline patient card</Text><Switch accessibilityLabel="I already have a Careline patient card" value={existing} onValueChange={setExisting}/></View>}{error&&<Text style={styles.error}>{error}</Text>}{message&&<Text style={styles.subtitle}>{message}</Text>}<Button disabled={busy||(mode==='activate'&&!invitation)} onPress={submit}>{busy?'Please wait…':pending?'Verify':mode==='activate'?'Set password and verify email':mode==='register'?'Create account':mode==='recover'?'Send recovery email':'Sign in'}</Button><Button ghost disabled={busy} onPress={()=>{setMode(mode==='login'?'register':'login');setPending('');setError('');setMessage('')}}>{mode==='login'?'Create an account':'Back to sign in'}</Button>{mode==='login'&&<Button ghost onPress={()=>setMode('recover')}>Forgot your password?</Button>}</Card><Text style={styles.muted}>A facility can register you for care without a phone or online account.</Text></ScrollView></KeyboardAvoidingView>
}
