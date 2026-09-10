import React, { useState } from 'react'
import useAuthStore from '../stores/authStore'
import useLabStore from '../stores/labStore'
import { supabase } from '../lib/supabase'
import { X, FileText, Download, Calendar, User, FlaskConical, Building2 } from 'lucide-react'

export default function LabResultModal({ result, patient, onClose }) {
  const role = useAuthStore(s => s.role)
  const [saving, setSaving] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [error, setError] = useState('')
  const acknowledge = async () => {
    if (saving) return
    setSaving(true); setError('')
    try {
      const { data, error: failure } = await supabase.from('lab_results').update({ notified_at: new Date().toISOString() }).eq('id', result.id).select().single()
      if (failure) throw failure
      useLabStore.setState(s => ({ labResults: s.labResults.map(r => r.id === data.id ? data : r) }))
      setReviewed(true)
    } catch (failure) { setError(failure.message) }
    finally { setSaving(false) }
  }
  if (!result) return null

  return (
    <div role="dialog" aria-modal="true" aria-label="Lab test report" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="glass-card w-full max-w-2xl overflow-hidden shadow-2xl border-white/10 bg-[#0b0f19] animate-in zoom-in duration-300">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
              <FlaskConical size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-text">Lab Test Report</h3>
              <p className="text-xs text-text-muted uppercase tracking-widest font-bold mt-0.5">{result.id}</p>
            </div>
          </div>
          <button 
            aria-label="Close report" onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-text transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {(reviewed || result.notified_at) ? <p className="badge badge-accent" role="status">Reviewed by clinician</p> : ['admin', 'doctor'].includes(role) && <button className="btn btn-primary" disabled={saving} onClick={acknowledge}>{saving ? 'Saving…' : 'Mark as reviewed'}</button>}
          {error && <p role="alert" style={{ color: 'var(--color-danger)' }}>{error}</p>}
          {/* Patient info row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                <User size={12} className="text-primary" /> Patient
              </label>
              <p className="text-lg font-bold text-text">
                {patient ? `${patient.first_name} ${patient.last_name}` : result.patient_id}
              </p>
              <p className="text-xs font-mono text-text-muted">{result.patient_id}</p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                <Calendar size={12} className="text-accent" /> Date Uploaded
              </label>
              <p className="text-lg font-bold text-text">
                {new Date(result.uploaded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs text-text-muted">{new Date(result.uploaded_at).toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Test Type</label>
                <div className="flex flex-wrap gap-2 mt-2">
                   <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-black">
                      {result.test_type}
                   </span>
                </div>
             </div>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Summary / Observations</label>
             <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 italic text-text/90 leading-relaxed">
                &ldquo; {result.summary || 'No summary provided for this lab result.'} &rdquo;
             </div>
          </div>

          {result.file_url ? (
            <div className="p-6 rounded-[32px] bg-accent/5 border border-accent/20 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center text-accent">
                  <FileText size={28} />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wider text-accent-light">Diagnostic Report</h4>
                  <p className="text-xs text-text-muted mt-1 uppercase tracking-widest font-bold">READY FOR REVIEW</p>
                </div>
              </div>
              <a 
                href={result.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full md:w-auto px-8 py-3 rounded-2xl bg-accent text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
              >
                <Download size={16} /> Open Document
              </a>
            </div>
          ) : (
             <div className="p-6 rounded-[32px] bg-white/[0.02] border border-dashed border-white/10 flex items-center justify-center gap-4">
                <FileText size={20} className="text-text-muted opacity-30" />
                <p className="text-sm text-text-muted italic">No attached document for this result.</p>
             </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
           <div className="flex items-center gap-2 text-[10px] text-text-muted/60 font-black uppercase tracking-[0.2em]">
              <Building2 size={12} /> Secure Medical Portal
           </div>
           <button 
             onClick={onClose}
             className="px-6 py-2 rounded-xl text-text-muted font-bold text-xs uppercase tracking-widest hover:text-text hover:bg-white/5 transition-all"
           >
             Close Detail
           </button>
        </div>
      </div>
    </div>
  )
}
