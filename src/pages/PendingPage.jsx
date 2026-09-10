import { useEffect,useState } from 'react'
import useAuthStore from '../stores/authStore'
import { pendingDrafts,syncIntake,discardDraft } from '../lib/offline'
import { Panel,Empty } from '../components/ui/CarelineUI'
export default function PendingPage(){
 const owner=useAuthStore(s=>s.user.id),[rows,setRows]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const reload=()=>pendingDrafts(owner).then(setRows).catch(e=>setError(e.message))
 useEffect(()=>{reload();window.addEventListener('careline:refresh',reload);return()=>window.removeEventListener('careline:refresh',reload)},[owner])
 return <Panel title="Pending intake"><p>These drafts have not yet been saved to your institution. Reconnect and sync before closing this browser session.</p><button className="btn btn-primary" disabled={busy} onClick={async()=>{setBusy(true);try{await syncIntake(owner);await reload()}catch(e){setError(e.message)}finally{setBusy(false)}}}>{busy?'Syncing…':'Sync now'}</button>{error&&<p role="alert" className="care-error">{error}</p>}{rows.map(d=><div className="care-list-row" key={d.id}><div><strong>Intake {d.id.slice(0,8)}</strong><p>{new Date(d.created_at).toLocaleString()}</p><small>Facility: {d.facility}</small>{d.error&&<p className="care-error">{d.error}</p>}</div><button className="btn btn-ghost" onClick={async()=>{if(!confirm('Discard this unsaved intake? You will need to register the patient again.'))return;await discardDraft(d.id,owner);reload()}}>Discard draft</button></div>)}{!rows.length&&<Empty>All intake is synced. No pending drafts.</Empty>}</Panel>
}
