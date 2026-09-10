import { useState } from 'react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../stores/authStore'
import PatientSelect from '../components/PatientSelect'
import { Panel,Field } from '../components/ui/CarelineUI'
export default function CareUploadPage(){
 const user=useAuthStore(s=>s.user),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[id]=useState(()=>crypto.randomUUID())
 async function submit(e){
  e.preventDefault();if(busy)return;setBusy(true);setError('');setMessage('');const form=e.currentTarget,p=Object.fromEntries(new FormData(form));let path=null
  try{
   const file=p.file,facility=user.user_metadata.facility_id
   if(file?.size){
    if(file.size>10*1024*1024||!['application/pdf','image/jpeg','image/png'].includes(file.type))throw Error('Choose a PDF, JPG or PNG up to 10 MB.')
    path=[facility,p.patient_id,id+'.'+({ 'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png'}[file.type])].join('/')
    const {error}=await supabase.storage.from('LAB_result').upload(path,file)
    if(error)throw error
   }
   const {error}=await supabase.from('lab_results').insert({id,patient_id:p.patient_id,facility_id:facility,test_type:p.test_type,summary:p.summary,storage_path:path,uploaded_by:user.id})
   if(error)throw error
   setMessage('Result saved. A clinician can now review it.');form.reset();window.dispatchEvent(new Event('careline:refresh'))
  }catch(e){
   if(path)await supabase.storage.from('LAB_result').remove([path])
   setError(e.message)
  }finally{setBusy(false)}
 }
 return <Panel title="Upload a standalone laboratory result"><p>For an existing test request, complete it from the laboratory worklist.</p><form className="care-form care-narrow" onSubmit={submit}><fieldset disabled={busy||!!message}><PatientSelect/><Field label="Test name" name="test_type" required/><Field label="Validated result / findings" name="summary" type="textarea" required/><Field label="Attachment (PDF, JPG, PNG; maximum 10 MB)" name="file" type="file" accept="application/pdf,image/jpeg,image/png"/><button className="btn btn-primary">{busy?'Uploading…':'Save result'}</button></fieldset></form>{error&&<p className="care-error" role="alert">{error}</p>}{message&&<p role="status" className="care-notice">{message}</p>}</Panel>
}
