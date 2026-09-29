import type { Theme } from '../lib/theme'
import { MoonIcon, SunIcon } from './icons'

export function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  // Height on the group, not the buttons: the border sits outside them, so
  // sizing each one would make the pair taller than the h-9 controls beside it
  // in the header.
  return (
    <div className="flex h-9 border-2 border-ink" role="group" aria-label="Theme">
      {(['light', 'dark'] as Theme[]).map((option) => {
        const active = theme === option
        return (
          <button
            key={option}
            type="button"
            aria-label={`${option} theme`}
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={`flex h-full w-10 items-center justify-center transition-colors ${
              active ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/10'
            }`}
          >
            {option === 'light' ? <SunIcon /> : <MoonIcon />}
          </button>
        )
      })}
    </div>
  )
}
