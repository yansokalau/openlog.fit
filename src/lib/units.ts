import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { FieldKind } from './fields'

export type UnitSystem = 'metric' | 'imperial'

/**
 * One display unit per kind per system. Values are always stored canonically,
 * so switching systems is free and never rewrites a logged entry.
 */
const UNITS: Record<FieldKind, Record<UnitSystem, string>> = {
  weight: { metric: 'kg', imperial: 'lb' },
  length: { metric: 'cm', imperial: 'in' },
  distance: { metric: 'km', imperial: 'mi' },
  duration: { metric: 'min', imperial: 'min' },
  reps: { metric: 'reps', imperial: 'reps' },
  count: { metric: 'x', imperial: 'x' },
  rpe: { metric: 'rpe', imperial: 'rpe' },
}

export function unitFor(kind: FieldKind, system: UnitSystem): string {
  return UNITS[kind][system]
}

const KEY = 'ol-units'

function initial(): UnitSystem {
  const stored = localStorage.getItem(KEY)
  if (stored === 'metric' || stored === 'imperial') return stored
  // Not guessed from the locale: the starting plan is written in kg, and a
  // browser set to en-US would otherwise open it in pounds. One tap to switch.
  return 'metric'
}

/**
 * A display preference, not data — so it lives in localStorage next to the
 * theme rather than in IndexedDB.
 */
export function useUnitSystem() {
  const [system, setSystem] = useState<UnitSystem>(initial)

  useEffect(() => {
    localStorage.setItem(KEY, system)
  }, [system])

  const toggle = useCallback(
    () => setSystem((s) => (s === 'metric' ? 'imperial' : 'metric')),
    [],
  )

  return { system, setSystem, toggle }
}

/** Ambient for the whole tree: every formatter needs it, nothing owns it. */
export const UnitContext = createContext<UnitSystem>('metric')

export function useUnits(): UnitSystem {
  return useContext(UnitContext)
}
