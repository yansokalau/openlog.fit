import type { PresetId } from './presets'
import type { Group, Tracker } from './types'
import { uid } from './utils'

const PLAN: [string, [string, string, string?][]][] = [
  [
    'Monday',
    [
      ['Bench press', '3x6-8'],
      ['Pec deck / chest fly machine', '3x10-15'],
      ['Single-arm cable lateral raise', '3x10-15'],
      ['EZ-bar biceps curl', '2-3x8-12'],
      ['Rope triceps pushdown', '2-3x10-12'],
    ],
  ],
  [
    'Wednesday',
    [
      ['Leg extension', '3x10-12'],
      ['Lying leg curl', '3x10-12'],
      ['Hip thrust / glute bridge', '2-3x8-12', 'optional'],
      ['Calf raise', '3x12-15'],
      ['Lying leg raise', '3x12-15'],
    ],
  ],
  [
    'Friday',
    [
      ['Weighted dips', '3x8-10'],
      ['Lat pulldown', '3x8-10'],
      ['Seated cable row / horizontal row', '3x8-12'],
      ['Machine shoulder press', '3x8-10'],
      ['Face pull', '2x12-15', 'optional'],
    ],
  ],
]

/** The starting plan, written on a first run or after a SCHEMA bump. */
export function seedPlan(): { groups: Group[]; trackers: Tracker[] } {
  const groups: Group[] = []
  const trackers: Tracker[] = []

  PLAN.forEach(([name, rows], groupIndex) => {
    const groupId = uid()
    groups.push({ id: groupId, name, order: groupIndex })

    rows.forEach(([trackerName, target, note], index) => {
      trackers.push({
        id: uid(),
        groupId,
        order: index,
        preset: 'strength',
        variants: [{ id: uid(), name: trackerName, target, tag: note ?? '' }],
      })
    })
  })

  // A non-workout group, to show what else the model holds.
  const bodyId = uid()
  groups.push({ id: bodyId, name: 'Body', order: groups.length })
  const measurements: [string, PresetId][] = [
    ['Bodyweight', 'bodyweight'],
    ['Waist', 'measure'],
  ]
  measurements.forEach(([name, preset], index) => {
    trackers.push({
      id: uid(),
      groupId: bodyId,
      order: index,
      preset,
      variants: [{ id: uid(), name, target: '', tag: '' }],
    })
  })

  return { groups, trackers }
}
