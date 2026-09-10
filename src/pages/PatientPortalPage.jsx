import { useState, useEffect } from 'react'
import useAuthStore from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { Activity, Clock, FileText, Calendar, ShieldAlert, Pill, Download, QrCode, MapPin, FlaskConical, User, Eye, ChevronRight, Pencil, Save, X, CheckCircle } from 'lucide-react'
import LabResultModal from '../components/LabResultModal'

const regions = ['South-West', 'North-West', 'Littoral', 'Centre', 'West', 'East', 'Far-North', 'North', 'Adamawa', 'South']
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const genders = ['Male', 'Female', 'Other']

export default function PatientPortalPage() {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [myVisits, setMyVisits] = useState([])
  const [myLabs, setMyLabs] = useState([])
  const [facilities, setFacilities] = useState({})
  const [selectedResult, setSelectedResult] = useState(null)

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    const loadData = async () => {
      setLoadError('')
      const { data: p, error } = await supabase.from('patients').select('*').eq('auth_user_id', user.id).single()
      if (error || !p) throw new Error('Your patient record could not be loaded. Retry, or contact your facility to link your account.')
      if (p) {
        setProfile(p)
        setEditForm({
          first_name: p.first_name || '',
          last_name: p.last_name || '',
          date_of_birth: p.date_of_birth || '',
          gender: p.gender || '',
          phone: p.phone || '',
          email: p.email || user.email || '',
          region: p.region || '',
          village: p.village || '',
          blood_group: p.blood_group || '',
          allergies: p.allergies || '',
          next_of_kin: p.next_of_kin || '',
        })

        const { data: f } = await supabase.from('facilities').select('id, name')
        if (f) {
          const fMap = {}
          f.forEach(item => fMap[item.id] = item.name)
          setFacilities(fMap)
        }
        const { data: v } = await supabase.from('visits').select('*').eq('patient_id', p.id).order('date', { ascending: false })
        if (v) setMyVisits(v)
        const { data: l } = await supabase.from('lab_results').select('*').eq('patient_id', p.id).order('uploaded_at', { ascending: false })
        if (l) setMyLabs(l)
      }
    }
    loadData().catch(error => setLoadError(error.message))
  }, [user, retry])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      // Update email in auth if changed
      if (editForm.email && editForm.email !== user.email) {
        await supabase.rpc('update_my_email', { new_email: editForm.email })
      }

      const { error } = await supabase
        .from('patients')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          date_of_birth: editForm.date_of_birth || null,
          gender: editForm.gender || null,
          phone: editForm.phone || null,
          email: editForm.email || null,
          region: editForm.region || null,
          village: editForm.village || null,
          blood_group: editForm.blood_group || null,
          allergies: editForm.allergies || null,
          next_of_kin: editForm.next_of_kin || null,
        })
        .eq('auth_user_id', user.id)

      if (error) throw error

      // Refetch profile
      const { data: p } = await supabase.from('patients').select('*').eq('auth_user_id', user.id).single()
      if (p) {
        setProfile(p)
        setEditForm({
          first_name: p.first_name || '', last_name: p.last_name || '',
          date_of_birth: p.date_of_birth || '', gender: p.gender || '',
          phone: p.phone || '', email: p.email || user.email || '',
          region: p.region || '', village: p.village || '',
          blood_group: p.blood_group || '', allergies: p.allergies || '',
          next_of_kin: p.next_of_kin || '',
        })
      }
      setIsEditing(false)
    } catch (err) {
      alert('Update failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Detect incomplete profile
  const isProfileIncomplete = profile && (!profile.date_of_birth || !profile.gender || !profile.region || !profile.blood_group)

  if (!profile) {
    if (loadError) return <div className="glass-card p-8" role="alert"><p>{loadError}</p><button className="btn btn-primary mt-4" onClick={() => setRetry(n => n + 1)}>Try again</button></div>
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-pulse">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Activity className="w-8 h-8 text-primary opacity-50" />
        </div>
        <p className="text-text-muted font-medium">Loading your medical portal...</p>
      </div>
    )
  }

  const age = profile?.date_of_birth 
    ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
    : 'N/A'
  const latestVisit = myVisits[0]
  const pendingResults = myLabs.filter(l => !l.notified_at)
  const activeMedications = [...new Set(
    myVisits.filter(v => v.prescription).map(v => v.prescription).filter((v, i) => i < 5)
  )]

  const handlePrint = () => { window.print() }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in print:p-0">

      {/* ⚠️ Profile Incomplete Banner */}
      {isProfileIncomplete && !isEditing && (
        <div 
          className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6 rounded-2xl border"
          style={{ background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.08), rgba(6, 182, 212, 0.04))', borderColor: 'rgba(0, 242, 254, 0.2)' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0, 242, 254, 0.15)' }}>
            <User className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold" style={{ color: 'var(--color-primary)' }}>Complete Your Medical Profile</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Add your date of birth, gender, blood group, and region for better medical care.
            </p>
          </div>
          <button onClick={() => setIsEditing(true)} className="btn btn-primary btn-sm">
            <Pencil className="w-4 h-4" /> Complete Profile
          </button>
        </div>
      )}

      {/* ⚠️ Lab Results Alert Banner */}
      {pendingResults.length > 0 && (
        <div 
          className="flex items-center gap-4 p-5 rounded-2xl border border-warning/30 bg-warning/10 animate-pulse"
          style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))' }}
        >
          <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center flex-shrink-0">
            <FlaskConical className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-warning-light">New Lab Results Ready</h3>
            <p className="text-sm text-text-muted">Your results for {pendingResults[0].test_type} are now available in your portal.</p>
          </div>
          <button 
            onClick={() => {
              document.getElementById('labs-section')?.scrollIntoView({ behavior: 'smooth' })
              setTimeout(() => setSelectedResult(pendingResults[0]), 500)
            }} 
            className="btn btn-sm btn-ghost text-warning"
          >
            View Results
          </button>
        </div>
      )}

      {/* ✏️ Edit Profile Modal */}
      {isEditing && (
        <div className="glass-card p-8 md:p-10 border-2" style={{ borderColor: 'rgba(0, 242, 254, 0.3)' }}>
          <div className="flex items-center justify-between mb-8 pb-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-xl font-bold flex items-center gap-3" style={{ color: 'var(--color-text)' }}>
              <Pencil className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              Edit Your Profile
            </h3>
            <button onClick={() => setIsEditing(false)} className="btn btn-ghost btn-sm">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>

          <div className="space-y-6">
            {/* Personal */}
            <h4 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Personal Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>First Name</label>
                <input value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Last Name</label>
                <input value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Date of Birth</label>
                <input type="date" value={editForm.date_of_birth} onChange={e => setEditForm({...editForm, date_of_birth: e.target.value})} style={{ colorScheme: 'dark' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Gender</label>
                <select value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})}>
                  <option value="">Select gender</option>
                  {genders.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {/* Contact */}
            <h4 className="text-xs font-black uppercase tracking-widest pt-4" style={{ color: 'var(--color-text-muted)' }}>Contact & Location</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Phone Number</label>
                <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Region</label>
                <select value={editForm.region} onChange={e => setEditForm({...editForm, region: e.target.value})}>
                  <option value="">Select region</option>
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Village / Town</label>
                <input value={editForm.village} onChange={e => setEditForm({...editForm, village: e.target.value})} placeholder="e.g. Buea Town" />
              </div>
            </div>

            {/* Medical */}
            <h4 className="text-xs font-black uppercase tracking-widest pt-4" style={{ color: 'var(--color-text-muted)' }}>Medical Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Blood Group</label>
                <select value={editForm.blood_group} onChange={e => setEditForm({...editForm, blood_group: e.target.value})}>
                  <option value="">Select blood group</option>
                  {bloodGroups.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Known Allergies</label>
                <input value={editForm.allergies} onChange={e => setEditForm({...editForm, allergies: e.target.value})} placeholder="e.g. Penicillin, None" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Next of Kin</label>
                <input value={editForm.next_of_kin} onChange={e => setEditForm({...editForm, next_of_kin: e.target.value})} placeholder="e.g. Emmanuel Ngwa — Father" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button onClick={() => setIsEditing(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleSaveProfile} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Profile</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🏥 Health Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-10 relative overflow-hidden group">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl point-events-none group-hover:bg-primary/20 transition-all duration-500"></div>
          
          <div className="flex flex-col sm:flex-row items-start gap-8 relative z-10">
            <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl font-extrabold text-white shadow-2xl shadow-primary/30">
              {(profile.first_name?.[0] || '')}{(profile.last_name?.[0] || '')}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-4xl font-black tracking-tight" style={{ color: 'var(--color-text)' }}>{profile.first_name} {profile.last_name}</h1>
                <span className="badge badge-primary px-3 py-1 font-mono">{profile.id}</span>
              </div>
              <p className="text-lg text-text-muted flex items-center gap-2 flex-wrap">
                <User className="w-5 h-5" /> {profile.gender || 'Not set'}, {age} Years • <MapPin className="w-5 h-5" /> {profile.village || 'N/A'}, {profile.region || 'N/A'}
              </p>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="btn btn-ghost btn-sm mt-2" style={{ color: 'var(--color-primary)' }}>
                  <Pencil className="w-4 h-4" /> Edit Profile
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-10 border-t border-white/10">
            <div className="space-y-1">
              <p className="text-xs uppercase font-black tracking-widest text-text-muted">Blood Group</p>
              <p className="text-2xl font-bold text-accent">{profile.blood_group || 'Unknown'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase font-black tracking-widest text-text-muted">Allergies</p>
              <p className="text-lg font-bold text-danger-light">{profile.allergies || 'NONE KNOWN'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase font-black tracking-widest text-text-muted">Last Visit</p>
              <p className="text-sm font-bold text-text">
                {latestVisit ? new Date(latestVisit.date).toLocaleDateString() : 'Never'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase font-black tracking-widest text-text-muted">Facility</p>
              <p className="text-sm font-bold text-text truncate">
                {latestVisit ? facilities[latestVisit.facility_id] || 'Hospital' : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Emergency QR Code */}
        <div className="glass-card p-10 flex flex-col items-center justify-between text-center relative overflow-hidden group">
           <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
           <h3 className="text-sm font-black uppercase tracking-widest text-text-muted">Emergency QR Access</h3>
           <div className="w-40 h-40 bg-white p-3 rounded-3xl my-6 flex items-center justify-center relative z-10 shadow-xl shadow-black/50">
             <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ECON-${profile.id}`} alt="Emergency QR" className="w-full h-full" />
           </div>
           <div className="relative z-10">
             <p className="text-xs text-text-muted px-4 leading-relaxed">
               Allow first responders and doctors to scan this to pull up your life-saving medical data instantly.
             </p>
             <button className="flex items-center gap-2 text-primary font-bold text-sm mt-4 mx-auto hover:gap-3 transition-all duration-200">
               <Download className="w-4 h-4" /> Save to Photos
             </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* 🕰️ My Medical History Timeline */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Clock className="w-6 h-6 text-primary" /> My Visit History
            </h2>
            <button onClick={handlePrint} className="btn btn-sm btn-ghost">
              <Download className="w-4 h-4" /> Export Report
            </button>
          </div>

          <div className="space-y-8 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
            {myVisits.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <Activity className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
                <p className="text-text-muted">Your clinical history will appear here once you visit a facility.</p>
              </div>
            ) : myVisits.map((v, i) => (
              <div key={v.id} className="relative pl-12 group">
                <div className="absolute left-0 top-1 w-9 h-9 rounded-full bg-surface border-4 border-[#0b0f19] flex items-center justify-center z-10 transition-transform group-hover:scale-110">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: i === 0 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}></div>
                </div>
                
                <div className="glass-card p-6 border-transparent hover:border-white/10 transition-all duration-300">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                      <span className="text-xs font-black uppercase tracking-widest text-primary-light block mb-1">
                        {facilities[v.facility_id] || 'Regional Hospital'}
                      </span>
                      <h3 className="text-xl font-bold">{v.diagnosis || 'Health Examination'}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{new Date(v.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <p className="text-xs text-text-muted">Recorded at {new Date(v.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {(v.symptoms || []).map(s => (
                      <span key={s} className="px-3 py-1 bg-white/5 rounded-full text-xs font-semibold text-text-muted border border-white/10">
                        {s}
                      </span>
                    ))}
                  </div>

                  {v.prescription && (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                      <Pill className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-primary-light mb-1">Prescribed Treatment</p>
                        <p className="text-sm font-medium text-text">{v.prescription}</p>
                      </div>
                    </div>
                  )}

                  {v.notes && (
                    <p className="text-sm italic text-text-muted mt-4 pl-4 border-l-2 border-white/10">
                      &ldquo; {v.notes} &rdquo;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 💊 Active Prescriptions & Lab Status */}
        <div className="lg:col-span-2 space-y-8">
          {/* Medications Hub */}
          <div className="glass-card p-8">
            <h2 className="text-lg font-bold flex items-center gap-3 mb-6">
              <Pill className="w-5 h-5 text-accent" /> Active Prescriptions
            </h2>
            <div className="space-y-4">
              {activeMedications.length === 0 ? (
                <p className="text-sm text-text-muted italic">No active medications found in your recent history.</p>
              ) : activeMedications.map((med, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-accent/5 border border-accent/10">
                   <div className="w-10 h-10 rounded-full flex items-center justify-center bg-accent/20 flex-shrink-0">
                     <span className="text-lg font-bold text-accent">{idx + 1}</span>
                   </div>
                   <div>
                     <p className="font-bold text-sm text-text">{med}</p>
                     <p className="text-[11px] text-text-muted mt-1 uppercase tracking-wider font-bold">Follow your doctor's dosage instructions</p>
                   </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] mt-6 text-text-muted leading-tight">
              ⚠️ Note: This list is based on recent visit records. Always consult with a pharmacist if you are unsure about your dosage.
            </p>
          </div>

          {/* Lab Status Hub */}
          <div id="labs-section" className="glass-card p-8 bg-white/[0.01]">
            <h2 className="text-lg font-bold flex items-center gap-3 mb-6">
              <FlaskConical className="w-5 h-5 text-warning" /> Lab Results Log
            </h2>
            <div className="space-y-4">
              {myLabs.length === 0 ? (
                <p className="text-sm text-text-muted italic">No lab results found.</p>
              ) : myLabs.map(lr => (
                <button 
                  key={lr.id} 
                  onClick={() => setSelectedResult(lr)}
                  className="w-full p-4 rounded-2xl border border-white/5 bg-white/[0.03] flex items-center justify-between group hover:bg-primary/5 hover:border-primary/20 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${lr.notified_at ? 'bg-white/10' : 'bg-warning animate-pulse shadow-[0_0_12px_var(--color-warning)]'}`}></div>
                    <div>
                      <p className="text-sm font-black text-text group-hover:text-primary transition-colors uppercase tracking-tight">{lr.test_type}</p>
                      <p className="text-[10px] text-text-muted mt-1 font-bold uppercase tracking-widest">{new Date(lr.uploaded_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">View Detail</span>
                    <ChevronRight size={16} className="text-text-muted group-hover:text-primary transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <LabResultModal 
        result={selectedResult} 
        patient={profile} 
        onClose={() => setSelectedResult(null)} 
      />

      {/* 🖨️ FULL PRINTABLE PATIENT MEDICAL REPORT */}
      <div className="print-only printable-report">
        <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0369a1', margin: 0 }}>ECO~MEDIK CLINICAL SYSTEMS</h1>
            <p style={{ fontSize: '12px', color: '#475569', margin: '4px 0 0 0' }}>Official Patient Health & Diagnostic Summary Report</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>
            <p style={{ margin: 0 }}><strong>Report Date:</strong> {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p style={{ margin: 0 }}><strong>Patient ID:</strong> {profile?.id || 'N/A'}</p>
          </div>
        </div>

        {/* Patient Demographics */}
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>1. Personal Health Profile</h2>
        <table>
          <tbody>
            <tr>
              <td><strong>Full Name:</strong> {profile?.first_name} {profile?.last_name}</td>
              <td><strong>Age / DOB:</strong> {profile?.date_of_birth ? `${profile.date_of_birth} (${age} yrs)` : 'N/A'}</td>
              <td><strong>Gender:</strong> {profile?.gender || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Phone:</strong> {profile?.phone || 'N/A'}</td>
              <td><strong>Email:</strong> {user?.email || 'N/A'}</td>
              <td><strong>Location:</strong> {profile?.village || 'N/A'}, {profile?.region || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Blood Group:</strong> {profile?.blood_group || 'Not Recorded'}</td>
              <td><strong>Known Allergies:</strong> {profile?.allergies || 'None'}</td>
              <td><strong>Emergency Contact / Kin:</strong> {profile?.next_of_kin || 'N/A'}</td>
            </tr>
          </tbody>
        </table>

        {/* Complete Visit History */}
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginTop: '24px', marginBottom: '8px' }}>2. Clinical Consultation & Visit History</h2>
        {myVisits.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>No medical visits recorded in history.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Date</th>
                <th style={{ width: '20%' }}>Symptoms</th>
                <th style={{ width: '25%' }}>Diagnosis</th>
                <th style={{ width: '25%' }}>Prescription / Treatment</th>
                <th style={{ width: '15%' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {myVisits.map(v => (
                <tr key={v.id}>
                  <td>{new Date(v.date).toLocaleDateString('en-GB')}</td>
                  <td>{(v.symptoms || []).join(', ') || 'N/A'}</td>
                  <td><strong>{v.diagnosis || 'Health Examination'}</strong></td>
                  <td>{v.prescription || 'None prescribed'}</td>
                  <td>{v.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Diagnostic Lab Results */}
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginTop: '24px', marginBottom: '8px' }}>3. Laboratory Diagnostic Log</h2>
        {myLabs.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>No lab results on record.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Date Uploaded</th>
                <th style={{ width: '30%' }}>Test Type</th>
                <th style={{ width: '50%' }}>Diagnostic Summary</th>
              </tr>
            </thead>
            <tbody>
              {myLabs.map(lr => (
                <tr key={lr.id}>
                  <td>{new Date(lr.uploaded_at).toLocaleDateString('en-GB')}</td>
                  <td><strong>{lr.test_type}</strong></td>
                  <td>{lr.summary || 'Laboratory test report recorded'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Verification Footer */}
        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <div>
            <p style={{ margin: 0 }}><strong>Generated By:</strong> ECO~MEDIK Patient Health Portal</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0 }}><strong>Official Certified Patient Document</strong></p>
          </div>
        </div>
      </div>
    </div>
  )
}
