import { Navigate } from 'react-router-dom'
import useAuthStore from '../../stores/authStore'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, isLoading } = useAuthStore()

  if (isLoading) return <div role="status" className="app-loading">Loading your workspace…</div>

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // If patient goes where they shouldn't, bounce to records. Staff bounce to dashboard.
    return <Navigate to={role === 'patient' ? '/my-records' : '/dashboard'} replace />
  }

  return children
}
