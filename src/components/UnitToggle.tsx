import type { UnitSystem } from '../lib/units'

const LABELS: Record<UnitSystem, string> = {
  metric: 'kg·cm',
  imperial: 'lb·in',
}

/**
 * Switches every dimension at once. Values are stored canonically, so this only
 * changes how they are shown — nothing logged is rewritten.
 */
export function UnitToggle({
  system,
  onChange,
}: {
  system: UnitSystem
  onChange: (system: UnitSystem) => void
}) {
  // Height on the group, not the buttons — see ThemeToggle.
  return (
    <div className="flex h-9 border-2 border-ink" role="group" aria-label="Units">
      {(['metric', 'imperial'] as UnitSystem[]).map((option) => {
        const active = system === option
        return (
          <button
            key={option}
            type="button"
            aria-label={`${option} units`}
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={`h-full px-2 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              active ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/10'
            }`}
          >
            {LABELS[option]}
          </button>
        )
      })}
    </div>
  )
}
