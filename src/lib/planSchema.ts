import { PRESET_LIST, type PresetId } from './presets'

/**
 * The contract between the onboarding screen and `/api/plan`. Shared by both
 * sides, so the endpoint's JSON schema and the client's types cannot drift.
 */

/**
 * The quiz. Shared with the endpoint, which accepts only these keys and these
 * exact values — anything else is dropped before the prompt is built.
 */
export const QUESTIONS = [
  { key: 'goal', label: 'Goal', options: ['Build muscle', 'Get stronger', 'Lose fat', 'General fitness', 'Endurance'] },
  { key: 'daysPerWeek', label: 'Days per week', options: ['2', '3', '4', '5', '6'] },
  { key: 'sessionMinutes', label: 'Minutes per session', options: ['30', '45', '60', '90'] },
  { key: 'equipment', label: 'Equipment', options: ['Full gym', 'Dumbbells at home', 'Bodyweight only'] },
  { key: 'experience', label: 'Experience', options: ['Beginner', 'Intermediate', 'Advanced'] },
  { key: 'cardio', label: 'Cardio', options: ['None', 'A little', 'A lot'] },
  { key: 'trackBody', label: 'Track bodyweight and waist', options: ['Yes', 'No'] },
] as const

export type Preferences = Partial<Record<(typeof QUESTIONS)[number]['key'], string>>

/** Every part is optional, but at least one of program, preferences or notes must say something. */
export type PlanRequest = {
  program?: string
  preferences?: Preferences
  notes?: string
  units: 'metric' | 'imperial'
  /** One-use Turnstile token proving a person sent this. */
  turnstileToken?: string
}

export type GeneratedVariant = { name: string; target: string; tag: string }

export type GeneratedPlan = {
  summary: string
  groups: {
    name: string
    trackers: {
      preset: PresetId
      /** The first is the primary; the rest are alternatives. */
      variants: GeneratedVariant[]
    }[]
  }[]
}

/**
 * Input caps, in characters. A real program — several days, sets, reps and
 * notes — is 1-5k; 12k (~3k tokens) leaves room for a verbose CSV export
 * while keeping the worst-case prompt cheap.
 */
export const MAX_PROGRAM_CHARS = 12_000
export const MAX_NOTES_CHARS = 1_000
/** Program + notes + quiz answers + JSON overhead. The Turnstile token is not counted. */
export const MAX_REQUEST_CHARS = 14_000
/** Cloudflare's documented maximum for a Turnstile token. */
export const MAX_TURNSTILE_TOKEN_CHARS = 2_048

/** Strict-mode JSON schema: every property required, nothing extra allowed. */
export const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'groups'],
  properties: {
    summary: { type: 'string' },
    groups: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'trackers'],
        properties: {
          name: { type: 'string' },
          trackers: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['preset', 'variants'],
              properties: {
                preset: { type: 'string', enum: PRESET_LIST },
                variants: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['name', 'target', 'tag'],
                    properties: {
                      name: { type: 'string' },
                      target: { type: 'string' },
                      tag: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}
