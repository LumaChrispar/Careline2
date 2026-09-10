import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserPlus, FlaskConical, Upload,
  ShieldAlert, Settings, LogOut, Activity, Menu, X, HeartPulse, UserCog, Megaphone
} from 'lucide-react'
import useAuthStore from '../../stores/authStore'
import useUiStore from '../../stores/uiStore'

const navItems = [
  { path: '/my-records', label: 'My Records', icon: HeartPulse, roles: ['patient'] },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'doctor', 'labtech', 'nurse', 'receptionist'] },
  { path: '/patients', label: 'Patients', icon: Users, roles: ['admin', 'doctor', 'nurse', 'receptionist'] },
  { path: '/patients/new', label: 'Register Patient', icon: UserPlus, roles: ['admin', 'nurse', 'receptionist', 'doctor'] },
  { path: '/lab', label: 'Lab Results', icon: FlaskConical, roles: ['admin', 'doctor', 'labtech'] },
  { path: '/lab/upload', label: 'Upload Result', icon: Upload, roles: ['admin', 'labtech'] },
  { path: '/outbreak', label: 'Outbreak Monitor', icon: ShieldAlert, roles: ['admin', 'doctor'] },
  { path: '/communication', label: 'Notice Board', icon: Megaphone, roles: ['admin', 'doctor', 'labtech', 'nurse', 'receptionist'] },
  { path: '/admin/users', label: 'Staff Management', icon: UserCog, roles: ['admin'] },
  { path: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
]

export default function Sidebar() {
  const { user, role, logout } = useAuthStore()
  const { sidebarOpen, toggleSidebar, isOnline } = useUiStore()
  const location = useLocation()

  const visibleItems = navItems.filter(item => item.roles.includes(role))

  return (
    <div className="flex h-full">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
      {/* Main Sidebar */}
      <aside
        className={`fixed lg:static z-50 top-0 left-0 h-full flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-[280px] lg:w-[300px]' : 'w-0 lg:w-24'
          }`}
        style={{
          background: 'var(--color-surface)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-4 px-8 py-8 border-b border-[var(--color-border)]">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              boxShadow: '0 0 20px rgba(0, 242, 254, 0.15)',
              border: '1px solid rgba(0, 242, 254, 0.2)'
            }}
          >
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
          </div>
          {sidebarOpen && (
            <div className="animate-fade-in pr-2">
              <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>
                ECO<span style={{ color: 'var(--color-primary)' }}>~</span>MEDIK
              </h1>
              <p className="text-xs uppercase tracking-widest mt-1 font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                Health Records
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-6 px-5 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={item.label}
                onClick={() => { if (window.innerWidth < 1024) useUiStore.setState({ sidebarOpen: false }) }}
                className="flex items-center gap-4 px-5 py-4 rounded-xl mb-2 transition-all duration-200 group"
                style={{
                  background: isActive ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
                {isActive && sidebarOpen && (
                  <div
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--color-primary)' }}
                  />
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Connectivity + User */}
        <div className="px-3 pb-4 space-y-3 border-t border-[var(--color-border)] pt-4">
          {/* Online badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--color-surface-light)' }}>
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: isOnline ? '#10b981' : '#ef4444',
                boxShadow: isOnline ? '0 0 6px #10b981' : '0 0 6px #ef4444',
              }}
            />
            {sidebarOpen && (
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            )}
          </div>

          {/* User info */}
          {sidebarOpen && user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'var(--color-surface-light)' }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}
              >
                {user.name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{user.name}</p>
                <p className="text-[11px] capitalize" style={{ color: 'var(--color-text-muted)' }}>{role}</p>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
              e.currentTarget.style.color = 'var(--color-danger-light)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--color-text-muted)'
            }}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>
    </div>
  )
}
