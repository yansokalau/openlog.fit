import { useEffect, useRef, useState } from 'react'
import { activeDayLabel, dateKey, dayLabel, recentDays } from '../lib/utils'
import { ChevronDownIcon } from './icons'
import { Button, Label } from './ui'

/**
 * Names the day entries land in, and opens a panel to change it. It sits in the
 * sticky header because backdating is a mode, and a mode you can scroll away
 * from is a mode you forget you are in — hence the accent fill when it is not
 * today. The panel overlays rather than expands, so opening it never shifts the
 * plan underneath.
 */
export function DatePicker({
  date,
  isToday,
  onChange,
}: {
  date: string
  isToday: boolean
  onChange: (date: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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

  const choose = (next: string | null) => {
    onChange(next)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Change the day being logged into"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 items-center gap-1 border-2 px-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
          isToday
            ? 'border-ink text-ink hover:bg-ink hover:text-paper'
            : 'border-accent-ink bg-accent text-accent-ink'
        }`}
      >
        {activeDayLabel(date, isToday)}
        <ChevronDownIcon size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-64 border-2 border-ink bg-paper p-3 shadow-[4px_4px_0_0_var(--ink)]">
          <Label>Recent</Label>
          <div className="mb-3 flex flex-wrap gap-2">
            {recentDays(7).map((day) => (
              <Button
                key={day}
                size="sm"
                variant={day === date ? 'solid' : 'outline'}
                onClick={() => choose(day === dateKey() ? null : day)}
              >
                {dayLabel(day)}
              </Button>
            ))}
          </div>

          <label className="block">
            <Label>Or pick a day</Label>
            <input
              type="date"
              value={date}
              max={dateKey()}
              aria-label="Pick a day"
              onChange={(e) => e.target.value && choose(e.target.value)}
              className="h-11 w-full border-2 border-ink px-3 text-sm"
            />
          </label>
        </div>
      )}
    </div>
  )
}
