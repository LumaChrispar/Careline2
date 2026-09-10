import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FlaskConical, Search, Filter, Upload, FileText, Eye, ChevronRight } from 'lucide-react'
import useLabStore from '../stores/labStore'
import usePatientStore from '../stores/patientStore'
import useAuthStore from '../stores/authStore'
import LabResultModal from '../components/LabResultModal'

const testTypes = ['All', 'Malaria RDT', 'Full Blood Count (CBC)', 'Typhoid Test (Widal)', 'HIV Screening', 'Urinalysis', 'Liver Function Test', 'X-Ray / Imaging Report']

export default function LabResultsPage() {
  const { labResults } = useLabStore()
  const { patients } = usePatientStore()
  const { role } = useAuthStore()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [selectedResult, setSelectedResult] = useState(null)

  const filtered = labResults.filter(r => {
    const patient = patients.find(p => p.id === r.patient_id)
    const q = search.trim().toLowerCase()
    const matchSearch = !q || `${patient?.first_name || ''} ${patient?.last_name || ''} ${r.patient_id} ${r.test_type}`.toLowerCase().includes(q)
    const matchType = filterType === 'All' || r.test_type === filterType
    return matchSearch && matchType
  })

  const getPatient = (pid) => {
    return patients.find(x => x.id === pid)
  }

  const getPatientName = (pid) => {
    const p = getPatient(pid)
    return p ? `${p.first_name} ${p.last_name}` : pid
  }

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <h2 className="text-4xl font-black tracking-tight" style={{ color: 'var(--color-text)' }}>Laboratory Records</h2>
          <p className="text-sm mt-2 font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Centralized hub for diagnostic data and clinical reports.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end mr-4">
            <p className="text-2xl font-black text-text">{filtered.length}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Total Results</p>
          </div>
          {(role === 'labtech' || role === 'admin') && (
            <Link to="/lab/upload" className="btn btn-primary px-8 py-3 rounded-2xl shadow-lg shadow-primary/20">
              <Upload className="w-4 h-4" /> Upload Result
            </Link>
          )}
        </div>
      </div>

      <div className="glass-card p-4 md:p-6 flex flex-col sm:flex-row items-center gap-6 border-white/10 shadow-2xl">
        <div className="relative flex-1 w-full group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors group-focus-within:text-primary" style={{ color: 'var(--color-text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient name or ID..."
            className="w-full pl-12 py-4 rounded-2xl bg-white/[0.03] border-white/1 transition-all outline-none"
          />
        </div>
        <div className="relative w-full sm:w-auto overflow-hidden">
          <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="pl-12 pr-10 w-full py-4 rounded-2xl bg-white/[0.03] border-white/1 appearance-none cursor-pointer outline-none font-bold text-sm"
            style={{ minWidth: '240px' }}
          >
            {testTypes.map(t => <option key={t} value={t} className="bg-[#1a1a1a]">{t}</option>)}
          </select>
          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted rotate-90 pointer-events-none" />
        </div>
      </div>

      <div className="glass-card overflow-hidden border-white/5 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-muted">Patient</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-muted">Test Category</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-muted">Status / Date</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-20">
                     <div className="flex flex-col items-center gap-4 opacity-40">
                        <FlaskConical size={48} className="text-text-muted" />
                        <p className="text-sm font-black uppercase tracking-widest text-text-muted">No diagnostic records found</p>
                     </div>
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id} className="group hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => setSelectedResult(r)}>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold shadow-lg shadow-black/20 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                          {getPatientName(r.patient_id).split(' ').map(n => n?.[0]).join('')}
                        </div>
                        <div>
                          <p className="font-black text-text group-hover:text-primary transition-colors">{getPatientName(r.patient_id)}</p>
                          <p className="text-[10px] mt-1 font-mono text-text-muted uppercase tracking-tighter">{r.patient_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest text-text-muted group-hover:text-text group-hover:border-primary/30 transition-all">
                        {r.test_type}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                         <div className={`w-2 h-2 rounded-full ${r.notified_at ? 'bg-accent' : 'bg-warning animate-pulse'}`} />
                         <div>
                            <p className="text-sm font-bold text-text">{new Date(r.uploaded_at).toLocaleDateString()}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                               {r.notified_at ? 'Verified' : 'Pending Review'}
                            </p>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        className="btn btn-ghost btn-sm px-4 py-2 rounded-xl group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-end gap-2 ml-auto"
                        onClick={(e) => { e.stopPropagation(); setSelectedResult(r) }}
                      >
                         <Eye size={16} /> <span className="font-black text-[10px] uppercase tracking-widest">Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LabResultModal 
        result={selectedResult} 
        patient={selectedResult ? getPatient(selectedResult.patient_id) : null}
        onClose={() => setSelectedResult(null)} 
      />
    </div>
  )
}
