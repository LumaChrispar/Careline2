// Apply the same full-name search in directories and patient pickers.
export function searchPatients(query, value) {
  const clean = String(value || '').replace(/[^\p{L}\p{N} +@.-]/gu, '').trim()
  if (!clean) return query
  const parts = clean.split(/\s+/)
  if (parts.length > 1) {
    return query.ilike('first_name', '%' + parts[0] + '%').ilike('last_name', '%' + parts.slice(1).join(' ') + '%')
  }
  return query.or(['first_name', 'last_name', 'phone', 'id'].map(field => field + '.ilike.%' + clean + '%').join(','))
}
