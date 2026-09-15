import { useState } from 'react'
import useRecords from '../hooks/useRecords'
import useAuthStore from '../stores/authStore'
import { Panel, Field, Status, Feedback, Empty, ActionForm, ActionButton } from './ui/CarelineUI'

export function ConcernPanel({ patientId, facilityId, patientView = false }) {
  const concerns = useRecords('patient_concerns', { field: 'patient_id', value: patientId })
  const [adding, setAdding] = useState(false)
  const visible = concerns.rows.filter(c => patientView || c.facility_id === facilityId)
  return <Panel title={patientView ? 'What matters to you?' : 'Patient concerns'} actions={facilityId && <button className="btn btn-ghost" onClick={() => setAdding(!adding)}>{adding ? 'Close form' : 'Add a concern'}</button>}>
    <p className="care-muted">Record the patient's own words, preferred language, and anything making care difficult. This is reviewed during care, not monitored as an emergency service.</p>
    <Feedback data={concerns}/>
    {adding && <ActionForm action="concern_add" facilityId={facilityId} initial={{ patient_id: patientId }} label="Save concern" after={() => setAdding(false)}>
      <Field label="What would you like the care team to know?" name="concern" type="textarea" maxLength={4000} required/>
      <Field label="Preferred language" name="preferred_language" placeholder="English, French, Pidgin, or another language"/>
      <Field label="What might make your care difficult?" name="access_barriers" type="textarea" placeholder="For example: transport, costs, taking time off, understanding instructions"/>
    </ActionForm>}
    {visible.map(c => <article className="care-history" key={c.id}>
      <Status value={c.status}/><p className="care-prewrap">{c.concern}</p>
      {c.preferred_language && <p>Preferred language: {c.preferred_language}</p>}
      {c.access_barriers && <p>Access needs: {c.access_barriers}</p>}
      <small>{new Date(c.created_at).toLocaleString()}</small>
      {c.response && <div className="care-response"><strong>Care team response</strong><p className="care-prewrap">{c.response}</p></div>}
      {!patientView && c.status === 'open' && <details className="care-disclosure"><summary>Respond to this concern</summary><ActionForm action="concern_review" initial={{ id: c.id }} label="Record response"><Field label="Response discussed with the patient" name="response" type="textarea" required/></ActionForm></details>}
    </article>)}
    {!concerns.loading && !concerns.error && !visible.length && <Empty>No concerns recorded yet.</Empty>}
    {patientView && !facilityId && <p className="care-muted">Your registering institution will appear here once your record is connected to it.</p>}
  </Panel>
}

function PlanFields({ plan = {} }) {
  return <>
    <Field label="Care summary in plain language" name="summary" type="textarea" defaultValue={plan.summary || ''} maxLength={4000} required/>
    <Field label="Medicine instructions agreed with the patient" name="medication_instructions" type="textarea" defaultValue={plan.medication_instructions || ''}/>
    <Field label="Next steps and return arrangements" name="next_steps" type="textarea" defaultValue={plan.next_steps || ''}/>
    <Field label="When and where to seek help" name="warning_signs" type="textarea" defaultValue={plan.warning_signs || ''}/>
    <Field label="Language of the instructions" name="language" defaultValue={plan.language || 'English'} required/>
  </>
}

export function CarePlanPanel({ patientId, facilityId, patientView = false }) {
  const role = useAuthStore(s => s.role), clinical = ['admin', 'doctor'].includes(role)
  const plans = useRecords('care_plans', { field: 'patient_id', value: patientId })
  const [adding, setAdding] = useState(false), [history, setHistory] = useState(false)
  const visible = plans.rows.filter(p => (patientView || p.facility_id === facilityId) && (history || p.status !== 'superseded'))
  function printPlan(id) {
    const target=document.getElementById('plan-'+id)?.cloneNode(true)
    if(!target)return
    target.querySelectorAll('button,details,.care-form-footer').forEach(element=>element.remove())
    const container=document.createElement('div');container.id='care-print-container';container.append(target)
    document.body.append(container);document.body.classList.add('printing-care-plan')
    try { window.print() } finally { document.body.classList.remove('printing-care-plan');container.remove() }
  }
  return <Panel title="Care plan" actions={!patientView && clinical && <button className="btn btn-ghost" onClick={() => setAdding(!adding)}>{adding ? 'Close form' : 'Write a care plan'}</button>}>
    <Feedback data={plans}/>
    {adding && <ActionForm action="plan_save" initial={{ patient_id: patientId }} label="Save draft" after={() => setAdding(false)}><PlanFields/><p className="care-muted">Review and publish the draft when the instructions are ready for the patient.</p></ActionForm>}
    {visible.map(p => <article id={'plan-' + p.id} className="care-history care-plan-document" key={p.id}>
      <div className="care-list-row"><div><h3>Care instructions</h3><small>Patient {patientId} · {p.language}</small></div><Status value={p.status}/></div>
      <p className="care-prewrap">{p.summary}</p>
      {[['Medicines', p.medication_instructions], ['Next steps', p.next_steps], ['When and where to seek help', p.warning_signs]].map(([label, value]) => value && <div className="care-plan-section" key={label}><h4>{label}</h4><p className="care-prewrap">{value}</p></div>)}
      {p.published_at && <p className="care-muted">Approved {new Date(p.published_at).toLocaleString()} · {p.published_by_name || 'Care team'}</p>}
      {p.status === 'draft' && clinical && !patientView && <div className="care-stack">
        <details className="care-disclosure"><summary>Edit draft</summary><ActionForm action="plan_save" key={p.id + ':' + p.version} initial={{ id: p.id, patient_id: patientId, version: p.version }} label="Save revised draft"><PlanFields plan={p}/></ActionForm></details>
        <ActionButton action="plan_publish" initial={{ id: p.id, version: p.version }} className="btn btn-primary">Approve and share with patient</ActionButton>
      </div>}
      {p.status === 'published' && <div className="care-form-footer"><button className="btn btn-ghost" onClick={() => printPlan(p.id)}>Print care instructions</button>{patientView && !p.acknowledged_at && <ActionButton action="plan_acknowledge" facilityId={p.facility_id} initial={{ id: p.id }}>I have read this plan</ActionButton>}</div>}
      {p.acknowledged_at && <p className="care-muted">Patient marked as read {new Date(p.acknowledged_at).toLocaleString()}</p>}
    </article>)}
    {!plans.loading && !plans.error && !visible.length && <Empty>{patientView ? 'Your clinician has not published a care plan yet.' : 'No care plan recorded for this institution.'}</Empty>}
    {plans.rows.some(p => p.status === 'superseded') && <button className="btn btn-ghost" onClick={() => setHistory(!history)}>{history ? 'Hide earlier plans' : 'Show earlier plans'}</button>}
  </Panel>
}
