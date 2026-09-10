import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const usePatientStore = create((set, get) => ({
  patients: [],
  visits: [],
  searchQuery: '',
  selectedPatient: null,
  isLoading: false,
  error: null,
  generation: 0,
  reset: () => set(s => ({ patients: [], visits: [], selectedPatient: null, searchQuery: '', error: null, isLoading: false, generation: s.generation + 1 })),

  setSearchQuery: (q) => set({ searchQuery: q }),

  fetchData: async () => {
    const generation = get().generation
    set({ isLoading: true, error: null })
    try {
      const [p, v] = await Promise.all([
        supabase.from('patients').select('*'),
        supabase.from('visits').select('*').order('date', { ascending: false }),
      ])
      if (generation !== get().generation) return
      set({ patients: p.data || [], visits: v.data || [], isLoading: false, error: p.error?.message || v.error?.message || null })
    } catch (error) {
      if (generation === get().generation) set({ isLoading: false, error: error.message })
    }
  },

  getFilteredPatients: () => {
    const { patients, searchQuery } = get()
    if (!patients || !searchQuery.trim()) return patients || []
    const q = searchQuery.trim().toLowerCase()
    return patients.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q) ||
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      (p.phone && p.phone.includes(q))
    )
  },

  getPatientById: (id) => {
    return get().patients.find(p => p.id === id)
  },

  getVisitsForPatient: (patientId) => {
    return get().visits.filter(v => v.patient_id === patientId)
  },

  addPatient: async (patientData) => {
    if (patientData.password) {
      // 1. Create a non-persistent auth client...
      // ... (rest of logic stays same, database trigger handles the patient row)
      const adminAuthClient = (await import('@supabase/supabase-js')).createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )
      
      const cleanedPhone = patientData.phone.replace(/\+/g, '').replace(/\s/g, '');
      const syntheticEmail = `${cleanedPhone}@patient.eco-medic.local`;
      
      const { data: authData, error: authError } = await adminAuthClient.auth.signUp({
        email: patientData.email?.trim() || syntheticEmail,
        password: patientData.password,
        options: {
          data: {
            role: 'patient',
            first_name: patientData.first_name,
            last_name: patientData.last_name,
            date_of_birth: patientData.date_of_birth,
            gender: patientData.gender,
            phone: patientData.phone,
            email: patientData.email,
            region: patientData.region,
            village: patientData.village,
            blood_group: patientData.blood_group || null,
            allergies: patientData.allergies,
            next_of_kin: patientData.next_of_kin,
            facility_id: patientData.facility_id
          }
        }
      })
      
      if (authError) {
        console.error("Auth signUp error:", authError)
        return { error: authError.message }
      }
      
      await new Promise(r => setTimeout(r, 600));
      const { data: newPatient } = await supabase.from('patients').select('*').eq('auth_user_id', authData.user.id).single()
      
      if (newPatient) {
        set({ patients: [...get().patients, newPatient] })
        return newPatient
      }
      return { error: 'Patient created in Auth but profile propagation failed.' }

    } else {
      // Direct insert (e.g. receptionist without password)
      const { data, error } = await supabase.from('patients').insert([{
        ...Object.fromEntries(Object.entries(patientData).filter(([key]) => key !== 'password')),
        id: patientData.id || `MT-${crypto.randomUUID()}`,
        blood_group: patientData.blood_group || null,
        phone: patientData.phone || null,
        email: patientData.email || null,
        facility_id: patientData.facility_id || null
      }]).select().single()

      if (data && !error) {
         set({ patients: [...get().patients, data] })
         return data
      }
      return { error: error?.message || 'DB Insert failed' }
    }
  },

  deletePatient: async (id) => {
    const { patients } = get()
    
    // Call our new RPC function for a clean full wipe (Auth + Profile + Patient table + cascades)
    const { error } = await supabase.rpc('staff_delete_patient', { target_patient_id: id })
    
    if (!error) {
      set({ patients: patients.filter(p => p.id !== id) })
      return { success: true }
    }
    return { success: false, error: error.message }
  },

  addVisit: async (visitData) => {
    const { visits } = get()
    // Ensure facility_id is passed if not already present
    const { data, error } = await supabase.from('visits').insert([visitData]).select().single()
    if (data && !error) {
       set({ visits: [data, ...visits] })
       
       // Trigger outbreak detection
       import('./outbreakStore').then(module => {
         module.default.getState().checkForOutbreaks(data.facility_id)
       })
       
       return data
    }
    return null
  },

  updateVisit: async (visitId, updateData) => {
    const { visits } = get()
    const { data, error } = await supabase
      .from('visits')
      .update(updateData)
      .eq('id', visitId)
      .select()
      .single()

    if (data && !error) {
      set({ visits: visits.map(v => v.id === visitId ? data : v) })
      return { success: true, data }
    }
    console.error('Update visit error:', error)
    return { success: false, error: error?.message || 'Failed to update visit record' }
  },

  selectPatient: (patient) => set({ selectedPatient: patient }),
}))

export default usePatientStore
