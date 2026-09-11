import type { Theme } from '../lib/theme'
import { MoonIcon, SunIcon } from './icons'

export function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  return (
    <div className="flex border-2 border-ink" role="group" aria-label="Theme">
      {(['light', 'dark'] as Theme[]).map((option) => {
        const active = theme === option
        return (
          <button
            key={option}
            type="button"
            aria-label={`${option} theme`}
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={`flex h-9 w-10 items-center justify-center transition-colors ${
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
