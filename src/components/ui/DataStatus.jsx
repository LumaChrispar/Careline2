import usePatientStore from '../../stores/patientStore'
import useLabStore from '../../stores/labStore'
import useUiStore from '../../stores/uiStore'

export default function DataStatus() {
  const patients = usePatientStore()
  const labs = useLabStore()
  const online = useUiStore(s => s.isOnline)
  const error = patients.error || labs.error
  if (!online) return <div className="workspace-notice" role="status">You’re offline. Reconnect before saving or refreshing records.</div>
  if (error) return <div className="workspace-notice" role="alert"><span>Some records could not be loaded. {error}</span><button className="btn btn-ghost btn-sm" onClick={() => { patients.fetchData(); labs.fetchData() }}>Try again</button></div>
  if (patients.isLoading || labs.isLoading) return <div className="workspace-notice" role="status">Refreshing records…</div>
  return null
}
