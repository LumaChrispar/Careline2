import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { rpc, signIn, normalizePhone } from '../lib/careline'
let epoch = 0
const useAuthStore = create((set, get) => ({
  user: null, session: null, role: null, memberships: [], isOperator: false,
  isLoading: false, isInitialized: false, isSetupComplete: true, error: null,
  refreshContext: async (session = get().session) => {
    const generation = ++epoch
    if (!session) { set({ user: null, role: null, memberships: [], isOperator: false, session: null, isInitialized: true, isLoading: false, error: null }); return }
    try {
      const context = await rpc('careline_context')
      if (generation !== epoch) return
      const user = { ...session.user, name: context.name, role: context.role, user_metadata: { ...session.user.user_metadata, name: context.name, role: context.role, facility_id: context.facility_id } }
      set({ session, user, role: context.role, memberships: context.memberships, isOperator: context.is_operator, error: null, isInitialized: true, isLoading: false })
    } catch (error) {
      if (generation === epoch) set({ session, user: null, role: null, memberships: [], isOperator: false, error: error.message, isInitialized: true, isLoading: false })
    }
  },
  switchFacility: async f => { await rpc('careline_switch_facility', { f }); await get().refreshContext() },
  login: async (identifier, password) => {
    set({ isLoading: true, error: null })
    try { const { error } = await signIn(identifier, password); if (error) throw error; return { success: true } }
    catch (error) { return { success: false, error: error.message } }
    finally { set({ isLoading: false }) }
  },
  registerPatient: async (patient, password) => {
    try {
      const identity = patient.email ? { email: patient.email.trim() } : { phone: normalizePhone(patient.phone) }
      const { data, error } = await supabase.auth.signUp({ ...identity, password, options: { data: { first_name: patient.first_name.trim(), last_name: patient.last_name.trim(), name: [patient.first_name, patient.last_name].join(' ').trim(), phone: patient.phone ? normalizePhone(patient.phone) : null } } })
      if (error) throw error
      return { success: true, session: data.session, phone: identity.phone }
    } catch (error) { return { success: false, error: error.message } }
  },
  updateProfile: async updates => {
    const { error } = await supabase.from('profiles').update({ name: updates.name }).eq('id', get().user.id)
    if (error) return { success: false, error: error.message }
    await get().refreshContext(); return { success: true }
  },
  logout: async () => {
    const { pendingCount } = await import('../lib/offline')
    if (get().user && await pendingCount(get().user.id)) throw new Error('Sync or discard your pending intake before signing out.')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    await get().refreshContext(null)
  },
  initSession: () => {
    let live = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!live) return
      if (error) { set({ error: error.message, isInitialized: true }); return }
      get().refreshContext(data.session)
    }).catch(error => { if (live) set({ error: error.message, isInitialized: true }) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => { if (live) get().refreshContext(session) }, 0)
    })
    return () => { live = false; epoch++; subscription.unsubscribe() }
  },
}))
export default useAuthStore
