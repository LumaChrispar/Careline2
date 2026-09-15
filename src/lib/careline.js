import { supabase } from './supabase'
export function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  const national = digits.startsWith('00237') ? digits.slice(5) : digits.startsWith('237') ? digits.slice(3) : digits
  if (!/^[2368]\d{8}$/.test(national)) throw new Error('Enter a Cameroon number: +237 followed by 9 digits.')
  return '+' + '237' + national
}
export async function signIn(identifier, password) {
  if (identifier.includes('@')) return supabase.auth.signInWithPassword({ email: identifier.trim(), password })
  const phone = normalizePhone(identifier)
  const response = await supabase.auth.signInWithPassword({ phone, password })
  if (!response.error || response.error.code !== 'invalid_credentials') return response
  for (const digits of [phone.slice(1), phone.slice(4)]) {
    const legacy = await supabase.auth.signInWithPassword({ email: digits + '@patient.eco-medic.local', password })
    if (!legacy.error || legacy.error.code !== 'invalid_credentials') return legacy
  }
  return response
}
export async function rpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw new Error(error.message)
  return data
}
const coordinationActions = new Set(['concern_add','concern_review','plan_save','plan_publish','plan_acknowledge','task_create','task_update','lab_escalate'])
export const command = (action, f, payload) => rpc(['assign_doctor','referral_assign','revoke_invitation'].includes(action) ? 'careline_staff_care' : coordinationActions.has(action) ? 'careline_coordination' : 'careline_command', { action, f, payload })
export const money = value => Number(value || 0).toLocaleString('fr-CM') + ' FCFA'
export const fullName = p => p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : ''
export const isCurrentPrescription = (p, today = new Date().toISOString().slice(0, 10)) => p.status === 'active' && p.starts_on <= today && (!p.ends_on || p.ends_on >= today)
export function ageLabel(date) {
  if (!date) return 'Unknown'
  const birthday = new Date(date + 'T12:00:00'), now = new Date()
  let age = now.getFullYear() - birthday.getFullYear()
  if (now.getMonth() < birthday.getMonth() || (now.getMonth() === birthday.getMonth() && now.getDate() < birthday.getDate())) age--
  return age < 0 || !Number.isFinite(age) ? 'Unknown' : String(age)
}
export async function documentUrl(result) {
  const path = result.storage_path || result.file_url?.split('/storage/v1/object/public/LAB_result/')[1]
  if (!path) throw new Error('This legacy attachment needs migration to private storage. Ask your facility for a copy.')
  const { data, error } = await supabase.storage.from('LAB_result').createSignedUrl(path, 120)
  if (error) throw error
  return data.signedUrl
}
