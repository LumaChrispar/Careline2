import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Phone, Mail, MapPin, Droplets, AlertTriangle, Calendar, Stethoscope, FlaskConical, Plus, ChevronDown, ChevronUp, Trash2, Printer, Edit3, Save, X, Activity } from 'lucide-react'
import usePatientStore from '../stores/patientStore'
import useLabStore from '../stores/labStore'
import useAuthStore from '../stores/authStore'
import useUiStore from '../stores/uiStore'

const symptomOptions = ['Malaria', 'Fever', 'Typhoid', 'Headache', 'Cough', 'Diarrhea', 'Fatigue', 'Joint Pain', 'Vomiting', 'Rash', 'Abdominal Pain', 'Chest Pain', 'Sore Throat', 'Body Aches']

export default function PatientProfilePage() {
  const { id } = useParams()
  const { getPatientById, getVisitsForPatient, addVisit, updateVisit, deletePatient, isLoading } = usePatientStore()
  const { getResultsForPatient } = useLabStore()
  const { role, user } = useAuthStore()
  const { addToast } = useUiStore()
  const navigate = useNavigate()

  const patient = getPatientById(id)
  const visits = getVisitsForPatient(id)
  const labResults = getResultsForPatient(id)

  const [showNewVisit, setShowNewVisit] = useState(false)
  const [visitForm, setVisitForm] = useState({ symptoms: [], diagnosis: '', prescription: '', notes: '' })
  const [selectedSymptoms, setSelectedSymptoms] = useState([])

  // Edit visit modal state
  const [editingVisit, setEditingVisit] = useState(null)
  const [editForm, setEditForm] = useState({ symptoms: [], diagnosis: '', prescription: '', notes: '' })

  if (!patient && isLoading) return <div role="status" className="app-loading">Loading patient record…</div>

  if (!patient) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-lg font-semibold" style={{ color: 'var(--color-text-muted)' }}>Patient not found</p>
          <Link to="/patients" className="btn btn-ghost mt-4"><ArrowLeft className="w-4 h-4" /> Back to Patients</Link>
        </div>
      </div>
    )
  }

  const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()

  const toggleSymptom = (s) => {
    setSelectedSymptoms(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  const toggleEditSymptom = (s) => {
    setEditForm(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(s)
        ? prev.symptoms.filter(x => x !== s)
        : [...prev.symptoms, s]
    }))
  }

  const handleAddVisit = async (e) => {
    e.preventDefault()
    const result = await addVisit({
      ...visitForm,
      symptoms: selectedSymptoms,
      patient_id: id,
      attending_doctor: user?.id,
      facility_id: user?.user_metadata?.facility_id || null,
    })
    if (result) {
      addToast('Visit recorded successfully', 'success')
      setShowNewVisit(false)
      setVisitForm({ symptoms: [], diagnosis: '', prescription: '', notes: '' })
      setSelectedSymptoms([])
    } else {
      addToast('Failed to record visit. Please try again.', 'danger')
    }
  }

  const startEditVisit = (v) => {
    setEditingVisit(v)
    setEditForm({
      symptoms: v.symptoms || [],
      diagnosis: v.diagnosis || '',
      prescription: v.prescription || '',
      notes: v.notes || ''
    })
  }

  const handleSaveVisitEdit = async (e) => {
    e.preventDefault()
    if (!editingVisit) return
    const res = await updateVisit(editingVisit.id, editForm)
    if (res.success) {
      addToast('Patient visit updated successfully', 'success')
      setEditingVisit(null)
    } else {
      addToast(`Error updating visit: ${res.error}`, 'danger')
    }
  }

  const handlePrintReport = () => {
    window.print()
  }

  const canManageVisits = ['admin', 'doctor', 'nurse', 'receptionist'].includes(role)

  return (
    <div className="space-y-6">
      {/* Back & Actions */}
      <div className="flex items-center justify-between no-print">
        <Link to="/patients" className="inline-flex items-center gap-2 text-sm transition-colors duration-200" style={{ color: 'var(--color-text-muted)' }}>
          <ArrowLeft className="w-4 h-4" /> Back to Patients
        </Link>
        <button 
          onClick={handlePrintReport}
          className="btn btn-primary btn-sm flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Printer className="w-4 h-4" /> Print Medical Report PDF
        </button>
      </div>

      {/* Profile Header */}
      <div className="glass-card p-6 sm:p-8 lg:p-10 no-print">
        <div className="flex flex-col sm:flex-row items-start gap-6 lg:gap-8">
          <div
            className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', boxShadow: '0 8px 32px rgba(0, 242, 254, 0.3)' }}
          >
            {(patient.first_name?.[0] || '')}{(patient.last_name?.[0] || '')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                {patient.first_name} {patient.last_name}
              </h2>
              <span className="badge badge-primary text-sm">{patient.id}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <User className="w-4 h-4" /> {patient.gender}, {age} yrs
              </span>
              {patient.phone && (
                <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <Phone className="w-4 h-4" /> {patient.phone}
                </span>
              )}
              {patient.email && (
                <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <Mail className="w-4 h-4" /> {patient.email}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                <MapPin className="w-4 h-4" /> {patient.village}, {patient.region}
              </span>
              {patient.blood_group && (
                <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <Droplets className="w-4 h-4" /> {patient.blood_group}
                </span>
              )}
            </div>
          </div>
          
          {(role === 'admin' || role === 'doctor') && (
            <button 
              onClick={async () => {
                if (confirm('Permanently delete this patient record?')) {
                  const res = await deletePatient(id)
                  if (res.success) {
                    addToast('Patient record deleted', 'success')
                    navigate('/patients')
                  }
                }
              }}
              className="btn btn-ghost btn-sm text-danger hover:bg-danger/10"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Record
            </button>
          )}
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-8 pt-8 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Allergies</p>
            <p className="text-base font-bold mt-2" style={{ color: patient.allergies === 'None' ? 'var(--color-accent)' : 'var(--color-warning-light)' }}>
              {patient.allergies || 'None'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Next of Kin</p>
            <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-text)' }}>{patient.next_of_kin || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Total Visits</p>
            <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-text)' }}>{visits.length}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Lab Results</p>
            <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-text)' }}>{labResults.length}</p>
          </div>
        </div>
      </div>

      {/* Add Visit (for Doctors, Admins, Nurses) */}
      {canManageVisits && (
        <div className="glass-card overflow-hidden no-print">
          <button
            onClick={() => setShowNewVisit(!showNewVisit)}
            className="w-full flex items-center justify-between px-8 py-6 transition-colors duration-200"
            style={{ color: 'var(--color-primary-light)' }}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Plus className="w-4 h-4" /> Record New Visit
            </span>
            {showNewVisit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showNewVisit && (
            <form onSubmit={handleAddVisit} className="px-5 pb-5 space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Symptoms</label>
                <div className="flex flex-wrap gap-2">
                  {symptomOptions.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSymptom(s)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                      style={{
                        background: selectedSymptoms.includes(s) ? 'var(--color-primary)' : 'var(--color-surface-light)',
                        color: selectedSymptoms.includes(s) ? 'white' : 'var(--color-text-muted)',
                        border: `1px solid ${selectedSymptoms.includes(s) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Diagnosis</label>
                  <input value={visitForm.diagnosis} onChange={(e) => setVisitForm({ ...visitForm, diagnosis: e.target.value })} placeholder="Enter diagnosis" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Prescription</label>
                  <input value={visitForm.prescription} onChange={(e) => setVisitForm({ ...visitForm, prescription: e.target.value })} placeholder="Enter prescription" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes</label>
                <textarea rows={3} value={visitForm.notes} onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })} placeholder="Additional clinical notes..." />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn btn-accent">
                  <Stethoscope className="w-4 h-4" /> Save Visit
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Edit Visit Modal */}
      {editingVisit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="glass-card max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in duration-200 border-primary/20">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
                <Edit3 className="w-5 h-5" /> Edit Visit Record ({new Date(editingVisit.date).toLocaleDateString()})
              </h3>
              <button onClick={() => setEditingVisit(null)} className="text-text-muted hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveVisitEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-text-muted">Symptoms</label>
                <div className="flex flex-wrap gap-2">
                  {symptomOptions.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleEditSymptom(s)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                        editForm.symptoms.includes(s)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white/5 text-text-muted border-white/10 hover:bg-white/10'
                      } border`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-text-muted">Diagnosis</label>
                  <input
                    type="text"
                    value={editForm.diagnosis}
                    onChange={(e) => setEditForm({ ...editForm, diagnosis: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                    placeholder="Updated diagnosis..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-text-muted">Prescription</label>
                  <input
                    type="text"
                    value={editForm.prescription}
                    onChange={(e) => setEditForm({ ...editForm, prescription: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                    placeholder="Updated prescription..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-text-muted">Clinical Notes</label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm"
                  placeholder="Additional clinical notes..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setEditingVisit(null)} className="btn btn-ghost btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visit History */}
      <div className="glass-card overflow-hidden no-print">
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Visit History</h3>
          <span className="text-xs text-text-muted">{visits.length} visit(s) recorded</span>
        </div>
        {visits.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No visits recorded</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {visits.map(v => {
              const vLabResults = labResults.filter(r => r.visit_id === v.id)
              return (
                <div key={v.id} className="px-5 py-4 space-y-2 group">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      <Calendar className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                      {new Date(v.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {canManageVisits && (
                      <button 
                        onClick={() => startEditVisit(v)}
                        className="btn btn-ghost btn-xs text-text-muted hover:text-primary flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Visit
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(v.symptoms || []).map(s => (
                      <span key={s} className="badge badge-warning">{s}</span>
                    ))}
                  </div>
                  {v.diagnosis && (
                    <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                      <strong>Diagnosis:</strong> {v.diagnosis}
                    </p>
                  )}
                  {v.prescription && (
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      <strong style={{ color: 'var(--color-text)' }}>Rx:</strong> {v.prescription}
                    </p>
                  )}
                  {v.notes && (
                    <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>{v.notes}</p>
                  )}
                  {vLabResults.length > 0 && (
                    <div className="mt-2 pt-2 border-t" style={{ borderColor: 'rgba(51,65,85,0.3)' }}>
                      {vLabResults.map(lr => (
                        <div key={lr.id} className="flex items-start gap-2 text-sm">
                          <FlaskConical className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
                          <div>
                            <span className="font-medium" style={{ color: 'var(--color-accent-light)' }}>{lr.test_type}</span>
                            {lr.summary && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{lr.summary}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 🖨️ FULL PRINTABLE MEDICAL REPORT (Rendered in print layout) */}
      <div className="print-only printable-report">
        <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0369a1', margin: 0 }}>ECO~MEDIK CLINICAL SYSTEMS</h1>
            <p style={{ fontSize: '12px', color: '#475569', margin: '4px 0 0 0' }}>Official Comprehensive Patient Medical & Diagnostic Report</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>
            <p style={{ margin: 0 }}><strong>Report Date:</strong> {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p style={{ margin: 0 }}><strong>Patient ID:</strong> {patient.id}</p>
          </div>
        </div>

        {/* Patient Metadata Table */}
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>1. Patient Demographics & Profile</h2>
        <table>
          <tbody>
            <tr>
              <td><strong>Full Name:</strong> {patient.first_name} {patient.last_name}</td>
              <td><strong>Date of Birth:</strong> {patient.date_of_birth} ({age} yrs)</td>
              <td><strong>Gender:</strong> {patient.gender}</td>
            </tr>
            <tr>
              <td><strong>Phone:</strong> {patient.phone || 'N/A'}</td>
              <td><strong>Email:</strong> {patient.email || 'N/A'}</td>
              <td><strong>Location:</strong> {patient.village}, {patient.region}</td>
            </tr>
            <tr>
              <td><strong>Blood Group:</strong> {patient.blood_group || 'Not Recorded'}</td>
              <td><strong>Known Allergies:</strong> {patient.allergies || 'None'}</td>
              <td><strong>Emergency Contact / Kin:</strong> {patient.next_of_kin || 'N/A'}</td>
            </tr>
          </tbody>
        </table>

        {/* Complete Visit History */}
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginTop: '24px', marginBottom: '8px' }}>2. Clinical Consultation & Visit History</h2>
        {visits.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>No consultation visits recorded for this patient.</p>
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
              {visits.map(v => (
                <tr key={v.id}>
                  <td>{new Date(v.date).toLocaleDateString('en-GB')}</td>
                  <td>{(v.symptoms || []).join(', ') || 'N/A'}</td>
                  <td><strong>{v.diagnosis || 'General Examination'}</strong></td>
                  <td>{v.prescription || 'None prescribed'}</td>
                  <td>{v.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Laboratory Results Log */}
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginTop: '24px', marginBottom: '8px' }}>3. Laboratory Diagnostic Results</h2>
        {labResults.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>No laboratory test records available.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '20%' }}>Upload Date</th>
                <th style={{ width: '30%' }}>Test Type</th>
                <th style={{ width: '50%' }}>Findings / Clinical Summary</th>
              </tr>
            </thead>
            <tbody>
              {labResults.map(lr => (
                <tr key={lr.id}>
                  <td>{new Date(lr.uploaded_at).toLocaleDateString('en-GB')}</td>
                  <td><strong>{lr.test_type}</strong></td>
                  <td>{lr.summary || 'Laboratory report uploaded'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Signature Box */}
        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <div>
            <p style={{ margin: 0 }}><strong>Attending Medical Officer / Nurse:</strong> ______________________</p>
            <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Signature & Medical License Stamp</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0 }}><strong>ECO~MEDIK Digital Health Record Verification</strong></p>
            <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Verified & Certified Electronic Health Document</p>
          </div>
        </div>
      </div>
    </div>
  )
}
