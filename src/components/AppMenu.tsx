import { useEffect, useRef, useState } from 'react'
import { buildBackup, download, parseBackup, type Backup } from '../lib/backup'
import type { Entry, Group, Tracker } from '../lib/types'
import type { Theme } from '../lib/theme'
import type { UnitSystem } from '../lib/units'
import { DotsIcon } from './icons'
import { ThemeToggle } from './ThemeToggle'
import { UnitToggle } from './UnitToggle'
import { Button, Label } from './ui'

type Data = { groups: Group[]; trackers: Tracker[]; entries: Entry[] }

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

/**
 * Settings and whole-database actions, out of the header so it stays a
 * wordmark and one button however many actions land here later.
 */
export function AppMenu({
  theme,
  onTheme,
  system,
  onSystem,
  snapshot,
  onReplaceAll,
}: {
  theme: Theme
  onTheme: (theme: Theme) => void
  system: UnitSystem
  onSystem: (system: UnitSystem) => void
  snapshot: () => Data
  onReplaceAll: (data: Data) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<Backup | null>(null)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ref = useRef<HTMLDivElement>(null)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  // Nothing half-finished should be waiting when the menu is opened again.
  const close = () => {
    setOpen(false)
    setPending(null)
    setClearing(false)
    setError(null)
  }

  const chooseFile = async (chosen: File) => {
    const result = parseBackup(await chosen.text())
    if ('error' in result) {
      setError(result.error)
      setPending(null)
      return
    }
    setError(null)
    setPending(result.data)
  }

  const counts = snapshot()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className="flex h-9 w-10 items-center justify-center border-2 border-ink text-ink hover:bg-ink hover:text-paper"
      >
        <DotsIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-72 space-y-4 border-2 border-ink bg-paper p-3 shadow-[4px_4px_0_0_var(--ink)]">
          <div>
            <Label>Display</Label>
            <div className="flex gap-2">
              <UnitToggle system={system} onChange={onSystem} />
              <ThemeToggle theme={theme} onChange={onTheme} />
            </div>
          </div>

          <div className="space-y-2 border-t-2 border-ink pt-3">
            <Button
              size="md"
              className="w-full"
              onClick={() => download(buildBackup(snapshot()))}
            >
              Export backup
            </Button>

            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const chosen = e.target.files?.[0]
                // Cleared so choosing the same file twice still fires a change.
                e.target.value = ''
                if (chosen) void chooseFile(chosen)
              }}
            />
            <Button size="md" className="w-full" onClick={() => file.current?.click()}>
              Import backup
            </Button>

            {pending && (
              <div className="space-y-2 border-2 border-ink p-2">
                <p className="text-sm">
                  Replace everything with {plural(pending.groups.length, 'group')},{' '}
                  {plural(pending.trackers.length, 'tracker')} and{' '}
                  {plural(pending.entries.length, 'entry', 'entries')}?
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="solid"
                    className="flex-1"
                    onClick={async () => {
                      await onReplaceAll({
                        groups: pending.groups,
                        trackers: pending.trackers,
                        entries: pending.entries,
                      })
                      close()
                    }}
                  >
                    Replace
                  </Button>
                  <Button size="sm" onClick={() => setPending(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-ink/60">{error}</p>}

            {clearing ? (
              <div className="space-y-2 border-2 border-ink p-2">
                <p className="text-sm">
                  Delete the whole plan and all {counts.entries.length} entries? Export first
                  — this cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="solid"
                    className="flex-1"
                    onClick={async () => {
                      await onReplaceAll({ groups: [], trackers: [], entries: [] })
                      close()
                    }}
                  >
                    Clear
                  </Button>
                  <Button size="sm" onClick={() => setClearing(false)}>
                    Keep
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="md" className="w-full" onClick={() => setClearing(true)}>
                Clear everything
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
