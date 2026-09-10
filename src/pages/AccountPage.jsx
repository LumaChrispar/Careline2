import { useState } from 'react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../stores/authStore'
import { Panel,Field } from '../components/ui/CarelineUI'
export default function AccountPage(){
 const {user,updateProfile}=useAuthStore(),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 async function save(e){e.preventDefault();if(busy)return;setBusy(true);setError('');setMessage('');const p=Object.fromEntries(new FormData(e.currentTarget));try{const result=await updateProfile({name:p.name});if(!result.success)throw Error(result.error);if(p.password){const {error}=await supabase.auth.updateUser({password:p.password});if(error)throw error}setMessage('Account updated.')}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <Panel title="Your account"><form className="care-form care-narrow" onSubmit={save}><Field label="Display name" name="name" defaultValue={user.name} required/><Field label="New password (leave blank to keep current password)" name="password" type="password" autoComplete="new-password" minLength="8"/><button className="btn btn-primary" disabled={busy}>Save account</button></form>{error&&<p className="care-error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}</Panel>
}
