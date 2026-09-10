import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Menu, Search, X } from 'lucide-react'
import useAuthStore from '../../stores/authStore'
import useLabStore from '../../stores/labStore'
import useUiStore from '../../stores/uiStore'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/patients': 'Patient Records',
  '/patients/new': 'Register Patient',
  '/lab': 'Lab Results',
  '/lab/upload': 'Upload Lab Result',
  '/outbreak': 'Outbreak Monitor',
  '/settings': 'Settings',
  '/my-records': 'My health records',
  '/admin/users': 'Staff management',
  '/communication': 'Notice board',
}

export default function Topbar() {
  const location = useLocation()
  const { user } = useAuthStore()
  const { toggleSidebar } = useUiStore()
  const { notifications, getUnreadCount, markNotificationRead } = useLabStore()
  const [showNotifs, setShowNotifs] = useState(false)
  const notifRef = useRef(null)
  const unread = getUnreadCount()

  const title = pageTitles[location.pathname] || 'ECO~MEDIK'

  // Handle patient profile titles
  const isPatientProfile = location.pathname !== '/patients/new' && location.pathname.startsWith('/patients/')
  const displayTitle = isPatientProfile ? 'Patient Profile' : title

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header
      className="flex items-center justify-between px-8 py-6 border-b relative z-30"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-surface)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      <div className="flex items-center gap-4">
        <button
          aria-label="Toggle navigation" onClick={toggleSidebar}
          className="p-2 rounded-lg transition-colors duration-200 lg:hidden"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            {displayTitle}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            aria-label="Notifications" aria-expanded={showNotifs} onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2.5 rounded-xl transition-all duration-200"
            style={{
              background: 'var(--color-surface-light)',
              color: 'var(--color-text-muted)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-lighter)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-surface-light)'}
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                style={{ background: 'var(--color-danger)', boxShadow: '0 0 8px var(--color-danger)' }}
              >
                {unread}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showNotifs && (
            <div
              className="absolute right-0 top-full mt-2 w-80 rounded-xl animate-fade-in overflow-hidden z-50"
              style={{ maxHeight: '400px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)' }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  Notifications
                </h3>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No notifications
                  </p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className="px-4 py-3 border-b cursor-pointer transition-colors duration-200"
                      style={{
                        borderColor: 'rgba(51, 65, 85, 0.5)',
                        background: n.read ? 'transparent' : 'rgba(14, 165, 233, 0.1)',
                      }}
                      onClick={() => markNotificationRead(n.id)}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(14, 165, 233, 0.1)'}
                    >
                      <p className="text-sm" style={{ color: 'var(--color-text)' }}>{n.message}</p>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(n.time).toLocaleString()}
                      </p>
                      {!n.read && (
                        <span className="badge badge-primary mt-1">New</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
