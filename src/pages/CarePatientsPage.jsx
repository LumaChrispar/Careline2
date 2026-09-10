import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import useAuthStore from '../stores/authStore'
import { fullName, ageLabel } from '../lib/careline'
import { Panel, Empty, Field } from '../components/ui/CarelineUI'
export default function CarePatientsPage() {
  const {user}=useAuthStore()
  const [search,setSearch]=useState(''),[page,setPage]=useState(0),[rows,setRows]=useState([]),[busy,setBusy]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0)
  useEffect(()=>{let live=true; const timer=setTimeout(async()=>{
    setBusy(true);setError('')
    try{
      let q=supabase.from('patients').select('*').is('archived_at',null).order('created_at',{ascending:false}).range(page*25,page*25+24)
      const clean=search.trim().replace(/[^\p{L}\p{N} +@.-]/gu,'')
      if(clean) {
        const parts=clean.split(/\s+/)
        q=parts.length>1 ? q.ilike('first_name','%'+parts[0]+'%').ilike('last_name','%'+parts.slice(1).join(' ')+'%') : q.or(['first_name','last_name','phone','id'].map(f=>f+'.ilike.%'+clean+'%').join(','))
      }
      const {data,error}=await q
      if(error)throw error
      if(live)setRows(data||[])
    }catch(e){if(live)setError(e.message)}finally{if(live)setBusy(false)}
  },250);return()=>{live=false;clearTimeout(timer);setRows([])}},[search,page,user?.id,user?.user_metadata?.facility_id,retry])
  return <div className="care-stack"><div className="care-page-title"><div><p className="care-eyebrow">PATIENTS</p><h1>A familiar face. A continuous record.</h1><p>Search before registering to avoid creating a second record.</p></div><Link className="btn btn-primary" to="/patients/new">Register patient</Link></div><Panel title="Patient directory"><Field label="Search by name, phone or Careline ID" value={search} onChange={e=>{setSearch(e.target.value);setPage(0)}}/>{busy&&<p role="status">Searching…</p>}{error&&<p className="care-error" role="alert">{error}<button onClick={()=>setRetry(v=>v+1)}>Retry</button></p>}<div className="care-table-wrap"><table className="care-table"><thead><tr><th>Patient</th><th>Age</th><th>Contact</th><th>Location</th><th/></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td><strong>{fullName(p)}</strong><small>{p.id}</small></td><td>{ageLabel(p.date_of_birth)}</td><td>{p.phone||'Not recorded'}</td><td>{p.village||p.region||'Not recorded'}</td><td><Link className="btn btn-ghost" to={'/patients/'+p.id}>Open record →</Link></td></tr>)}</tbody></table></div>{!busy&&!rows.length&&<Empty>No matching patients.</Empty>}<div className="care-form-footer"><button className="btn btn-ghost" disabled={page===0||busy} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page+1}</span><button className="btn btn-ghost" disabled={rows.length<25||busy} onClick={()=>setPage(p=>p+1)}>Next</button></div></Panel></div>
}
