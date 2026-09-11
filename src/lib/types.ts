import type { FieldKind } from './fields'
import type { PresetId } from './presets'

/**
 * A user-named container: "Monday Gym", "Monday Running", "Climbing", "Body".
 * Deliberately not a weekday — it groups trackers, nothing more.
 */
export type Group = {
  id: string
  name: string
  order: number
}

/**
 * One typed slot inside an entry: reps, weight, a length. The display unit is
 * not stored — it follows the global unit system, and values are always kept
 * in the kind's canonical unit.
 */
export type Field = {
  /** Stable key into `Entry.values`. */
  key: string
  kind: FieldKind
  /** Overrides the kind's label; single-field trackers fall back to the name. */
  label: string
  /**
   * Pins the display unit within the current system — seconds for a plank
   * where the same kind would otherwise show minutes. Not a way around the
   * metric/imperial switch: values stay canonical either way.
   */
  unit?: string
  /** Asks for the kind's finer step and extra decimals, where it has them. */
  grain?: 'fine'
}

/**
 * One version of a tracker — the movement you'd rather do, or the machine you
 * fall back to. The id is stable for its lifetime, so logged entries keep
 * meaning the same thing however the plan is reshuffled.
 */
export type Variant = {
  id: string
  name: string
  /** Free text reference for what to aim at: "3x6-8", "100 kg", "5 km in 25 min". */
  target: string
  /** Short free-text tag shown as a badge: "optional", "archived", "every 2 weeks". */
  tag: string
}

/**
 * Anything loggable inside a group: an exercise, a body measurement, a run.
 * `preset` decides what a log looks like — the fields come from the preset
 * table, shared by every variant so entries stay comparable across
 * substitutions. It is chosen once at creation and never edited, which keeps
 * stored entries from being orphaned by a change of shape.
 * `variants[0]` is the primary.
 */
export type Tracker = {
  id: string
  groupId: string
  order: number
  preset: PresetId
  variants: [Variant, ...Variant[]]
}

/** 'sets' repeats rows through a session; 'single' is one reading. */
export type LogStyle = 'sets' | 'single'

/** One logged record: a set, a measurement, a run. */
export type Entry = {
  id: string
  /** The tracker — drives summaries and the cascade delete. */
  trackerId: string
  /**
   * The variant actually performed. Its name is read from the tracker, so a
   * variant cannot be deleted without taking its entries with it.
   */
  variantId: string
  /** Canonical values keyed by `Field.key` — kg, cm, s, m. */
  values: Record<string, number>
  /** Epoch ms. */
  at: number
  /** Local calendar day, "YYYY-MM-DD" — groups entries into a session. */
  date: string
}
