import type { Field, LogStyle, Tracker } from './types'

export type PresetId =
  | 'strength'
  | 'reps'
  | 'hold'
  | 'cardio'
  | 'measure'
  | 'bodyweight'
  | 'count'

export type Preset = {
  label: string
  /** Shown under the picker so the choice needs no explanation. */
  hint: string
  /** Placeholder for the target field — what aiming at this looks like. */
  targetHint: string
  /** Placeholder for the name field, so the example matches the type. */
  nameHint: string
  /** Placeholder for an alternative's name. */
  altHint: string
  logStyle: LogStyle
  fields: Field[]
}

/**
 * What a tracker logs, chosen once when it is created. Field keys are a stable
 * API — every stored entry is keyed by them — so a preset may gain a field, but
 * an existing key must never be renamed or repurposed.
 */
export const PRESETS: Record<PresetId, Preset> = {
  strength: {
    label: 'Strength',
    hint: 'Weight × reps, several sets — bench press, squat, curl',
    nameHint: 'Bench press',
    altHint: 'Dumbbell press',
    targetHint: '3x6-8, or 100 kg',
    logStyle: 'sets',
    fields: [
      { key: 'weight', kind: 'weight', label: '' },
      { key: 'reps', kind: 'reps', label: '' },
    ],
  },
  reps: {
    label: 'Reps only',
    hint: 'Reps, several sets — pull-ups, push-ups, dips',
    nameHint: 'Pull-ups',
    altHint: 'Assisted pull-ups',
    targetHint: '3x8-12',
    logStyle: 'sets',
    fields: [{ key: 'reps', kind: 'reps', label: '' }],
  },
  hold: {
    label: 'Hold',
    hint: 'Time held, several sets — plank, dead hang, wall sit',
    nameHint: 'Plank',
    altHint: 'Knee plank',
    targetHint: '3x60 s',
    logStyle: 'sets',
    // Seconds, not the kind's default minutes: holds are counted in seconds.
    fields: [{ key: 'duration', kind: 'duration', label: '', unit: 's' }],
  },
  cardio: {
    label: 'Cardio',
    hint: 'Distance and time, once — run, row, ride, swim',
    nameHint: 'Morning run',
    altHint: 'Treadmill run',
    targetHint: '5 km in 25 min',
    logStyle: 'single',
    fields: [
      { key: 'distance', kind: 'distance', label: '' },
      { key: 'duration', kind: 'duration', label: '' },
    ],
  },
  measure: {
    label: 'Body measure',
    hint: 'One length, once — waist, chest, arm',
    nameHint: 'Waist',
    altHint: 'Waist, morning',
    targetHint: 'under 82 cm',
    logStyle: 'single',
    fields: [{ key: 'length', kind: 'length', label: '' }],
  },
  bodyweight: {
    label: 'Bodyweight',
    hint: 'One weight, once — the scale',
    nameHint: 'Bodyweight',
    altHint: 'Gym scale',
    targetHint: '75 kg',
    logStyle: 'single',
    // A scale reads 66.25, not 66.3 — and never moves in 2.5 kg jumps.
    fields: [{ key: 'weight', kind: 'weight', label: '', grain: 'fine' }],
  },
  count: {
    label: 'Count',
    hint: 'One number, once — steps, routes climbed, sessions',
    nameHint: 'Routes climbed',
    altHint: 'Indoor routes',
    targetHint: '20 routes',
    logStyle: 'single',
    fields: [{ key: 'count', kind: 'count', label: '' }],
  },
}

export const PRESET_LIST = Object.keys(PRESETS) as PresetId[]

export function presetOf(tracker: Tracker): Preset {
  return PRESETS[tracker.preset] ?? PRESETS.strength
}
