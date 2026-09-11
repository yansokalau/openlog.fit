import type { Field } from './types'
import { unitFor, type UnitSystem } from './units'

/**
 * The closed vocabulary of measurable things. A kind carries everything the
 * logger needs to render a purpose-built stepper for it, so adding "pace" or
 * "heart rate" later is a row here rather than a new screen.
 */
export type FieldKind = 'weight' | 'reps' | 'length' | 'distance' | 'duration' | 'count' | 'rpe'

export type UnitSpec = {
  /** Canonical units in one of this unit, e.g. 1 km = 1000 m. */
  factor: number
  /** Stepper increment, expressed in this unit. */
  step: number
  decimals: number
  /** Shown after the number; empty for unitless kinds. */
  suffix: string
  /** Used when the value is exactly 1, e.g. "1 rep". */
  singular?: string
  /**
   * Granularity for contexts that need it: a barbell moves in 2.5 kg jumps,
   * a bathroom scale in 0.1. Selected per field by `Field.grain`.
   */
  fine?: { step: number; decimals: number }
}

export type KindSpec = {
  label: string
  /** Unit every value of this kind is stored in. */
  canonical: string
  units: Record<string, UnitSpec>
}

export const FIELD_KINDS: Record<FieldKind, KindSpec> = {
  weight: {
    label: 'Weight',
    canonical: 'kg',
    units: {
      kg: { factor: 1, step: 2.5, decimals: 1, suffix: 'kg', fine: { step: 0.1, decimals: 2 } },
      lb: {
        factor: 0.45359237,
        step: 5,
        decimals: 1,
        suffix: 'lb',
        fine: { step: 0.2, decimals: 2 },
      },
    },
  },
  reps: {
    label: 'Reps',
    canonical: 'reps',
    units: { reps: { factor: 1, step: 1, decimals: 0, suffix: 'reps', singular: 'rep' } },
  },
  length: {
    label: 'Length',
    canonical: 'cm',
    units: {
      cm: { factor: 1, step: 0.5, decimals: 1, suffix: 'cm' },
      in: { factor: 2.54, step: 0.25, decimals: 2, suffix: 'in' },
    },
  },
  distance: {
    label: 'Distance',
    canonical: 'm',
    units: {
      km: { factor: 1000, step: 0.5, decimals: 2, suffix: 'km' },
      m: { factor: 1, step: 10, decimals: 0, suffix: 'm' },
      mi: { factor: 1609.344, step: 0.25, decimals: 2, suffix: 'mi' },
    },
  },
  duration: {
    label: 'Time',
    canonical: 's',
    units: {
      min: { factor: 60, step: 1, decimals: 1, suffix: 'min' },
      s: { factor: 1, step: 15, decimals: 0, suffix: 's' },
    },
  },
  count: {
    label: 'Count',
    canonical: 'x',
    units: { x: { factor: 1, step: 1, decimals: 0, suffix: '' } },
  },
  rpe: {
    label: 'RPE',
    canonical: 'rpe',
    units: { rpe: { factor: 1, step: 0.5, decimals: 1, suffix: 'RPE' } },
  },
}

export const FIELD_KIND_LIST = Object.keys(FIELD_KINDS) as FieldKind[]

export function unitsOf(kind: FieldKind): string[] {
  return Object.keys(FIELD_KINDS[kind].units)
}

export function defaultUnit(kind: FieldKind): string {
  return unitsOf(kind)[0]
}

export function unitSpec(field: Field, system: UnitSystem): UnitSpec {
  const kind = FIELD_KINDS[field.kind]
  const unit = field.unit ?? unitFor(field.kind, system)
  const spec = kind.units[unit] ?? kind.units[defaultUnit(field.kind)]
  return field.grain === 'fine' && spec.fine ? { ...spec, ...spec.fine } : spec
}

/** What the stepper shows for a stored value. */
export function toDisplay(field: Field, canonical: number, system: UnitSystem): number {
  const { factor, decimals } = unitSpec(field, system)
  return round(canonical / factor, decimals)
}

/** What gets stored for a typed value. */
export function toCanonical(field: Field, display: number, system: UnitSystem): number {
  // Kept to six decimals so a kg→lb→kg round trip doesn't accumulate noise.
  return round(display * unitSpec(field, system).factor, 6)
}

/**
 * "Weight (kg)", "Reps", or the tracker's own name when it logs a single value
 * — "Waist (cm)" reads better than "Length (cm)".
 */
export function fieldLabel(field: Field, system: UnitSystem, fallback?: string): string {
  const name = field.label.trim() || fallback?.trim() || FIELD_KINDS[field.kind].label
  const { suffix } = unitSpec(field, system)
  const redundant = suffix.toLowerCase() === name.toLowerCase()
  return suffix && !redundant ? `${name} (${suffix})` : name
}

/** "60 kg", "8 reps", "5.5 km" — the number as displayed, with its unit. */
export function formatValue(field: Field, canonical: number, system: UnitSystem): string {
  const spec = unitSpec(field, system)
  const display = toDisplay(field, canonical, system)
  const suffix = display === 1 ? (spec.singular ?? spec.suffix) : spec.suffix
  return suffix ? `${trim(display)} ${suffix}` : trim(display)
}

/**
 * "62.5 kg × 6" for one entry, "60–62.5 kg × 6–8" for a whole session — the
 * dense form used wherever sets share a line. A trailing rep or rep-like count
 * is a multiplier rather than a measurement, so it loses its unit; anything
 * else keeps the normal form ("5 km · 26 min").
 *
 * Values arrive grouped per field, so one entry and a range of them format
 * through the same path and cannot drift apart.
 */
export function formatCompact(
  fields: Field[],
  grouped: Record<string, number[]>,
  system: UnitSystem,
): string {
  const last = fields[fields.length - 1]
  const tail = grouped[last.key] ?? []
  const multiplier =
    fields.length > 1 && (last.kind === 'reps' || last.kind === 'count') && tail.length > 0

  const head = (multiplier ? fields.slice(0, -1) : fields)
    .filter((field) => (grouped[field.key] ?? []).length > 0)
    .map((field) => formatRange(field, grouped[field.key], system))
    .join(' · ')

  if (!multiplier) return head

  const shown = tail.map((value) => toDisplay(last, value, system))
  const min = Math.min(...shown)
  const max = Math.max(...shown)

  return `${head} × ${min === max ? trim(min) : `${trim(min)}–${trim(max)}`}`
}

/** The single-entry form: one value per field rather than a range. */
export function formatEntry(
  fields: Field[],
  values: Record<string, number>,
  system: UnitSystem,
): string {
  const grouped = Object.fromEntries(Object.entries(values).map(([key, v]) => [key, [v]]))
  return formatCompact(fields, grouped, system)
}

/** "55–60 kg" when a session varied, "60 kg" when it didn't. */
export function formatRange(field: Field, values: number[], system: UnitSystem): string {
  const spec = unitSpec(field, system)
  const min = toDisplay(field, Math.min(...values), system)
  const max = toDisplay(field, Math.max(...values), system)

  const value = min === max ? trim(min) : `${trim(min)}–${trim(max)}`
  const suffix = min === max && min === 1 ? (spec.singular ?? spec.suffix) : spec.suffix

  return suffix ? `${value} ${suffix}` : value
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** Drops trailing zeros: 60 -> "60", 62.5 -> "62.5". */
function trim(value: number): string {
  return String(value)
}
