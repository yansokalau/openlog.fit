import { useEffect, useRef, useState } from 'react'
import { activeDayLabel, dateKey, dayLabel, recentDays } from '../lib/utils'
import { ChevronDownIcon } from './icons'
import { Button, Label } from './ui'

/**
 * Sticky bar naming the day entries land in. It stays on screen because
 * backdating is a mode, and a mode you can scroll away from is a mode you
 * forget you are in — hence the accent fill whenever it is not today.
 */
export function DateBar({
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
    <div ref={ref} className="sticky top-0 z-20 -mx-4 mb-6 px-4">
      <div
        className={`flex items-center gap-2 border-2 px-3 py-2 ${
          isToday ? 'border-ink bg-paper' : 'border-accent-ink bg-accent text-accent-ink'
        }`}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-label="Change the day being logged into"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 font-bold uppercase tracking-[0.12em] underline-offset-4 hover:underline"
        >
          {activeDayLabel(date, isToday)}
          <ChevronDownIcon size={16} />
        </button>

        {!isToday && (
          <button
            type="button"
            onClick={() => choose(null)}
            className="ml-auto border-2 border-current px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider hover:bg-accent-ink hover:text-accent"
          >
            Back to today
          </button>
        )}
      </div>

      {open && (
        <div className="border-x-2 border-b-2 border-ink bg-paper p-3">
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
