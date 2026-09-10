import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../stores/authStore'
export default function useRecords(table, { field = 'facility_id', value, order = 'created_at', enabled = true } = {}) {
  const owner = useAuthStore(s => s.user?.id)
  const facility = useAuthStore(s => s.user?.user_metadata?.facility_id)
  const filter = value === undefined ? facility : value
  const [state, setState] = useState({ rows: [], error: '', loading: true })
  const generation = useRef(0)
  const scope = [owner, table, field, filter, enabled].join(':')
  const refresh = useCallback(async () => {
    const run = ++generation.current
    if (!enabled || !owner || (field && !filter)) { setState({ rows: [], error: '', loading: false, scope }); return }
    setState(s => ({ ...s, loading: true, error: '' }))
    try {
      let query = supabase.from(table).select('*').order(order, { ascending: false }).limit(200)
      if (field) query = query.eq(field, filter)
      const { data, error } = await query
      if (run !== generation.current) return
      setState({ rows: data || [], error: error?.message || '', loading: false, scope })
    } catch (error) { if (run === generation.current) setState({ rows: [], error: error.message, loading: false, scope }) }
  }, [owner, table, field, filter, order, enabled, scope])
  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 60000)
    window.addEventListener('online', refresh); window.addEventListener('careline:refresh', refresh)
    return () => { generation.current++; clearInterval(timer); window.removeEventListener('online', refresh); window.removeEventListener('careline:refresh', refresh) }
  }, [refresh])
  return { ...state, rows: state.scope === scope ? state.rows : [], refresh }
}
