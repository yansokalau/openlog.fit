import { useState } from 'react'
import { PRESETS, PRESET_LIST, type PresetId } from '../lib/presets'
import type { Variant } from '../lib/types'
import { uid } from '../lib/utils'
import { ArrowIcon, ChevronDownIcon } from './icons'
import { Button, Input, Label } from './ui'

export type MoveControls = {
  onMove: (direction: -1 | 1) => void
  canMoveUp: boolean
  canMoveDown: boolean
}

export type TrackerValues = { preset: PresetId; variants: [Variant, ...Variant[]] }

/**
 * Name, what it logs, and the list of alternatives. The type is picked once
 * when the tracker is created and shown read-only afterwards: entries are keyed
 * by the preset's fields, so changing it later would orphan them.
 */
export function TrackerForm({
  initial,
  submitLabel,
  editing,
  entryCounts = {},
  move,
  onSubmit,
  onCancel,
}: {
  initial?: TrackerValues
  submitLabel: string
  /** Logged entries per variant id — what removing one would destroy. */
  entryCounts?: Record<string, number>
  /** An existing tracker: the type is settled and no longer offered. */
  editing?: boolean
  move?: MoveControls
  onSubmit: (values: TrackerValues) => void
  onCancel: () => void
}) {
  const [preset, setPreset] = useState<PresetId>(initial?.preset ?? 'strength')
  const [variants, setVariants] = useState<Variant[]>(
    () => initial?.variants ?? [{ id: uid(), name: '', target: '', tag: '' }],
  )

  const [confirming, setConfirming] = useState<string | null>(null)

  const patch = (id: string, values: Partial<Variant>) =>
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...values } : v)))

  const drop = (id: string) => setVariants((prev) => prev.filter((v) => v.id !== id))

  const valid = variants[0] && variants[0].name.trim().length > 0

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        // Blank alternatives are dropped rather than saved as empty rows.
        const kept = variants.filter((v, index) => index === 0 || v.name.trim().length > 0)
        onSubmit({
          preset,
          variants: kept.map((v) => ({
            id: v.id,
            name: v.name.trim(),
            target: v.target.trim(),
            tag: v.tag.trim(),
          })) as [Variant, ...Variant[]],
        })
      }}
    >
      <div>
        <Label>Tracks</Label>
        {editing ? (
          <p className="text-sm">
            {PRESETS[preset].label}
            <span className="text-ink/50"> — {PRESETS[preset].hint}</span>
          </p>
        ) : (
          <>
            <div className="relative">
              <select
                value={preset}
                aria-label="What it tracks"
                onChange={(e) => setPreset(e.target.value as PresetId)}
                className="h-12 w-full overflow-hidden text-ellipsis whitespace-nowrap border-2 border-ink bg-paper pl-3 pr-10 text-sm font-medium text-ink appearance-none"
              >
                {PRESET_LIST.map((id) => (
                  <option key={id} value={id}>
                    {PRESETS[id].label}
                  </option>
                ))}
              </select>
              <span
                className="pointer-events-none absolute inset-y-0 right-3 flex items-center"
                aria-hidden
              >
                <ChevronDownIcon />
              </span>
            </div>
            <p className="mt-1 text-sm text-ink/50">{PRESETS[preset].hint}</p>
          </>
        )}
      </div>

      {variants.map((variant, index) => (
        <div
          key={variant.id}
          className={`space-y-2 ${index > 0 ? 'border-t-2 border-ink pt-4' : ''}`}
        >
          {confirming === variant.id ? (
            <div className="flex items-center gap-2">
              <span className="mr-auto text-sm">
                Remove, and delete {entryCounts[variant.id]}{' '}
                {entryCounts[variant.id] === 1 ? 'entry' : 'entries'}?
              </span>
              <Button
                size="sm"
                variant="solid"
                onClick={() => {
                  drop(variant.id)
                  setConfirming(null)
                }}
              >
                Remove
              </Button>
              <Button size="sm" onClick={() => setConfirming(null)}>
                Keep
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <Label>{index === 0 ? 'Name' : `Alternative ${index}`}</Label>
              {index > 0 && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      setVariants((prev) => [variant, ...prev.filter((v) => v.id !== variant.id)])
                    }
                  >
                    Make primary
                  </Button>
                  <Button
                    size="sm"
                    aria-label={`Remove alternative ${index}`}
                    className="w-8 !px-0"
                    // Only worth a confirmation when there is something to lose.
                    onClick={() =>
                      entryCounts[variant.id] ? setConfirming(variant.id) : drop(variant.id)
                    }
                  >
                    ✕
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={variant.name}
              onChange={(e) => patch(variant.id, { name: e.target.value })}
              placeholder={index === 0 ? PRESETS[preset].nameHint : PRESETS[preset].altHint}
              aria-label={index === 0 ? 'Tracker name' : `Alternative ${index} name`}
              autoFocus={index === 0}
            />
            {index === 0 && move && (
              <>
                <Button
                  aria-label="Move tracker up"
                  title="Move up — crosses into the previous group"
                  className="w-12 !px-0"
                  disabled={!move.canMoveUp}
                  onClick={() => move.onMove(-1)}
                >
                  <ArrowIcon direction="up" />
                </Button>
                <Button
                  aria-label="Move tracker down"
                  title="Move down — crosses into the next group"
                  className="w-12 !px-0"
                  disabled={!move.canMoveDown}
                  onClick={() => move.onMove(1)}
                >
                  <ArrowIcon direction="down" />
                </Button>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <Label>Target</Label>
              <Input
                value={variant.target}
                onChange={(e) => patch(variant.id, { target: e.target.value })}
                placeholder={PRESETS[preset].targetHint}
                aria-label={index === 0 ? 'Target' : `Alternative ${index} target`}
              />
            </label>
            <label className="block">
              <Label>Tag</Label>
              <Input
                value={variant.tag}
                onChange={(e) => patch(variant.id, { tag: e.target.value })}
                placeholder="optional, every 2 weeks"
                aria-label={index === 0 ? 'Tag' : `Alternative ${index} tag`}
              />
            </label>
          </div>
        </div>
      ))}

      <Button
        variant="dashed"
        size="md"
        className="w-full"
        onClick={() =>
          setVariants((prev) => [...prev, { id: uid(), name: '', target: '', tag: '' }])
        }
      >
        + Add alternative
      </Button>

      <div className="flex gap-2">
        <Button type="submit" variant="solid" size="md" disabled={!valid} className="flex-1">
          {submitLabel}
        </Button>
        <Button variant="outline" size="md" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
