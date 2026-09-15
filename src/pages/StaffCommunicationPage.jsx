import { useEffect, useState } from 'react'
import useAuthStore from '../stores/authStore'
import useRecords from '../hooks/useRecords'
import { rpc } from '../lib/careline'
import { Panel, Field, Feedback, Empty, Status, ActionForm, ActionButton } from '../components/ui/CarelineUI'

export default function StaffCommunicationPage() {
  const { user, role } = useAuthStore(), facility = user.user_metadata.facility_id
  const messages = useRecords('staff_broadcasts')
  const [audience, setAudience] = useState('all'), [staff, setStaff] = useState([]), [error, setError] = useState('')
  useEffect(() => {
    let live = true
    rpc('careline_staff_directory', { f: facility }).then(rows => {
      if (live) { setStaff(rows || []); setError('') }
    }).catch(error => { if (live) setError(error.message) })
    return () => { live = false }
  }, [facility])
  return <div className="care-stack">
    <div className="care-page-title"><div><p className="care-eyebrow">TEAM COMMUNICATION</p><h1>Keep your colleagues informed.</h1><p>Share updates with your institution, a role, or one colleague.</p></div></div>
    <Panel title="Post a notice">
      <ActionForm action="notice" label="Post notice" after={() => setAudience('all')}>
        <Field label="Notice" name="content" type="textarea" required maxLength={5000}/>
        <div className="care-grid">
          <Field label="Audience" name="target_type" value={audience} onChange={e => setAudience(e.target.value)} options={[{ value: 'all', label: 'All institution staff' }, { value: 'role', label: 'A staff role' }, { value: 'individual', label: 'One colleague' }]}/>
          <Field label="Priority" name="priority" options={['normal', 'urgent']}/>
        </div>
        {audience === 'role' && <Field label="Staff role" name="target_role" options={['nurse', 'doctor', 'labtech', 'pharmacist', 'admin']}/>}
        {audience === 'individual' && <><Field label="Colleague" name="target_user_id" required options={[{ value: '', label: 'Choose a colleague' }, ...staff.map(s => ({ value: s.id, label: s.name + ' · ' + s.role }))]}/>{error && <p className="care-error" role="alert">{error}</p>}</>}
      </ActionForm>
    </Panel>
    <Panel title="Institution notices" actions={<button className="btn btn-ghost" onClick={messages.refresh}>Refresh</button>}>
      <Feedback data={messages}/>
      {messages.rows.map(message => <article className="care-history" key={message.id}>
        <div className="care-list-row"><div><strong>{message.author_name}</strong><p>{new Date(message.created_at).toLocaleString()} · {message.target_type === 'all' ? 'All staff' : message.target_type === 'role' ? message.target_role : 'Direct notice'}</p></div><Status value={message.priority}/></div>
        <p className="care-prewrap">{message.content}</p>
        {(message.author_id === user.id || role === 'admin') && <ActionButton action="delete_notice" initial={{ id: message.id }}>Remove notice</ActionButton>}
      </article>)}
      {!messages.loading && !messages.error && !messages.rows.length && <Empty>No notices yet.</Empty>}
    </Panel>
  </div>
}
