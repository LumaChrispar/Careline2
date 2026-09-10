import Dexie from 'dexie'

export const db = new Dexie('ecomedik')

db.version(1).stores({
  patients: 'id, first_name, last_name, phone, facility_id, created_at, synced',
  visits: 'id, patient_id, date, facility_id, synced',
  lab_results: 'id, visit_id, patient_id, test_type, uploaded_at, synced',
  outbreak_alerts: 'id, symptom, facility_id, triggered_at',
  sync_queue: '++id, table_name, record_id, action, created_at',
})
