export default function StatCard({ icon: Icon, label, value, trend, color = 'var(--color-primary)' }) {
  return (
    <div
      className="glass-card p-6 lg:p-7 flex items-start gap-5 group hover:scale-[1.02] transition-transform duration-200"
    >
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15`, color, boxShadow: `0 8px 24px ${color}20` }}
      >
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        <p className="text-2xl font-bold mt-1" style={{ color: 'var(--color-text)' }}>{value}</p>
        {trend && (
          <p className="text-xs mt-1" style={{ color: trend.startsWith('+') ? 'var(--color-accent)' : 'var(--color-danger-light)' }}>
            {trend}
          </p>
        )}
      </div>
    </div>
  )
}
