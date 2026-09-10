import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react'
import usePatientStore from '../stores/patientStore'
import useAuthStore from '../stores/authStore'
import useUiStore from '../stores/uiStore'

const regions = ['South-West', 'North-West', 'Littoral', 'Centre', 'West', 'East', 'Far-North', 'North', 'Adamawa', 'South']
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const genders = ['Male', 'Female', 'Other']

const initialForm = {
  first_name: '', last_name: '', date_of_birth: '', gender: '',
  phone: '', email: '', region: '', village: '', blood_group: '',
  allergies: '', next_of_kin: '', password: '',
}

export default function PatientRegistrationPage() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const { addPatient, patients } = usePatientStore()
  const { user } = useAuthStore()
  const { addToast } = useUiStore()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    if (errors[name]) setErrors({ ...errors, [name]: '' })
  }

  const validate = () => {
    const errs = {}
    if (!form.first_name.trim()) errs.first_name = 'First name is required'
    if (!form.last_name.trim()) errs.last_name = 'Last name is required'
    if (!form.date_of_birth) errs.date_of_birth = 'Date of birth is required'
    if (!form.gender) errs.gender = 'Gender is required'

    // Duplicate phone check
    if (form.phone && patients.some(p => p.phone === form.phone)) {
      errs.phone = 'A patient with this phone number already exists'
    }

    if (form.date_of_birth > new Date().toISOString().slice(0, 10)) errs.date_of_birth = 'Date of birth cannot be in the future'
    if (form.password && form.password.length < 6) errs.password = 'Use at least 6 characters'
    if (form.password && !form.phone.trim() && !form.email.trim()) errs.phone = 'Phone or email is required for portal access'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting || !validate()) return
    setIsSubmitting(true)
    try {

    const newPatient = await addPatient({
      ...form,
      facility_id: user?.user_metadata?.facility_id || null,
    })

    if (newPatient?.error) {
      addToast(`Error: ${newPatient.error}`, 'danger')
      setSuccess(false)
      return
    }

    setSuccess(true)
    addToast(`Patient ${newPatient.id} registered successfully`, 'success')
    navigate(`/patients/${newPatient.id}`)
    } catch (error) { addToast(error.message || 'Registration failed. Please retry.', 'danger') }
    finally { setIsSubmitting(false) }
  }

  const handleReset = () => {
    setForm(initialForm)
    setErrors({})
    setSuccess(false)
  }

  if (success) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
            <CheckCircle className="w-8 h-8" style={{ color: 'var(--color-accent)' }} />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Patient Registered!</h2>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>Redirecting to patient profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 md:p-10 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>New Patient Intake</h3>
          <button type="button" onClick={handleReset} className="btn btn-ghost btn-sm">
            <RotateCcw className="w-4 h-4" /> Clear
          </button>
        </div>

        {/* Personal Info */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: 'var(--color-text-muted)' }}>
            Personal Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>First Name *</label>
              <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="e.g. Amina" />
              {errors.first_name && <p className="text-xs mt-1" style={{ color: 'var(--color-danger-light)' }}><AlertCircle className="w-3 h-3 inline mr-1" />{errors.first_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Last Name *</label>
              <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="e.g. Ngwa" />
              {errors.last_name && <p className="text-xs mt-1" style={{ color: 'var(--color-danger-light)' }}><AlertCircle className="w-3 h-3 inline mr-1" />{errors.last_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Date of Birth *</label>
              <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} />
              {errors.date_of_birth && <p className="text-xs mt-1" style={{ color: 'var(--color-danger-light)' }}><AlertCircle className="w-3 h-3 inline mr-1" />{errors.date_of_birth}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Gender *</label>
              <select name="gender" value={form.gender} onChange={handleChange}>
                <option value="">Select gender</option>
                {genders.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              {errors.gender && <p className="text-xs mt-1" style={{ color: 'var(--color-danger-light)' }}><AlertCircle className="w-3 h-3 inline mr-1" />{errors.gender}</p>}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: 'var(--color-text-muted)' }}>
            Contact & Location
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Phone Number</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="+237..." />
              {errors.phone && <p className="text-xs mt-1" style={{ color: 'var(--color-danger-light)' }}><AlertCircle className="w-3 h-3 inline mr-1" />{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Region</label>
              <select name="region" value={form.region} onChange={handleChange}>
                <option value="">Select region</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="e.g. name@example.com" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Village / Town</label>
              <input name="village" value={form.village} onChange={handleChange} placeholder="e.g. Buea Town" />
            </div>
          </div>
        </div>

        {/* Medical */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: 'var(--color-text-muted)' }}>
            Medical Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Blood Group</label>
              <select name="blood_group" value={form.blood_group} onChange={handleChange}>
                <option value="">Select blood group</option>
                {bloodGroups.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Known Allergies</label>
              <input name="allergies" value={form.allergies} onChange={handleChange} placeholder="e.g. Penicillin, None" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Next of Kin</label>
              <input name="next_of_kin" value={form.next_of_kin} onChange={handleChange} placeholder="e.g. Emmanuel Ngwa" />
            </div>
          </div>
        </div>

        {/* Security */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: 'var(--color-text-muted)' }}>
            Portal Access
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Account password (optional)</label>
              <input type="password" autoComplete="new-password" name="password" value={form.password} onChange={handleChange} placeholder="Leave blank to register without portal access" />
              {errors.password && <p className="text-xs mt-1" style={{ color: 'var(--color-danger-light)' }}><AlertCircle className="w-3 h-3 inline mr-1" />{errors.password}</p>}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 pt-8 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button type="button" onClick={() => navigate('/patients')} className="btn btn-ghost">Cancel</button>
          <button disabled={isSubmitting} type="submit" className="btn btn-primary">
            <Save className="w-4 h-4" /> Register Patient
          </button>
        </div>
      </form>
    </div>
  )
}
