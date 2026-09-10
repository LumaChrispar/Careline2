import Dexie from 'dexie'
import { command } from './careline'
import { supabase } from './supabase'
const intake = new Dexie('careline-pending-intake')
intake.version(1).stores({ drafts: 'id, owner, facility, created_at' })
const keyName = owner => 'careline-intake-key:' + owner
async function key(owner, create = false) {
  let bytes = sessionStorage.getItem(keyName(owner))
  if (!bytes && create) {
    bytes = JSON.stringify([...crypto.getRandomValues(new Uint8Array(32))])
    sessionStorage.setItem(keyName(owner), bytes)
  }
  if (!bytes) throw new Error('The key for this draft was lost when its browser session closed. Discard it and register again from your source notes.')
  return crypto.subtle.importKey('raw', new Uint8Array(JSON.parse(bytes)), 'AES-GCM', false, ['encrypt','decrypt'])
}
export const pendingCount = owner => intake.drafts.where('owner').equals(owner).count()
export const pendingDrafts = owner => intake.drafts.where('owner').equals(owner).sortBy('created_at')
export async function queueIntake(owner, facility, payload) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(owner, true), new TextEncoder().encode(JSON.stringify(payload)))
  await intake.drafts.put({ id: payload.id, owner, facility, iv: [...iv], encrypted: [...new Uint8Array(encrypted)], created_at: new Date().toISOString(), error: null })
}
export async function discardDraft(id, owner) {
  const draft = await intake.drafts.get(id)
  if (draft?.owner === owner) await intake.drafts.delete(id)
}
let syncing = false
export async function syncIntake(owner) {
  if (syncing || !navigator.onLine) return
  syncing = true
  try {
    for (const draft of await pendingDrafts(owner)) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id !== owner) break
      try {
        const decrypted = await crypto.subtle.decrypt({ name:'AES-GCM', iv:new Uint8Array(draft.iv) }, await key(owner), new Uint8Array(draft.encrypted))
        await command('register', draft.facility, JSON.parse(new TextDecoder().decode(decrypted)))
        await intake.drafts.delete(draft.id)
      } catch (error) { await intake.drafts.update(draft.id, { error: error.message }) }
    }
  } finally { syncing = false; window.dispatchEvent(new Event('careline:refresh')) }
}
