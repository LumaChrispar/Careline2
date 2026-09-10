import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useOutbreakStore = create((set, get) => ({
  alerts: [],
  config: {
    threshold: 20,
    windowDays: 14,
  },
  isLoading: false,

  fetchData: async () => {
     set({ isLoading: true })
     const { data, error } = await supabase.from('outbreak_alerts').select('*').order('triggered_at', { ascending: false })
     if (!error && data) set({ alerts: data })
     set({ isLoading: false })
  },

  getActiveAlerts: () => {
    return get().alerts.filter(a => !a.resolved_at)
  },

  getResolvedAlerts: () => {
    return get().alerts.filter(a => a.resolved_at)
  },

  updateConfig: (newConfig) => {
    set({ config: { ...get().config, ...newConfig } })
  },

  checkForOutbreaks: async (facilityId) => {
    // If no facilityId provided, try to extract from auth store
    if (!facilityId) {
      const { user } = (await import('./authStore')).default.getState()
      facilityId = user?.user_metadata?.facility_id
    }
    if (!facilityId) return

    const { threshold, windowDays } = get().config
    const since = new Date(Date.now() - windowDays * 86400000).toISOString()

    // Fetch recent visits for this facility from Supabase
    const { data: visits, error } = await supabase
      .from('visits')
      .select('symptoms')
      .eq('facility_id', facilityId)
      .gte('date', since)

    if (error || !visits) return

    // Count occurrences of each symptom
    const symptomCounts = {}
    visits.forEach(v => {
      if (v.symptoms && Array.isArray(v.symptoms)) {
        v.symptoms.forEach(symptom => {
          symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1
        })
      }
    })

    // Fetch existing active alerts for this facility
    const { data: existingAlerts } = await supabase
      .from('outbreak_alerts')
      .select('*')
      .eq('facility_id', facilityId)
      .is('resolved_at', null)

    const activeAlerts = existingAlerts || []

    let alertsUpdated = false

    // Fire alert if threshold crossed
    for (const [symptom, count] of Object.entries(symptomCounts)) {
      if (count >= threshold) {
        const existing = activeAlerts.find(a => a.symptom === symptom)
        if (existing) {
          // Update count if it changed
          if (existing.case_count !== count) {
            await supabase.from('outbreak_alerts').update({ case_count: count }).eq('id', existing.id)
            alertsUpdated = true
          }
        } else {
          // Create new alert
          await supabase.from('outbreak_alerts').insert({
            symptom,
            facility_id: facilityId,
            case_count: count,
            window_days: windowDays,
            triggered_at: new Date().toISOString()
          })
          alertsUpdated = true
        }
      }
    }

    if (alertsUpdated) {
        await get().fetchData() // refresh the local store
    }
  },

  notifyAuthorities: async (alertId, userId) => {
    const { error } = await supabase.from('outbreak_alerts').update({ authority_notified: true, notified_by: userId, notified_at: new Date().toISOString() }).eq('id', alertId)
    if (!error) {
       await get().fetchData()
    }
  },

  resolveAlert: async (alertId) => {
    const { error } = await supabase.from('outbreak_alerts').update({ resolved_at: new Date().toISOString() }).eq('id', alertId)
    if (!error) {
       await get().fetchData()
    }
  },
}))

export default useOutbreakStore
