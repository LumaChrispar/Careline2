import { ShieldAlert, AlertTriangle, Bell, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import useOutbreakStore from '../stores/outbreakStore'
import useAuthStore from '../stores/authStore'
import useUiStore from '../stores/uiStore'

export default function OutbreakMonitorPage() {
  const { alerts, getActiveAlerts, getResolvedAlerts, notifyAuthorities, resolveAlert, config } = useOutbreakStore()
  const { user, role } = useAuthStore()
  const { addToast } = useUiStore()

  const active = getActiveAlerts()
  const resolved = getResolvedAlerts()

  const handleNotify = (alertId) => {
    notifyAuthorities(alertId, user.id)
    addToast('Regional health authorities have been notified', 'success')
  }

  const handleResolve = (alertId) => {
    resolveAlert(alertId)
    addToast('Alert resolved', 'info')
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
            <ShieldAlert className="w-6 h-6" style={{ color: 'var(--color-danger-light)' }} />
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Active Alerts</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{active.length}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
            <TrendingUp className="w-6 h-6" style={{ color: 'var(--color-warning-light)' }} />
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Detection Threshold</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{config.threshold} cases / {config.windowDays}d</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
            <CheckCircle className="w-6 h-6" style={{ color: 'var(--color-accent-light)' }} />
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Resolved</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{resolved.length}</p>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="glass-card overflow-hidden mt-4">
        <div className="px-8 py-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-base font-bold flex items-center gap-3" style={{ color: 'var(--color-danger-light)' }}>
            <AlertTriangle className="w-5 h-5" /> Active Outbreak Alerts
          </h3>
        </div>
        {active.length === 0 ? (
          <div className="px-8 py-16 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-accent)' }} />
            <p className="text-base font-bold" style={{ color: 'var(--color-text)' }}>No active outbreaks</p>
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>The system is monitoring continuously</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {active.map(alert => (
              <div key={alert.id} className="p-8 space-y-5">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h4 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                      {alert.symptom}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <span className="badge badge-danger">{alert.case_count} cases</span>
                      <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                        <Clock className="w-3 h-3" />
                        Last {alert.window_days} days
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Triggered: {new Date(alert.triggered_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar showing severity */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    <span>Severity</span>
                    <span>{Math.min(100, Math.round((alert.case_count / (config.threshold * 2)) * 100))}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-lighter)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (alert.case_count / (config.threshold * 2)) * 100)}%`,
                        background: alert.case_count >= config.threshold * 1.5
                          ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                          : 'linear-gradient(90deg, #f59e0b, #ef4444)',
                      }}
                    />
                  </div>
                </div>

                {/* Actions */}
                {(role === 'admin' || role === 'doctor') && (
                  <div className="flex gap-2 pt-2">
                    {!alert.authority_notified ? (
                      <button onClick={() => handleNotify(alert.id)} className="btn btn-sm" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger-light)' }}>
                        <Bell className="w-4 h-4" /> Notify Authorities
                      </button>
                    ) : (
                      <span className="badge badge-accent">
                        <CheckCircle className="w-3 h-3" /> Authorities Notified
                      </span>
                    )}
                    {role === 'admin' && (
                      <button onClick={() => handleResolve(alert.id)} className="btn btn-ghost btn-sm">
                        <CheckCircle className="w-4 h-4" /> Mark Resolved
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolved Alerts */}
      {resolved.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              Resolved Alerts
            </h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {resolved.map(alert => (
              <div key={alert.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ color: 'var(--color-text)' }}>{alert.symptom}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {alert.case_count} cases — Resolved {new Date(alert.resolved_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="badge badge-accent">Resolved</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
