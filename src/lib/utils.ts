import { formatCompact } from './fields'
import type { Entry, Field } from './types'
import type { UnitSystem } from './units'

export function uid(): string {
  // randomUUID needs a secure context, which http://<lan-ip> — the fastest way
  // to try the app on a phone — is not. getRandomValues has no such limit.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 1
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Local calendar day as "YYYY-MM-DD". */
export function dateKey(at: number = Date.now()): string {
  const d = new Date(at)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export type SessionSummary = {
  date: string
  entries: Entry[]
  /** The whole session in the dense form: "60–62.5 kg × 6–8". */
  summary: string
}

/**
 * Summary of the most recent day the given entries were logged on. Entries are
 * expected to belong to one tracker, and usually to one variant.
 */
export function lastSession(
  entries: Entry[],
  fields: Field[],
  system: UnitSystem,
): SessionSummary | null {
  if (entries.length === 0) return null

  let date = entries[0].date
  for (const entry of entries) if (entry.date > date) date = entry.date

  const session = entries.filter((e) => e.date === date).sort((a, b) => a.at - b.at)

  const grouped = Object.fromEntries(
    fields.map((field) => [
      field.key,
      session
        .map((entry) => entry.values[field.key])
        .filter((value): value is number => typeof value === 'number'),
    ]),
  )

  return { date, entries: session, summary: formatCompact(fields, grouped, system) }
}

/** The last `count` days as "YYYY-MM-DD", today first. */
export function recentDays(count: number): string[] {
  const days: string[] = []
  for (let i = 0; i < count; i += 1) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(dateKey(d.getTime()))
  }
  return days
}

/** "Today", "Yesterday", or a weekday like "Sat 6 Mar". */
export function dayLabel(date: string): string {
  const today = dateKey()
  if (date === today) return 'Today'

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (date === dateKey(yesterday.getTime())) return 'Yesterday'

  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/**
 * What to call the day being logged into. Relative wording is only safe while
 * that day *is* today — once a past day is selected, "today" and "yesterday"
 * stop having an obvious referent, so an absolute date is used instead.
 */
export function activeDayLabel(date: string, isToday: boolean): string {
  return isToday ? 'Today' : shortDate(date)
}

/**
 * "Sep 7", or "Nov 14, 2025" once the year differs — without it a session from
 * two winters ago reads as one from this one.
 */
export function shortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const sameYear = y === new Date().getFullYear()
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/**
 * "9d ago", "3w ago", "7mo ago", "2y ago" — how long since a session, counted
 * in whole calendar days between midnights rather than elapsed hours, so a
 * session at 23:00 last night reads as 1d this morning.
 *
 * The unit coarsens with age on purpose: the gap between 2 and 5 days changes
 * what you do today, the gap between 400 and 430 does not.
 */
export function daysAgo(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const then = new Date(y, m - 1, d)
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  // Rounded, so the ±1h a DST change adds cannot shift the count by a day.
  const days = Math.round((now.getTime() - then.getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days < 14) return `${days}d ago`

  const weeks = Math.round(days / 7)
  if (weeks < 9) return `${weeks}w ago`

  const months = Math.round(days / 30.44)
  if (months < 12) return `${months}mo ago`

  // Floored, never rounded up: 18 months is "1y ago", not "2y ago".
  return `${Math.max(1, Math.floor(days / 365.25))}y ago`
}

/** "Today", "Yesterday", or a short date like "12 Mar". */
export function relativeDay(date: string): string {
  const today = dateKey()
  if (date === today) return 'Today'

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (date === dateKey(yesterday.getTime())) return 'Yesterday'

  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/**
 * Archiving is a move, not a flag: a tracker goes into a group of this name,
 * created on demand, and keeps working exactly as it did. Matched by name
 * rather than by id so a group the user made themselves counts as the archive.
 */
export const ARCHIVE_GROUP = 'Archive'

export function isArchiveGroup(name: string): boolean {
  return name.trim().toLowerCase() === ARCHIVE_GROUP.toLowerCase()
}
