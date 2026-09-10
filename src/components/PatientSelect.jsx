import { useEffect,useState } from 'react'
import { supabase } from '../lib/supabase'
import { fullName } from '../lib/careline'
import { Field } from './ui/CarelineUI'
export default function PatientSelect(){
 const [search,setSearch]=useState(''),[rows,setRows]=useState([]),[error,setError]=useState('')
 useEffect(()=>{let live=true;const timer=setTimeout(async()=>{const clean=search.replace(/[^\p{L}\p{N} +.-]/gu,'').trim();let q=supabase.from('patients').select('id,first_name,last_name').limit(20);if(clean)q=q.or('first_name.ilike.%'+clean+'%,last_name.ilike.%'+clean+'%,id.ilike.%'+clean+'%');const {data,error}=await q;if(live){setRows(data||[]);setError(error?.message||'')}},250);return()=>{live=false;clearTimeout(timer)}},[search])
 return <div><Field label="Find patient" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name or Careline ID"/><Field label="Patient" name="patient_id" required options={[{value:'',label:'Select patient'},...rows.map(p=>({value:p.id,label:fullName(p)+' · '+p.id}))]}/>{error&&<p role="alert" className="care-error">{error}</p>}</div>
}
