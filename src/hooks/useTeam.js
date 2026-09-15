import { useEffect, useState } from 'react'
import { rpc } from '../lib/careline'
import useAuthStore from '../stores/authStore'

export default function useTeam() {
  const facility = useAuthStore(s => s.user?.user_metadata?.facility_id)
  const [state, setState] = useState({ rows: [], error: '' })
  useEffect(() => {
    let live = true
    setState({ rows: [], error: '' })
    if (facility) rpc('careline_staff_directory', { f: facility }).then(rows => {
      if (live) setState({ rows: rows || [], error: '' })
    }).catch(error => { if (live) setState({ rows: [], error: error.message }) })
    return () => { live = false }
  }, [facility])
  return state
}
