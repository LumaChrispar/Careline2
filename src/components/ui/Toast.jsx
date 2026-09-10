import useUiStore from '../../stores/uiStore'
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react'

const icons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
}

const colors = {
  success: 'var(--color-accent)',
  warning: 'var(--color-warning)',
  error: 'var(--color-danger)',
  info: 'var(--color-primary)',
}

export default function ToastContainer() {
  const { toasts } = useUiStore()

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3" style={{ maxWidth: '380px' }}>
      {toasts.map(toast => {
        const Icon = icons[toast.type] || icons.info
        const color = colors[toast.type] || colors.info
        return (
          <div
            key={toast.id}
            className="flex items-start gap-3 px-4 py-3 rounded-xl glass-card animate-slide-right"
            style={{ 
              borderLeft: `3px solid ${color}`,
              background: 'rgba(2, 22, 74, 0.95)'
            }}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color }} />
            <p className="text-sm flex-1" style={{ color: 'var(--color-text)' }}>{toast.message}</p>
          </div>
        )
      })}
    </div>
  )
}
