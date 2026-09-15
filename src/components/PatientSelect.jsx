import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fullName } from '../lib/careline'
import { searchPatients } from '../lib/patientSearch'
import { Field } from './ui/CarelineUI'

export default function PatientSelect() {
  const [search, setSearch] = useState(''), [rows, setRows] = useState([])
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0)
  useEffect(() => {
    let live = true
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const query = supabase.from('patients').select('id,first_name,last_name').is('archived_at', null).order('created_at', { ascending: false }).limit(20)
        const { data, error } = await searchPatients(query, search)
        if (error) throw error
        if (live) { setRows(data || []); setError('') }
      } catch (error) {
        if (live) { setRows([]); setError(error.message) }
      } finally { if (live) setLoading(false) }
    }, 250)
    return () => { live = false; clearTimeout(timer) }
  }, [search, retry])
  return <div>
    <Field label="Find patient" value={search} onChange={e => setSearch(e.target.value)} placeholder="Full name, phone or Careline ID"/>
    <Field label="Patient" name="patient_id" required disabled={loading || !!error} options={[{ value: '', label: loading ? 'Searching…' : 'Select patient' }, ...rows.map(p => ({ value: p.id, label: fullName(p) + ' · ' + p.id }))]}/>
    {!loading && !error && !rows.length && <p role="status" className="care-muted">No matching patients. Check the name or patient ID.</p>}
    {error && <p role="alert" className="care-error">{error} <button type="button" onClick={() => setRetry(v => v + 1)}>Retry search</button></p>}
  </div>
}
