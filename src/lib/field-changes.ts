/** One changed field from the pharmacy/doctor update API (`changes`). */
export interface FieldChange {
  field: string
  /** The field's Russian caption. */
  label: string
  old: string
  new: string
}

/** «Карточка … обновлена — Категория: C, Активность: —» — the message with
 * the changed fields appended (a cleared value shows as «—»); just the
 * message when nothing changed. */
export function withChanges(message: string, changes?: FieldChange[] | null) {
  if (!changes?.length) return message
  const list = changes
    .map((c) => `${c.label}: ${String(c.new ?? '').trim() || '—'}`)
    .join(', ')
  return `${message} — ${list}`
}
