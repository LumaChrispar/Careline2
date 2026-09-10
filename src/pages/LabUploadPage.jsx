import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, CheckCircle, AlertCircle, Search, ChevronDown, X, FlaskConical } from 'lucide-react'
import useLabStore from '../stores/labStore'
import usePatientStore from '../stores/patientStore'
import useAuthStore from '../stores/authStore'
import useUiStore from '../stores/uiStore'

const testTypes = ['Malaria RDT', 'Full Blood Count (CBC)', 'Typhoid Test (Widal)', 'HIV Screening', 'Urinalysis', 'Liver Function Test', 'X-Ray / Imaging Report']

export default function LabUploadPage() {
  const { patients, visits } = usePatientStore()
  const { user } = useAuthStore()
  const { uploadResult } = useLabStore()
  const { addToast } = useUiStore()
  const navigate = useNavigate()

  const [form, setForm] = useState({ patient_id: '', visit_id: '', test_type: '', summary: '' })
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Search states
  const [patientSearch, setPatientSearch] = useState('')
  const [showPatientResults, setShowPatientResults] = useState(false)
  const [testSearch, setTestSearch] = useState('')
  const [showTestSuggestions, setShowTestSuggestions] = useState(false)

  const patientRef = useRef(null)
  const testRef = useRef(null)

  const patientVisits = form.patient_id
    ? visits.filter(v => v.patient_id === form.patient_id)
    : []

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (patientRef.current && !patientRef.current.contains(e.target)) setShowPatientResults(false)
      if (testRef.current && !testRef.current.contains(e.target)) setShowTestSuggestions(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    if (errors[name]) setErrors({ ...errors, [name]: '' })
  }

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (f && f.size > 10 * 1024 * 1024) {
      setErrors({ ...errors, file: 'File exceeds 10 MB limit' })
      return
    }
    setFile(f)
    if (errors.file) setErrors({ ...errors, file: '' })
  }

  const validate = () => {
    const errs = {}
    if (!form.patient_id) errs.patient_id = 'Select a valid patient'
    if (!form.test_type) errs.test_type = 'Test type is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setUploading(true)
    const response = await uploadResult({
      ...form,
      facility_id: user?.user_metadata?.facility_id || null,
    }, file, user?.id)

    if (!response.success) {
      setUploading(false)
      addToast(`Upload failed: ${response.error}`, 'danger')
      return
    }

    setUploading(false)
    setSuccess(true)
    addToast('Lab result uploaded!', 'success')
    setTimeout(() => navigate('/lab'), 2000)
  }

  const filteredPatients = patients.filter(p => 
    p.id.toLowerCase().includes(patientSearch.toLowerCase()) ||
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(patientSearch.toLowerCase())
  ).slice(0, 5)

  const filteredTests = testTypes.filter(t => 
    t.toLowerCase().includes(testSearch.toLowerCase())
  )

  const selectedPatient = patients.find(p => p.id === form.patient_id)

  if (success) {
    return (
      <div className="flex items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-accent/20 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
            <CheckCircle className="w-10 h-10 text-accent" />
          </div>
          <h2 className="text-3xl font-bold text-text">Result Uploaded!</h2>
          <p className="text-text-muted mt-3">The patient and doctor have been notified.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <form onSubmit={handleSubmit} className="glass-card p-8 md:p-12 space-y-10 relative overflow-hidden border-accent/10">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <FlaskConical size={200} />
        </div>

        <div className="pb-8 border-b border-white/5 relative z-10">
          <h3 className="text-2xl font-black tracking-tight text-text">Upload Results</h3>
          <p className="text-sm mt-2 text-text-muted">Enter test details and upload the diagnostic report.</p>
        </div>

        <div className="space-y-8 relative z-10">
          {/* Patient Selection (Searchable Input) */}
          <div className="relative" ref={patientRef}>
            <label className="block text-[11px] font-black uppercase tracking-[0.2em] mb-3 text-text-muted/70">Patient Identification *</label>
            <div className="relative group">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${form.patient_id ? 'text-accent' : 'text-text-muted'}`} />
              <input
                type="text"
                placeholder="Search by Patient ID or Name..."
                className={`pl-12 pr-12 w-full py-4 rounded-2xl bg-white/[0.03] border transition-all duration-300 ${form.patient_id ? 'border-accent/40 bg-accent/5' : 'border-white/10 hover:border-white/20'}`}
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value)
                  setShowPatientResults(true)
                  if (!e.target.value) setForm({ ...form, patient_id: '', visit_id: '' })
                }}
                onFocus={() => setShowPatientResults(true)}
              />
              {form.patient_id ? (
                <button 
                  type="button" 
                  onClick={() => { setForm({ ...form, patient_id: '', visit_id: '' }); setPatientSearch('') }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-text-muted hover:text-danger transition-colors"
                >
                  <X size={16} />
                </button>
              ) : (
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              )}
            </div>

            {showPatientResults && patientSearch && !form.patient_id && (
              <div className="absolute z-[100] w-full mt-2 bg-[#1a1a1a] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden backdrop-blur-xl">
                {filteredPatients.length > 0 ? filteredPatients.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full flex items-center gap-4 p-4 hover:bg-white/5 text-left transition-colors border-b last:border-0 border-white/5 group"
                    onClick={() => {
                      setForm({ ...form, patient_id: p.id })
                      setPatientSearch(`${p.first_name} ${p.last_name} (${p.id})`)
                      setShowPatientResults(false)
                      if (errors.patient_id) setErrors({ ...errors, patient_id: '' })
                    }}
                  >
                     <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xs font-bold text-text-muted group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                        {p.first_name[0]}{p.last_name[0]}
                     </div>
                     <div>
                        <p className="text-sm font-bold text-text group-hover:text-primary transition-colors">{p.first_name} {p.last_name}</p>
                        <p className="text-[10px] text-text-muted font-mono tracking-tighter">{p.id}</p>
                     </div>
                  </button>
                )) : (
                  <div className="p-8 text-center bg-[#1a1a1a]">
                    <p className="text-sm text-text-muted italic">No patients matching "{patientSearch}"</p>
                  </div>
                )}
              </div>
            )}
            {errors.patient_id && <p className="text-xs mt-2 text-danger flex items-center gap-1 font-medium"><AlertCircle size={14} />{errors.patient_id}</p>}
          </div>

          {/* Linked Visit Selection */}
          <div className={`transition-all duration-500 overflow-hidden ${selectedPatient ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
            <label className="block text-[11px] font-black uppercase tracking-[0.2em] mb-3 text-text-muted/70">Link to clinical visit (Optional)</label>
            <div className="relative">
              <select 
                name="visit_id" 
                value={form.visit_id} 
                onChange={handleChange} 
                className="w-full pl-4 pr-10 py-4 rounded-2xl bg-white/[0.03] border border-white/10 appearance-none cursor-pointer hover:border-white/20 transition-all font-medium text-sm"
              >
                <option value="" className="bg-[#1a1a1a]">None (Stand-alone test)</option>
                {patientVisits.map(v => (
                  <option key={v.id} value={v.id} className="bg-[#1a1a1a]">
                    {new Date(v.date).toLocaleDateString()} — {v.symptoms.slice(0, 2).join(', ')}...
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
          </div>

          {/* Test Type (Search or Type) */}
          <div className="relative" ref={testRef}>
            <label className="block text-[11px] font-black uppercase tracking-[0.2em] mb-3 text-text-muted/70">Test Category / Type *</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search or type diagnostic test name..."
                className={`w-full py-4 pl-4 pr-12 rounded-2xl bg-white/[0.03] border transition-all duration-300 ${form.test_type ? 'border-primary/40 bg-primary/5' : 'border-white/10 hover:border-white/20'}`}
                value={form.test_type}
                onChange={(e) => {
                  setForm({ ...form, test_type: e.target.value })
                  setTestSearch(e.target.value)
                  setShowTestSuggestions(true)
                  if (errors.test_type) setErrors({ ...errors, test_type: '' })
                }}
                onFocus={() => setShowTestSuggestions(true)}
              />
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>

            {showTestSuggestions && (
              <div className="absolute z-[100] w-full mt-2 bg-[#1a1a1a] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden backdrop-blur-xl max-h-60 overflow-y-auto">
                {filteredTests.length > 0 ? filteredTests.map(t => (
                  <button
                    key={t}
                    type="button"
                    className="w-full p-4 hover:bg-white/5 text-left text-sm font-medium transition-colors border-b last:border-0 border-white/5"
                    onClick={() => {
                      setForm({ ...form, test_type: t })
                      setShowTestSuggestions(false)
                    }}
                  >
                    {t}
                  </button>
                )) : testSearch && (
                  <div className="p-5 text-center bg-[#1a1a1a]">
                    <p className="text-xs text-text-muted">No system match. Custom test name: <span className="font-bold text-text-muted block mt-1 italic">"{testSearch}"</span></p>
                  </div>
                )}
                {!testSearch && testTypes.map(t => (
                  <button
                    key={t}
                    type="button"
                    className="w-full p-4 hover:bg-white/5 text-left text-sm transition-colors border-b last:border-0 border-white/5"
                    onClick={() => {
                      setForm({ ...form, test_type: t })
                      setShowTestSuggestions(false)
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            {errors.test_type && <p className="text-xs mt-2 text-danger flex items-center gap-1 font-medium"><AlertCircle size={14} />{errors.test_type}</p>}
          </div>

          {/* File Upload Section */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-[0.2em] mb-3 text-text-muted/70">Diagnostic Report (Max 10MB) *</label>
            <label
              className={`flex items-center justify-center flex-col gap-4 p-12 rounded-[40px] border-2 border-dashed cursor-pointer transition-all duration-500 group relative overflow-hidden ${file ? 'border-accent bg-accent/5' : 'border-white/10 hover:border-white/20 bg-white/[0.01]'}`}
            >
              <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-lg ${file ? 'bg-accent/20 text-accent' : 'bg-white/5 text-text-muted'}`}>
                {file ? <FileText size={32} /> : <Upload size={32} />}
              </div>
              <div className="text-center relative z-10">
                {file ? (
                  <>
                    <p className="text-sm font-black text-accent uppercase tracking-wider">{file.name}</p>
                    <p className="text-[10px] text-text-muted mt-2 font-bold select-none tracking-[0.2em] uppercase">{(file.size / (1024 * 1024)).toFixed(2)} MB • READY FOR TRANSMISSION</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-text/80">Drop report here or Browse</p>
                    <p className="text-[10px] text-text-muted mt-2 font-black tracking-[0.2em] uppercase">PDF • JPG • PNG</p>
                  </>
                )}
              </div>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
            </label>
            {errors.file && <p className="text-xs mt-2 text-danger flex items-center gap-1 font-medium"><AlertCircle size={14} />{errors.file}</p>}
          </div>

          {/* Summary / Notes */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-[0.2em] mb-3 text-text-muted/70">Clinical Observations / Summary</label>
            <textarea
              className="w-full p-5 rounded-[24px] border border-white/10 bg-white/[0.02] focus:border-primary/50 focus:bg-primary/5 transition-all outline-none text-sm leading-relaxed"
              rows={4}
              name="summary"
              value={form.summary}
              onChange={handleChange}
              placeholder="Provide a brief summary of the findings..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-10 border-t border-white/5 gap-6">
          <button type="button" onClick={() => navigate('/lab')} className="px-6 py-4 rounded-2xl text-text-muted font-bold text-sm tracking-widest uppercase hover:text-text transition-colors">
            Cancel
          </button>
          <button 
            type="submit" 
            className="flex-1 bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-[0_15px_30px_rgba(8,145,178,0.3)] hover:shadow-[0_20px_40px_rgba(8,145,178,0.4)] hover:-translate-y-1 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:pointer-events-none" 
            disabled={uploading}
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-3 italic animate-pulse">
                Encrypting & Syncing Data...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                <Upload size={16} /> Finalize Submission
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
