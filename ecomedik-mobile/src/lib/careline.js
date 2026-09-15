import { supabase } from './supabase'
import * as Crypto from 'expo-crypto'
export const requestId = () => Crypto.randomUUID()
export function normalizePhone(value){
 const digits=String(value||'').replace(/\D/g,'')
 const national=digits.startsWith('00237')?digits.slice(5):digits.startsWith('237')?digits.slice(3):digits
 if(!/^[2368]\d{8}$/.test(national))throw Error('Enter +237 followed by a valid 9-digit Cameroon number.')
 return '+237'+national
}
export async function rpc(name,args={}){
 const {data,error}=await supabase.rpc(name,args)
 if(error)throw error
 return data
}
const coordinationActions = new Set(['concern_add','concern_review','plan_save','plan_publish','plan_acknowledge','task_create','task_update','lab_escalate'])
export const command = (action, f, payload) => rpc(['assign_doctor','referral_assign','revoke_invitation'].includes(action) ? 'careline_staff_care' : coordinationActions.has(action) ? 'careline_coordination' : 'careline_command', { action, f, payload })
export async function signIn(identifier,password){
 if(identifier.includes('@'))return supabase.auth.signInWithPassword({email:identifier.trim(),password})
 const phone=normalizePhone(identifier),result=await supabase.auth.signInWithPassword({phone,password})
 if(!result.error||result.error.code!=='invalid_credentials')return result
 for(const digits of [phone.slice(1),phone.slice(4)]){
  const legacy=await supabase.auth.signInWithPassword({email:digits+'@patient.eco-medic.local',password})
  if(!legacy.error||legacy.error.code!=='invalid_credentials')return legacy
 }
 return result
}
export async function privateDocument(result){
 const path=result.storage_path||result.file_url?.split('/storage/v1/object/public/LAB_result/')[1]
 if(!path)throw Error('This legacy attachment needs migration. Ask the facility for a private copy.')
 const {data,error}=await supabase.storage.from('LAB_result').createSignedUrl(path,120)
 if(error)throw error
 return data.signedUrl
}
export const money=value=>Number(value||0).toLocaleString('fr-CM')+' FCFA'
export const currentPrescription=p=>p.status==='active'&&p.starts_on<=new Date().toISOString().slice(0,10)&&(!p.ends_on||p.ends_on>=new Date().toISOString().slice(0,10))
