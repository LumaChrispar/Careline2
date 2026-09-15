export const taskClosed = task => ['completed', 'cancelled'].includes(task.status)
export function taskBucket(task, now = new Date()) {
  if (taskClosed(task)) return 'closed'
  if (task.priority === 'urgent' || new Date(task.due_at) < now) return 'urgent'
  if (task.status === 'waiting') return 'waiting'
  return new Date(task.due_at).toDateString() === now.toDateString() ? 'today' : 'upcoming'
}
export const taskGroups = [['urgent', 'Urgent & overdue'], ['today', 'Today'], ['upcoming', 'Upcoming'], ['waiting', 'Waiting'], ['closed', 'Closed']]
