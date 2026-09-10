import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useLabStore = create((set, get) => ({
  labResults: [],
  notifications: [],
  isUploading: false,
  isLoading: false,
  error: null,
  generation: 0,
  reset: () => set(s => ({ labResults: [], notifications: [], error: null, isLoading: false, generation: s.generation + 1 })),

  fetchData: async () => {
    const generation = get().generation
    set({ isLoading: true, error: null })
    try {
    const { data: results, error } = await supabase.from('lab_results').select('*').order('uploaded_at', { ascending: false })
    if (generation !== get().generation) return
    if (!error && results) {
       set({ labResults: results })
    }
    set({ isLoading: false, error: error?.message || null })
    } catch (error) {
      if (generation === get().generation) set({ isLoading: false, error: error.message })
    }
  },

  getResultsForPatient: (patientId) => {
    return get().labResults.filter(r => r.patient_id === patientId)
  },

  getResultsForVisit: (visitId) => {
    return get().labResults.filter(r => r.visit_id === visitId)
  },

  getPendingResults: () => {
    return get().labResults.filter(r => !r.notified_at)
  },

  uploadResult: async (resultData, file, authUserId) => {
    set({ isUploading: true })
    
    let facilityId = resultData.facility_id

    // Fallback: If facility_id is missing, query profile or facilities table
    if (!facilityId && authUserId) {
      const { data: profile } = await supabase.from('profiles').select('facility_id').eq('id', authUserId).single()
      if (profile?.facility_id) facilityId = profile.facility_id
    }
    if (!facilityId) {
      const { data: facilities } = await supabase.from('facilities').select('id').limit(1)
      if (facilities && facilities.length > 0) facilityId = facilities[0].id
    }

    let publicUrl = null

    // 1. Upload to Supabase Storage if file exists with fallback to dataURL
    if (file) {
      const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('LAB_result')
          .upload(fileName, file)

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('LAB_result')
            .getPublicUrl(fileName)
          publicUrl = urlData.publicUrl
        } else {
          console.warn('Supabase storage upload error, generating dataURL fallback:', uploadError.message)
          publicUrl = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(file)
          })
        }
      } catch (err) {
        console.warn('Storage exception, fallback to dataURL:', err)
        publicUrl = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = () => resolve(null)
          reader.readAsDataURL(file)
        })
      }
    }

    // 2. Prepare the database record
    const { file_url, ...dataWithoutTempUrl } = resultData
    const newResult = {
      ...dataWithoutTempUrl,
      facility_id: facilityId || dataWithoutTempUrl.facility_id || null,
      visit_id: dataWithoutTempUrl.visit_id || null, // Convert empty string to null to prevent invalid UUID error
      file_url: publicUrl,
      uploaded_by: authUserId || null,
      uploaded_at: new Date().toISOString()
    }

    // 3. Insert into lab_results table
    const { data, error } = await supabase.from('lab_results').insert([newResult]).select().single()
    
    if (data && !error) {
      // 4. Notify Staff via Notice Board (Optional but helpful for visibility)
      try {
        const { data: pData } = await supabase.from('patients').select('first_name, last_name').eq('id', newResult.patient_id).single()
        const patientName = pData ? `${pData.first_name} ${pData.last_name}` : 'A Patient'
        
        await supabase.from('staff_broadcasts').insert([{
          author_id: authUserId,
          author_name: 'LABORATORY SYSTEM',
          content: `🔬 NEW LAB RESULT AVAILABLE: ${newResult.test_type} for ${patientName} is ready for review.`,
          priority: 'normal',
          facility_id: newResult.facility_id
        }])
      } catch (e) {
        console.warn('Silent failure on staff broadcast notification:', e)
      }

      const { fetchData } = get()
      // Refresh local data
      await fetchData()
      set({ isUploading: false })
      return { success: true, data }
    }
    
    console.error('Database insert error:', error)
    set({ isUploading: false })
    return { success: false, error: error?.message || 'Database error during lab result creation.' }
  },

  markNotificationRead: async (id) => {
    const { notifications } = get()
    set({
      notifications: notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ),
    })
  },

  getUnreadCount: () => {
    return get().notifications.filter(n => !n.read).length
  },
  
  addNotification: (message) => {
     set(state => ({
        notifications: [{ id: `n-${Date.now()}`, message, time: new Date().toISOString(), read: false }, ...state.notifications]
     }))
  }
}))

export default useLabStore
