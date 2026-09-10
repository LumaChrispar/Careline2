import { Link } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import useRecords from '../hooks/useRecords'
import { Panel, Status, Feedback, Empty, ActionButton } from '../components/ui/CarelineUI'
export default function WorklistPage() {
  const { user, role } = useAuthStore()
  const visits = useRecords('visits')
  const labs = useRecords('lab_results', {order:'uploaded_at'})
  const appointments = useRecords('appointments')
  const open = visits.rows.filter(v => !['completed','cancelled'].includes(v.status))
  const review = labs.rows.filter(l => l.status === 'completed')
  return <div className="care-stack">
    <div className="care-welcome"><div><p className="care-eyebrow">CARELINE · YOUR DAY</p><h1>Good care starts with a clear next step.</h1><p>Welcome, {user?.name || 'colleague'}. Your {role === 'nurse' ? 'nursing and reception' : role} workspace is ready.</p></div><Link className="btn btn-primary" to="/patients/new">Register a patient</Link></div>
    <div className="care-stats"><div><span>Open visits</span><strong>{open.length}</strong><small>In the latest 200 visits</small></div><div><span>Results to review</span><strong>{review.length}</strong><small>Completed by the laboratory</small></div><div><span>Appointment requests</span><strong>{appointments.rows.filter(a=>a.status==='requested').length}</strong><small>Awaiting confirmation</small></div></div>
    <Panel title="Patients awaiting care" actions={<button className="btn btn-ghost" onClick={visits.refresh}>Refresh</button>}>
      <Feedback data={visits}/><div className="care-table-wrap"><table className="care-table"><thead><tr><th>Patient</th><th>Arrived</th><th>Priority</th><th>Stage</th><th>Next step</th></tr></thead><tbody>
      {open.map(v=><tr key={v.id}><td><Link to={'/patients/'+v.patient_id}>{v.patient_id}</Link></td><td>{new Date(v.date).toLocaleString()}</td><td><Status value={v.priority}/></td><td><Status value={v.status}/></td><td><Link className="btn btn-ghost" to={'/patients/'+v.patient_id}>Open visit →</Link></td></tr>)}
      </tbody></table></div>{!open.length&&!visits.loading&&<Empty>No patients are currently waiting. Open a patient record to register an arrival.</Empty>}
    </Panel>
    <div className="care-grid"><Panel title="Results awaiting clinician review"><Feedback data={labs}/>{review.map(l=><div className="care-list-row" key={l.id}><div><strong>{l.test_type}</strong><p>{l.patient_id}</p></div><Link to="/lab" className="btn btn-ghost">Review</Link></div>)}{!review.length&&<Empty>No completed results awaiting review.</Empty>}</Panel>
    <Panel title="Upcoming appointments"><Feedback data={appointments}/>{appointments.rows.filter(a=>['requested','confirmed'].includes(a.status)).sort((a,b)=>a.scheduled_at.localeCompare(b.scheduled_at)).slice(0,5).map(a=><div className="care-list-row" key={a.id}><div><strong>{a.patient_id}</strong><p>{new Date(a.scheduled_at).toLocaleString()}</p><Status value={a.status}/></div>{a.status==='requested'&&<ActionButton action="appointment_status" initial={{id:a.id,status:'confirmed'}}>Confirm</ActionButton>}</div>)}<Link className="btn btn-ghost" to="/appointments">Manage appointments →</Link></Panel></div>
  </div>
}
