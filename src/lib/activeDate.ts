import { createContext, useContext, useEffect, useReducer } from 'react'
import { dateKey } from './utils'

/**
 * The day entries are logged into. `null` means "today" — kept as an absence
 * rather than a date so an app left open overnight rolls into the new day
 * instead of quietly stamping entries with yesterday.
 *
 * Deliberately never persisted: a sticky backdate is how you end up filing
 * Monday's session into last Tuesday.
 */
export type ActiveDate = {
  /** Resolved "YYYY-MM-DD" to log into. */
  date: string
  /** Whether that is the real today. */
  isToday: boolean
}

export const ActiveDateContext = createContext<ActiveDate>({
  date: dateKey(),
  isToday: true,
})

export function useActiveDate(): ActiveDate {
  return useContext(ActiveDateContext)
}

export function resolveActiveDate(picked: string | null): ActiveDate {
  const today = dateKey()
  const date = picked ?? today
  return { date, isToday: date === today }
}

/**
 * Resolves the active date and keeps it honest across midnight. Nothing
 * re-renders a quiet tab, so a session left open overnight would go on calling
 * yesterday "today" until the next tap.
 */
export function useResolvedActiveDate(picked: string | null): ActiveDate {
  const [, tick] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    const refresh = () => tick()
    const onVisible = () => document.visibilityState === 'visible' && refresh()

    // Returning to the app is when a rolled-over day is usually met — a phone
    // unlocked the morning after, a tab brought back to the front.
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)

    // And for a tab simply left in view, a timer to the next local midnight.
    let timer = 0
    const schedule = () => {
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      timer = window.setTimeout(() => {
        refresh()
        schedule()
      }, midnight.getTime() - Date.now() + 1_000)
    }
    schedule()

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
      window.clearTimeout(timer)
    }
  }, [])

  return resolveActiveDate(picked)
}
