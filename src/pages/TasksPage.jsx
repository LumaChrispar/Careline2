import { useState } from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import useRecords from '../hooks/useRecords'
import useTeam from '../hooks/useTeam'
import { taskBucket, taskGroups, taskClosed } from '../lib/tasks'
import { Panel, Field, Feedback, Empty, Status, ActionForm } from '../components/ui/CarelineUI'

export function TaskForm({ patientId, after }) {
  const team = useTeam(), user = useAuthStore(s => s.user)
  return <ActionForm action="task_create" initial={{ patient_id: patientId || '' }} label="Assign task" after={after} transform={p => ({ ...p, due_at: new Date(p.due_at).toISOString() })}>
    <Field label="What needs to happen?" name="title" required maxLength={250}/>
    <Field label="Handover details" name="details" type="textarea"/>
    <div className="care-grid"><Field label="Responsible colleague" name="assigned_to" defaultValue={user.id} required options={[{ value: '', label: 'Choose a colleague' }, ...team.rows.map(p => ({ value: p.id, label: p.name + ' · ' + p.role }))]}/><Field label="Due date and time" name="due_at" type="datetime-local" required/></div>
    <Field label="Priority" name="priority" options={['routine', 'urgent']}/>
    {team.error && <p className="care-error" role="alert">{team.error}</p>}
  </ActionForm>
}

export default function TasksPage() {
  const { user, role } = useAuthStore(), team = useTeam()
  const [group, setGroup] = useState('urgent'), [scope, setScope] = useState('mine'), [adding, setAdding] = useState(false)
  const tasks = useRecords('care_tasks', { order: 'due_at', ascending: group !== 'closed', statuses: group === 'closed' ? ['completed', 'cancelled'] : ['open', 'in_progress', 'waiting'] })
  const visible = tasks.rows.filter(t => scope === 'team' || t.assigned_to === user.id || !t.assigned_to)
  const rows = visible.filter(t => taskBucket(t) === group)
  return <div className="care-stack">
    <div className="care-page-title"><div><p className="care-eyebrow">CARE COORDINATION</p><h1>A clear owner. A clear next step.</h1><p>Track follow-ups, result reviews, and handovers in one worklist.</p></div><button className="btn btn-primary" onClick={() => setAdding(!adding)}>{adding ? 'Close form' : 'Assign a task'}</button></div>
    {adding && <Panel title="New task"><TaskForm after={() => setAdding(false)}/></Panel>}
    <Panel title="Tasks" actions={<button className="btn btn-ghost" onClick={tasks.refresh}>Refresh</button>}>
      <Field label="Show tasks" value={scope} onChange={e => setScope(e.target.value)} options={[{ value: 'mine', label: 'Assigned to me or awaiting an owner' }, { value: 'team', label: 'All tasks I can access' }]}/>
      <div className="care-tabs">{taskGroups.map(([key, label]) => <button key={key} aria-pressed={group === key} onClick={() => setGroup(key)}>{label}</button>)}</div>
      <Feedback data={tasks}/>
      {rows.map(t => <article className="care-history" key={t.id}>
        <div className="care-list-row"><div><h3>{t.title}</h3><p>{t.patient_id || 'Institution task'}</p></div><Status value={t.priority === 'urgent' ? 'urgent' : t.status}/></div>
        <p className="care-prewrap">{t.details}</p><p>Due {new Date(t.due_at).toLocaleString()}</p>
        <p>Owner: {team.rows.find(m => m.id === t.assigned_to)?.name || (t.assigned_to ? 'Assigned colleague (access may need review)' : 'Needs an owner')}</p>
        {t.outcome && <p className="care-prewrap">Latest update: {t.outcome}</p>}
        {t.patient_id && ['admin', 'doctor', 'nurse'].includes(role) && <Link className="btn btn-ghost" to={'/patients/' + t.patient_id}>Open patient</Link>}
        {t.source === 'lab_review' && !taskClosed(t) && <Link className="btn btn-primary" to="/lab">Review laboratory result</Link>}
        {!taskClosed(t) && <details className="care-disclosure"><summary>Update or hand over task</summary><ActionForm action="task_update" key={t.id + ':' + t.version} initial={{ id: t.id, version: t.version }} label="Save task update">
          <Field label="Task status" name="status" defaultValue={t.status} options={t.source === 'lab_review' ? ['open', 'in_progress', 'waiting'] : ['open', 'in_progress', 'waiting', 'completed', 'cancelled']}/>
          <Field label="Responsible colleague" name="assigned_to" defaultValue={t.assigned_to || user.id} required options={[{ value: '', label: 'Choose colleague' }, ...team.rows.filter(m => t.source !== 'lab_review' || ['admin', 'doctor'].includes(m.role)).map(m => ({ value: m.id, label: m.name + ' · ' + m.role }))]}/>
          <Field label="Outcome or reason for waiting" name="outcome" type="textarea"/>
        </ActionForm></details>}
      </article>)}
      {!tasks.loading && !tasks.error && !rows.length && <Empty>No {taskGroups.find(g => g[0] === group)[1].toLowerCase()} tasks in this view.</Empty>}
    </Panel>
  </div>
}
