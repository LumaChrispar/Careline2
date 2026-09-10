import { useState } from 'react'
import { command } from '../../lib/careline'
import useAuthStore from '../../stores/authStore'
export function Panel({ title, children, actions }) {
  return <section className="care-panel"><div className="care-panel-heading"><h2>{title}</h2>{actions}</div>{children}</section>
}
export function Status({ value }) { return <span className={'care-status status-' + value}>{String(value || 'unknown').replaceAll('_',' ')}</span> }
export function Feedback({ data }) {
  if (data.loading) return <p className="care-muted" role="status">Loading…</p>
  if (data.error) return <div className="care-error" role="alert">{data.error} <button className="btn btn-ghost" onClick={data.refresh}>Retry</button></div>
  return data.rows.length >= 200 ? <p className="care-muted">Showing the latest 200 records. Open a patient to view their history.</p> : null
}
export function Empty({ children = 'No records yet.' }) { return <div className="care-empty">{children}</div> }
export function Field({ label, name, type = 'text', required = false, options, ...props }) {
  return <label className="care-field"><span>{label}{required ? ' *' : ''}</span>{options ? <select name={name} required={required} {...props}>{options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}</select> : type === 'textarea' ? <textarea name={name} rows={3} required={required} {...props}/> : <input name={name} type={type} required={required} {...props}/>}</label>
}
export function ActionForm({ action, facilityId, initial = {}, children, label = 'Save', after, transform }) {
  const selected = useAuthStore(s => s.user?.user_metadata?.facility_id)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('')
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  async function submit(event) {
    event.preventDefault(); if (busy) return
    const form = event.currentTarget
    setBusy(true); setError(''); setSuccess('')
    try {
      let payload = { id: requestId, ...initial, ...Object.fromEntries(new FormData(form)) }
      if (transform) payload = transform(payload)
      await command(action, facilityId || selected, payload)
      form.reset(); setRequestId(crypto.randomUUID()); setSuccess('Saved successfully.'); window.dispatchEvent(new Event('careline:refresh')); after?.()
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <form onSubmit={submit} className="care-form"><fieldset disabled={busy}>{children}<div className="care-form-footer"><button className="btn btn-primary" type="submit">{busy ? 'Saving…' : label}</button><span role="status">{success}</span></div></fieldset>{error && <p className="care-error" role="alert">{error}</p>}</form>
}
export function ActionButton({ action, initial, facilityId, children, after, className = 'btn btn-ghost' }) {
  const selected = useAuthStore(s => s.user?.user_metadata?.facility_id)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  return <span><button type="button" className={className} disabled={busy} onClick={async () => { if (busy) return; setBusy(true); setError(''); try { await command(action,facilityId || selected,initial); window.dispatchEvent(new Event('careline:refresh')); after?.() } catch (e) { setError(e.message) } finally { setBusy(false) } }}>{busy ? 'Saving…' : children}</button>{error && <span role="alert" className="care-error">{error}</span>}</span>
}
