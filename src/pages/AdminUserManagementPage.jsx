import { useState, useEffect, useCallback } from 'react'
import useAuthStore from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { Activity, ShieldCheck, Mail, Lock, UserPlus, Trash2, Loader2, Edit2, Save } from 'lucide-react'

export default function AdminUserManagementPage() {
  const { createStaffAccount, deleteStaffAccount, user } = useAuthStore()
  const [usersList, setUsersList] = useState([])
  const [facilities, setFacilities] = useState([])
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Form State
  const [editingId, setEditingId] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('doctor')
  const [facilityId, setFacilityId] = useState(user?.user_metadata?.facility_id || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const clearForm = () => {
    setEditingId(null)
    setName('')
    setEmail('')
    setRole('doctor')
    setFacilityId(user?.user_metadata?.facility_id || '')
    setPassword('')
  }

  const fetchUsers = useCallback(async () => {
    setIsSyncing(true)
    const { data: profiles } = await supabase.from('profiles').select('*').neq('role', 'patient')
    const { data: facs } = await supabase.from('facilities').select('*')
    if (profiles) setUsersList(profiles)
    if (facs) setFacilities(facs)
    setIsSyncing(false)
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (editingId) {
      // UPDATE Profile
      const { error: err } = await supabase.from('profiles').update({
        name, role, facility_id: facilityId
      }).eq('id', editingId)
      
      if (err) {
        setError(err.message)
      } else {
        setSuccess('Profile updated successfully.')
        clearForm()
        fetchUsers()
      }
      return
    }

    // CREATE Account
    if (!name || !email || !password) {
      setError('Please fill all fields')
      return
    }

    const res = await createStaffAccount(name, email, role, password, facilityId)
    if (res.success) {
      setSuccess(`Account for ${name} created successfully.`)
      clearForm()
      fetchUsers()
    } else {
      setError(res.error || 'Failed to create account')
    }
  }

  const handleEditClick = (u) => {
     setEditingId(u.id)
     setName(u.name)
     setEmail(u.email)
     setRole(u.role)
     setFacilityId(u.facility_id || '')
  }

  const handleDeleteStaff = async (id) => {
    if (!confirm('Are you sure you want to deactivate this personnel?')) return
    const res = await deleteStaffAccount(id)
    if (res.success) fetchUsers()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 glass-card rounded-xl">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="text-sm text-text-muted">Create and manage hospital personnel accounts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Staff Form */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4">{editingId ? 'Edit Personnel' : 'Add New Staff'}</h2>
            
            {error && <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-500/20 text-accent rounded-lg text-sm">{success}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-text-muted">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dr. Sarah Smith" />
              </div>
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-text-muted">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@hospital.com" />
                </div>
              )}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-text-muted">Role</label>
                  <select value={role} onChange={e => setRole(e.target.value)}>
                    <option value="doctor">Doctor</option>
                    <option value="nurse">Nurse</option>
                    <option value="labtech">Lab Technician</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-text-muted">Facility / Hospital</label>
                  <select value={facilityId} onChange={e => setFacilityId(e.target.value)}>
                    <option value="">Select hospital</option>
                    {facilities.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-text-muted">Initial Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
              )}
              
              <div className="pt-2">
                <button type="submit" className="btn btn-primary w-full flex justify-center">
                  {editingId ? 'Save Changes' : <><UserPlus className="w-4 h-4 mr-2" /> Add Staff Member</>}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Existing Staff List */}
        <div className="lg:col-span-2">
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-lg font-semibold">Active Personnel</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u.id}>
                      <td className="font-medium">{u.name}</td>
                      <td className="text-text-muted"><div className="flex items-center gap-2"><Mail className="w-3 h-3" />{u.email}</div></td>
                      <td>
                        <span className="badge badge-primary uppercase text-[10px] tracking-wider font-bold">
                          {u.role === 'receptionist' ? 'nurse' : u.role}
                        </span>
                      </td>
                      <td>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleEditClick(u)}
                          className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Edit Personal Information"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteStaff(u.id)}
                          className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          title="Deactivate Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {usersList.length === 0 && (
              <div className="p-10 text-center text-text-muted">No staff found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
