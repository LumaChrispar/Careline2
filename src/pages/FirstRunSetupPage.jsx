import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity } from 'lucide-react'
import useAuthStore from '../stores/authStore'

export default function FirstRunSetupPage() {
  const [hospitalName, setHospitalName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { completeSetup } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setIsLoading(true)
    const res = await completeSetup(hospitalName, adminName, email, password)
    setIsLoading(false)
    if (res.success) {
      navigate('/dashboard')
    } else {
      setError(res.error || 'Failed to complete setup')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <div className="glass-card max-w-xl w-full p-8 rounded-2xl relative z-10 animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden p-2"
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid rgba(0, 242, 254, 0.2)',
              boxShadow: '0 0 20px rgba(0, 242, 254, 0.1)' 
            }}
          >
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>First-Run Setup</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Initialize your hospital instance</p>
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger-light)' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Hospital Name</label>
            <input type="text" required value={hospitalName} onChange={e => setHospitalName(e.target.value)} placeholder="e.g. Buea Regional Hospital" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Admin Full Name</label>
              <input type="text" required value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="e.g. Dr. John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Admin Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@hospital.com" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Master Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Confirm Password</label>
              <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn btn-primary w-full mt-6">
            {isLoading ? 'Initializing...' : 'Complete Setup & Launch'}
          </button>
        </form>
      </div>
    </div>
  )
}
