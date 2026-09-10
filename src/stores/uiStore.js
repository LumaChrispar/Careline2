import { create } from 'zustand'

const useUiStore = create((set, get) => ({
  sidebarOpen: window.innerWidth >= 1024,
  toasts: [],
  isOnline: navigator.onLine,
  lastSyncTime: null,

  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),

  addToast: (message, type = 'info', duration = 4000) => {
    const id = `toast-${Date.now()}`
    set({ toasts: [...get().toasts, { id, message, type }] })
    setTimeout(() => {
      set({ toasts: get().toasts.filter(t => t.id !== id) })
    }, duration)
  },

  setOnline: (status) => set({ isOnline: status }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),

  initConnectivityListeners: () => {
    const online = () => {
      set({ isOnline: true })
      get().addToast('Connection restored — refreshing records', 'success')
    }
    const offline = () => {
      set({ isOnline: false })
      get().addToast('You are offline. Reconnect before saving changes.', 'warning')
    }
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  },
}))

export default useUiStore
