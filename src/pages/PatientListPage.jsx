import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserPlus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import usePatientStore from '../stores/patientStore'
import useUiStore from '../stores/uiStore'

const PAGE_SIZE = 10

export default function PatientListPage() {
  const { patients, searchQuery, setSearchQuery, getFilteredPatients, deletePatient } = usePatientStore()
  const { addToast } = useUiStore()
  const [page, setPage] = useState(1)

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this patient record?')) {
        const res = await deletePatient(id)
        if (res.success) addToast('Patient record deleted', 'success')
        else addToast(res.error || 'Could not delete patient', 'danger')
    }
  }

  const filtered = getFilteredPatients()
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const currentPage = Math.min(page, Math.max(1, totalPages))
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <h2 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Patients</h2>
        <div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {filtered.length} patient{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Link to="/patients/new" className="btn btn-primary">
          <UserPlus className="w-4 h-4" /> Register Patient
        </Link>
      </div>

      {/* Filters */}
      <div className="glass-card p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
            placeholder="Search by ID, name, or phone..."
            className="w-full"
            style={{ paddingLeft: '48px' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Full Name</th>
                <th>Date of Birth</th>
                <th>Gender</th>
                <th>Phone</th>
                <th>Region</th>
                <th>Blood Group</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
                    {searchQuery ? 'No patients match your search' : 'No patients registered yet'}
                  </td>
                </tr>
              ) : (
                paginated.map(p => (
                  <tr key={p.id}>
                    <td><span className="badge badge-primary">{p.id}</span></td>
                    <td className="font-medium" style={{ color: 'var(--color-text)' }}>
                      {p.first_name} {p.last_name}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(p.date_of_birth).toLocaleDateString()}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{p.gender}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{p.phone}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{p.region}</td>
                    <td>
                      <span className="badge badge-accent">{p.blood_group}</span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center gap-2">
                        <Link to={`/patients/${p.id}`} className="btn btn-ghost btn-sm">
                          View
                        </Link>
                        <button onClick={() => handleDelete(p.id)} className="p-2 text-text-muted hover:text-danger rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="btn btn-ghost btn-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-ghost btn-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
