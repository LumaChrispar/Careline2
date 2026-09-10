import { Users, FlaskConical, ShieldAlert, Wifi, Clock, ArrowUpRight } from 'lucide-react'
import useAuthStore from '../stores/authStore'
import useUiStore from '../stores/uiStore'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import StatCard from '../components/ui/StatCard'
import usePatientStore from '../stores/patientStore'
import useLabStore from '../stores/labStore'
import useOutbreakStore from '../stores/outbreakStore'

const getSymptomFrequency = (visits) => {
  const counts = {}
  visits.forEach(v => {
    (v.symptoms || []).forEach(s => {
      counts[s] = (counts[s] || 0) + 1
    })
  })
  return Object.entries(counts).map(([name, count]) => ({ name, count }))
}
const chartColors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4', '#84cc16', '#e11d48']

export default function DashboardPage() {
  const { user, role } = useAuthStore()
  const online = useUiStore(s => s.isOnline)
  const { patients, visits } = usePatientStore()
  const { labResults, getPendingResults, notifications } = useLabStore()
  const { getActiveAlerts } = useOutbreakStore()

  const activeAlerts = getActiveAlerts()
  const pendingLabs = getPendingResults()
  const symptomData = getSymptomFrequency(visits.filter(v => new Date(v.date).getTime() >= Date.now() - 30 * 86400000))

  const recentPatients = [...patients]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8)

  return (
    <div className="space-y-8">
      <section className="workspace-welcome">
        <div><p className="eyebrow">YOUR CARE WORKSPACE</p><h1>Welcome back{user?.name ? ', ' + user.name.split(' ')[0] : ''}.</h1><p>Keep patient care moving. Find a record, review results, or start an intake.</p></div>
        <Link className="btn btn-primary" to={role === 'labtech' ? '/lab/upload' : '/patients/new'}>{role === 'labtech' ? 'Add lab result' : 'Register patient'} <ArrowUpRight size={16} /></Link>
      </section>
      {/* Outbreak Banner */}
      {activeAlerts.length > 0 && (
        <div
          className="rounded-xl p-4 flex items-center gap-4 animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.1))',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
            <ShieldAlert className="w-5 h-5" style={{ color: 'var(--color-danger-light)' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-danger-light)' }}>
              ⚠️ Active Outbreak Alert  {activeAlerts[0].symptom}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {activeAlerts[0].case_count} cases detected in the last {activeAlerts[0].window_days} days
            </p>
          </div>
          <Link to="/outbreak" className="btn btn-sm" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--color-danger-light)' }}>
            View Details <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Total Patients" value={patients.length} trend={`${patients.filter(p => new Date(p.created_at).getTime() >= Date.now() - 7 * 86400000).length} added this week`} color="var(--color-primary)" />
        <StatCard icon={FlaskConical} label="Pending Lab Results" value={pendingLabs.length} color="var(--color-warning)" />
        <StatCard icon={ShieldAlert} label="Active Alerts" value={activeAlerts.length} color="var(--color-danger)" />
        <StatCard icon={Wifi} label="Connection" value={online ? "Online" : "Offline"} trend={online ? "Connected to workspace" : "Reconnect to save"} color="var(--color-accent)" />
      </div>

      {/* Charts + Recent Patients */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Symptom Chart */}
        <div className="glass-card p-6 lg:p-8 lg:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              Symptom Frequency
              <span className="text-xs font-normal ml-2" style={{ color: 'var(--color-text-muted)' }}>Last 30 days</span>
            </h3>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={symptomData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.5)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(51, 65, 85, 0.5)' }}
                  tickLine={false}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontSize: '13px',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {symptomData.map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Notification Feed */}
        <div className="glass-card p-6 lg:p-8 lg:col-span-2">
          <h3 className="text-base font-semibold mb-6" style={{ color: 'var(--color-text)' }}>
            Recent Notifications
          </h3>
          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 280 }}>
            {notifications.slice(0, 6).map(n => (
              <div
                key={n.id}
                className="flex items-start gap-3 p-3 rounded-lg transition-colors duration-200"
                style={{ background: n.read ? 'solid' : 'rgba(2, 111, 162, 0.05)', border: '1px solid rgba(51, 65, 85, 0.3)' }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: n.read ? 'var(--color-surface-lighter)' : 'var(--color-primary)' }} />
                <div>
                  <p className="text-sm" style={{ color: 'var(--color-text)' }}>{n.message}</p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(n.time).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Patients Table */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-8 py-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Recent Patients</h3>
          <Link to="/patients" className="btn btn-ghost btn-sm">
            View All <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Region</th>
                <th>Registered</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentPatients.map(p => (
                <tr key={p.id}>
                  <td>
                    <span className="badge badge-primary">{p.id}</span>
                  </td>
                  <td className="font-medium" style={{ color: 'var(--color-text)' }}>
                    {p.first_name} {p.last_name}
                  </td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{p.gender}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{p.region}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <Link to={`/patients/${p.id}`} className="btn btn-ghost btn-sm">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
