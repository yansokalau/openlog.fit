import type { Entry, Group, Tracker } from './types'

/** Bumped only if the file layout itself changes, not when records do. */
const FORMAT = 1

export type Backup = {
  format: number
  app: 'openlog'
  exportedAt: string
  groups: Group[]
  trackers: Tracker[]
  entries: Entry[]
}

export function buildBackup(data: {
  groups: Group[]
  trackers: Tracker[]
  entries: Entry[]
}): Backup {
  return { format: FORMAT, app: 'openlog', exportedAt: new Date().toISOString(), ...data }
}

/** "openlog-2026-09-12.json" */
export function backupFilename(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `openlog-${now.getFullYear()}-${month}-${day}.json`
}

export function download(backup: Backup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = backupFilename()
  link.click()

  // Revoked on the next tick: Safari needs the URL to outlive the click.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Checks a parsed file well enough to refuse the obvious disasters — the wrong
 * app's export, a truncated download, an object where an array belongs. It does
 * not validate every field: an import replaces everything, so being certain the
 * shape is right matters more than being certain each value is.
 */
export function parseBackup(text: string): { data: Backup } | { error: string } {
  let value: unknown

  try {
    value = JSON.parse(text)
  } catch {
    return { error: 'That file is not valid JSON.' }
  }

  if (typeof value !== 'object' || value === null) return { error: 'That file is not a backup.' }

  const backup = value as Partial<Backup>
  if (backup.app !== 'openlog') return { error: 'That backup is from a different app.' }
  if (backup.format !== FORMAT) return { error: `Unsupported backup format (${backup.format}).` }

  const lists = [backup.groups, backup.trackers, backup.entries]
  if (!lists.every(Array.isArray)) return { error: 'That backup is missing data.' }

  const groups = backup.groups as Group[]
  const trackers = backup.trackers as Tracker[]
  const entries = backup.entries as Entry[]

  if (!groups.every((g) => g?.id && typeof g.name === 'string')) {
    return { error: 'That backup has damaged groups.' }
  }
  if (!trackers.every((t) => t?.id && t.groupId && Array.isArray(t.variants) && t.variants.length)) {
    return { error: 'That backup has damaged trackers.' }
  }
  if (!entries.every((e) => e?.id && e.trackerId && e.variantId && typeof e.date === 'string')) {
    return { error: 'That backup has damaged entries.' }
  }

  return { data: { ...(backup as Backup), groups, trackers, entries } }
}
