import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useOutbreakStore = create((set, get) => ({
  alerts: [],
  config: {
    threshold: 20,
    windowDays: 14,
  },
  isLoading: false,

  fetchData: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('outbreak_alerts')
      .select('*')
      .order('triggered_at', { ascending: false });
    if (!error && data) set({ alerts: data });
    set({ isLoading: false });
  },

  updateConfig: (newConfig) => {
    set({ config: { ...get().config, ...newConfig } });
  },

  checkForOutbreaks: async (facilityId) => {
    if (!facilityId) {
      const { data: { user } } = await supabase.auth.getUser()
      facilityId = user?.user_metadata?.facility_id
    }
    if (!facilityId) return

    const { threshold, windowDays } = get().config
    const since = new Date(Date.now() - windowDays * 86400000).toISOString()

    const { data: visits, error } = await supabase
      .from('visits')
      .select('symptoms')
      .eq('facility_id', facilityId)
      .gte('date', since)

    if (error || !visits) return

    const symptomCounts = {}
    visits.forEach(v => {
      if (v.symptoms && Array.isArray(v.symptoms)) {
        v.symptoms.forEach(symptom => {
          symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1
        })
      }
    })

    const { data: existingAlerts } = await supabase
      .from('outbreak_alerts')
      .select('*')
      .eq('facility_id', facilityId)
      .is('resolved_at', null)

    const activeAlerts = existingAlerts || []
    let alertsUpdated = false

    for (const [symptom, count] of Object.entries(symptomCounts)) {
      if (count >= threshold) {
        const existing = activeAlerts.find(a => a.symptom === symptom)
        if (existing) {
          if (existing.case_count !== count) {
            await supabase.from('outbreak_alerts').update({ case_count: count }).eq('id', existing.id)
            alertsUpdated = true
          }
        } else {
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
        await get().fetchData()
    }
  },

  notifyAuthorities: async (alertId, userId) => {
    const { error } = await supabase
      .from('outbreak_alerts')
      .update({ 
        authority_notified: true, 
        notified_by: userId, 
        notified_at: new Date().toISOString() 
      })
      .eq('id', alertId);
    if (!error) {
       await get().fetchData();
    }
  },

  resolveAlert: async (alertId) => {
    const { error } = await supabase
      .from('outbreak_alerts')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', alertId);
    if (!error) {
       await get().fetchData();
    }
  },
}));

export default useOutbreakStore;
