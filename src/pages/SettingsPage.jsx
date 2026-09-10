import { useState, useEffect } from 'react'
import { Save, Shield, Activity, Users, Building } from 'lucide-react'
import useOutbreakStore from '../stores/outbreakStore'
import useAuthStore from '../stores/authStore'
import useUiStore from '../stores/uiStore'
import { supabase } from '../lib/supabase'

const HACKATHON_FACILITY = { name: 'Buea Regional Hospital', region: 'South-West', location: 'Buea Town' };

export default function SettingsPage() {
  const { user, updateProfile } = useAuthStore()
  const { config, updateConfig } = useOutbreakStore()
  const { addToast } = useUiStore()
  const [threshold, setThreshold] = useState(config.threshold)
  const [windowDays, setWindowDays] = useState(config.windowDays)
  
  const [name, setName] = useState(user?.user_metadata?.name || '')
  const [facilityId, setFacilityId] = useState(user?.user_metadata?.facility_id || '')
  const [facilities, setFacilities] = useState([])
  const [staffList, setStaffList] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchFacilities = async () => {
      const { data } = await supabase.from('facilities').select('*')
      if (data) setFacilities(data)
    }

    const fetchStaff = async () => {
      const { data } = await supabase.from('profiles').select('*').neq('role', 'patient')
      if (data) setStaffList(data)
    }

    fetchFacilities()
    fetchStaff()
  }, [])

  const handleSaveProfile = async () => {
     setSaving(true)
     const res = await updateProfile({ name, facility_id: facilityId })
     setSaving(false)
     if (res.success) {
        addToast('Admin profile updated', 'success')
     } else {
        addToast(res.error, 'danger')
     }
  }

  const handleSaveOutbreak = () => {
     updateConfig({ threshold: Number(threshold), windowDays: Number(windowDays) })
     addToast('Outbreak detection settings updated', 'success')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Facility Info */}
      <div className="glass-card p-8 md:p-10">
        <div className="flex items-center gap-4 mb-6 pb-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Building className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
          <h3 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Admin Context</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <label className="block text-sm font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>Admin Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>Active Facility (Hospital)</label>
            <select value={facilityId} onChange={e => setFacilityId(e.target.value)}>
               <option value="">Select current facility</option>
               {facilities.map(f => (
                 <option key={f.id} value={f.id}>{f.name} ({f.region})</option>
               ))}
            </select>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Note: Changing your facility will determine which medical data you see on your dashboard.
            </p>
          </div>
        </div>
        <div className="flex justify-end mt-8">
           <button onClick={handleSaveProfile} className="btn btn-primary" disabled={saving}>
             {saving ? 'Syncing...' : <><Save className="w-4 h-4" /> Save Profile</>}
           </button>
        </div>
      </div>

      {/* Outbreak Detection */}
      <div className="glass-card p-8 md:p-10">
        <div className="flex items-center gap-4 mb-6 pb-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Shield className="w-6 h-6" style={{ color: 'var(--color-danger)' }} />
          <h3 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Outbreak Detection</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>Case Threshold</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              min={1}
              placeholder="e.g. 20"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Alert fires when this many patients share a symptom
            </p>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>Detection Window (days)</label>
            <input
              type="number"
              value={windowDays}
              onChange={(e) => setWindowDays(e.target.value)}
              min={1}
              placeholder="e.g. 14"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Time window for counting symptom occurrences
            </p>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={handleSaveOutbreak} className="btn btn-primary">
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </div>

      {/* Staff Directory */}
      <div className="glass-card p-8 md:p-10">
        <div className="flex items-center gap-4 mb-6 pb-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Users className="w-6 h-6" style={{ color: 'var(--color-accent)' }} />
          <h3 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Staff Directory</h3>
        </div>
        <div className="space-y-4">
          {staffList.length === 0 ? (
            <div className="text-center p-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              No staff found. Make sure to establish users via Supabase auth.
            </div>
          ) : (
            staffList.map(u => (
              <div key={u.id} className="flex items-center gap-5 p-4 rounded-xl" style={{ background: 'var(--color-surface-light)' }}>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white uppercase"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}
                >
                  {u.name ? u.name.charAt(0) : u.email.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium" style={{ color: 'var(--color-text)' }}>{u.name || 'Unnamed User'}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{u.email}</p>
                </div>
                <span className="badge badge-primary capitalize">{u.role}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* System Info */}
      <div className="glass-card p-8 md:p-10">
        <div className="flex items-center gap-4 mb-6 pb-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Activity className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
          <h3 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>System</h3>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p style={{ color: 'var(--color-text-muted)' }}>Version</p>
            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>v1.0.0</p>
          </div>
          <div>
            <p style={{ color: 'var(--color-text-muted)' }}>Backend</p>
            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Supabase Database</p>
          </div>
          <div>
            <p style={{ color: 'var(--color-text-muted)' }}>Storage</p>
            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Supabase Postgres</p>
          </div>
          <div>
            <p style={{ color: 'var(--color-text-muted)' }}>Sync</p>
            <p className="font-semibold" style={{ color: 'var(--color-primary)' }}>Live Connected</p>
          </div>
        </div>
      </div>
    </div>
  )
}
