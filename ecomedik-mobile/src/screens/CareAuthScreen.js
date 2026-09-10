import React,{useState} from 'react'
import {Text,View,ScrollView,KeyboardAvoidingView,Platform} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {supabase} from '../lib/supabase'
import {normalizePhone,signIn} from '../lib/careline'
import {Button,Field,Card,styles} from '../components/CareUI'
export default function CareAuthScreen(){
 const inset=useSafeAreaInsets(),[mode,setMode]=useState('login'),[form,setForm]=useState({purpose:'new_patient'}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[pending,setPending]=useState('')
 const fields=pending?[['code','SMS verification code','number']]:mode==='register'?[['purpose','Account purpose','select',[{value:'new_patient',label:'My first patient record'},{value:'existing_patient',label:'I have a Careline card'},{value:'staff',label:'Staff or institution owner'}]],['name','Your display name'],['first_name','Patient first name (new records only)'],['last_name','Patient last name (new records only)'],['identifier','Email or +237 phone'],['password','Password (at least 8 characters)','password']]:mode==='recover'?[['identifier','Account email','email']]:[['identifier','Email or +237 phone'],['password','Password','password']]
 async function submit(){
  if(busy)return;setBusy(true);setError('');setMessage('')
  try{
   if(pending){const {error}=await supabase.auth.verifyOtp({phone:pending,token:form.code,type:'sms'});if(error)throw error;return}
   if(!form.identifier)throw Error('Enter your email or phone.')
   if(mode==='recover'){const {error}=await supabase.auth.resetPasswordForEmail(form.identifier);if(error)throw error;setMessage('Check your email for recovery instructions.');return}
   if(!form.password)throw Error('Enter your password.')
   if(mode==='login'){const {error}=await signIn(form.identifier,form.password);if(error)throw error;return}
   if(form.password.length<8)throw Error('Use at least 8 characters.')
   if(form.purpose==='new_patient'&&(!form.first_name?.trim()||!form.last_name?.trim()))throw Error('Enter the patient first and last names.')
   const identity=form.identifier.includes('@')?{email:form.identifier.trim()}:{phone:normalizePhone(form.identifier)}
   const {data,error}=await supabase.auth.signUp({...identity,password:form.password,options:{data:{name:form.name,...(form.purpose==='new_patient'?{first_name:form.first_name,last_name:form.last_name}:{}),phone:identity.phone||null}}})
   if(error)throw error
   if(!data.session&&identity.phone){setPending(identity.phone);setMessage('Enter the SMS verification code.')}else if(!data.session)setMessage('Confirm the email sent to you, then sign in.')
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <KeyboardAvoidingView style={[styles.page,{paddingTop:inset.top}]} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={[styles.content,{paddingTop:45}]} keyboardShouldPersistTaps="handled"><Text style={[styles.title,{fontSize:42,marginBottom:20}]}>careline<Text style={{color:'#c77851'}}>+</Text></Text><Text style={styles.title}>{pending?'Verify your phone':mode==='register'?'Care starts here.':mode==='recover'?'Recover your account':'Welcome back.'}</Text><Text style={styles.subtitle}>Patients and care teams, connected.</Text><Card>{fields.map(field=><Field key={field[0]} field={field} value={form[field[0]]} onChange={value=>setForm(p=>({...p,[field[0]]:value}))}/>)}{error&&<Text style={styles.error}>{error}</Text>}{message&&<Text style={styles.subtitle}>{message}</Text>}<Button disabled={busy} onPress={submit}>{busy?'Please wait…':pending?'Verify':mode==='register'?'Create account':mode==='recover'?'Send recovery email':'Sign in'}</Button><Button ghost disabled={busy} onPress={()=>{setMode(mode==='login'?'register':'login');setPending('');setError('');setMessage('')}}>{mode==='login'?'Create an account':'Back to sign in'}</Button>{mode==='login'&&<Button ghost onPress={()=>setMode('recover')}>Forgot your password?</Button>}</Card><Text style={styles.muted}>A facility can register you for care without a phone or online account.</Text></ScrollView></KeyboardAvoidingView>
}
