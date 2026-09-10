import { db } from './db'
import { supabase } from './supabase'

let isProcessing = false

export async function processSyncQueue() {
  if (isProcessing || !navigator.onLine) return
  isProcessing = true

  try {
    const queue = await db.sync_queue.orderBy('created_at').toArray()

    for (const item of queue) {
      try {
        const record = await db[item.table_name].get(item.record_id)
        if (!record) {
          await db.sync_queue.delete(item.id)
          continue
        }

        const { synced, ...data } = record

        if (item.action === 'insert') {
          const { error } = await supabase.from(item.table_name).upsert(data, { onConflict: 'id' })
          if (error) throw error
        } else if (item.action === 'update') {
          const { error } = await supabase.from(item.table_name).upsert(data, { onConflict: 'id' })
          if (error) throw error
        } else if (item.action === 'delete') {
          const { error } = await supabase.from(item.table_name).delete().eq('id', item.record_id)
          if (error) throw error
        }

        await db[item.table_name].update(item.record_id, { synced: 1 })
        await db.sync_queue.delete(item.id)
      } catch (err) {
        console.warn(`Sync failed for ${item.table_name}/${item.record_id}:`, err)
      }
    }
  } finally {
    isProcessing = false
  }
}

export function initSyncListeners() {
  window.addEventListener('online', () => {
    console.log('[Sync] Back online — processing queue')
    processSyncQueue()
  })

  // Process queue every 30 seconds when online
  setInterval(() => {
    if (navigator.onLine) processSyncQueue()
  }, 30000)
}

export async function addToSyncQueue(tableName, recordId, action = 'insert') {
  await db.sync_queue.add({
    table_name: tableName,
    record_id: recordId,
    action,
    created_at: new Date().toISOString(),
  })
  if (navigator.onLine) processSyncQueue()
}
