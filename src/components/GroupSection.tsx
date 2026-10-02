import { useLayoutEffect, useRef, useState } from 'react'
import { STICKY_CLEARANCE, bringIntoView } from '../lib/scroll'
import type { Entry, Group, Tracker, Variant } from '../lib/types'
import { isArchiveGroup, uid } from '../lib/utils'
import { ArrowIcon, PencilIcon, TrashIcon } from './icons'
import { TrackerForm, type TrackerValues } from './TrackerForm'
import { TrackerItem } from './TrackerItem'
import { Button, Input } from './ui'

export function GroupSection({
  group,
  trackers,
  entriesByTracker,
  expandedId,
  editingId,
  isFirstGroup,
  isLastGroup,
  onExpand,
  onEditing,
  onRename,
  onRemove,
  onMove,
  onAddTracker,
  onUpdateTracker,
  onRemoveTracker,
  onArchiveTracker,
  onMoveTracker,
  onLog,
  onRemoveEntry,
}: {
  group: Group
  trackers: Tracker[]
  entriesByTracker: Map<string, Entry[]>
  expandedId: string | null
  editingId: string | null
  /** Both edges of the plan: a tracker there has nowhere further to move. */
  isFirstGroup: boolean
  isLastGroup: boolean
  onExpand: (id: string | null) => void
  onEditing: (id: string | null) => void
  onRename: (name: string) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
  onAddTracker: (values: TrackerValues) => void
  onUpdateTracker: (id: string, values: TrackerValues) => void
  onRemoveTracker: (id: string) => void
  onArchiveTracker: (id: string) => void
  onMoveTracker: (id: string, direction: -1 | 1) => void
  onLog: (trackerId: string, variant: Variant, values: Record<string, number>) => void
  onRemoveEntry: (id: string) => void
}) {
  const [mode, setMode] = useState<'idle' | 'rename' | 'confirm' | 'add'>('idle')
  const [name, setName] = useState(group.name)
  const ref = useRef<HTMLElement>(null)
  const lastOrder = useRef(group.order)
  const anchor = useRef<number | null>(null)

  const move = (direction: -1 | 1) => {
    // Where the header sits right now, so the page can be corrected to match.
    anchor.current = ref.current?.getBoundingClientRect().top ?? null
    onMove(direction)
  }

  /**
   * Groups are tall, so swapping two of them would otherwise fling the page.
   * The scroll is corrected by however far the header travelled, which holds it
   * visually still while the neighbouring group moves around it — instantly,
   * because animating the correction is what would make it look like a jump.
   */
  useLayoutEffect(() => {
    if (lastOrder.current === group.order) return
    lastOrder.current = group.order

    const el = ref.current
    const before = anchor.current
    anchor.current = null
    if (!el || before === null) return

    const delta = el.getBoundingClientRect().top - before
    if (delta !== 0) window.scrollBy(0, delta)

    // Only if the correction hit the top or bottom of the page does the header
    // end up out of sight; ease it back rather than leaving it stranded.
    const { top } = el.getBoundingClientRect()
    if (top < STICKY_CLEARANCE || top > window.innerHeight - 48) {
      bringIntoView(el, 'nearest')
    }
  }, [group.order])

  return (
    <section ref={ref} style={{ scrollMarginTop: STICKY_CLEARANCE }} className="space-y-2">
      <header className="space-y-2">
        {mode === 'rename' ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim()) {
                onRename(name)
                setMode('idle')
              }
            }}
          >
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Group name"
                autoFocus
              />
              <Button
                aria-label="Move group up"
                title="Move group up"
                className="w-12 !px-0"
                disabled={isFirstGroup}
                onClick={() => move(-1)}
              >
                <ArrowIcon direction="up" />
              </Button>
              <Button
                aria-label="Move group down"
                title="Move group down"
                className="w-12 !px-0"
                disabled={isLastGroup}
                onClick={() => move(1)}
              >
                <ArrowIcon direction="down" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="solid" size="md" className="flex-1">
                Save
              </Button>
              <Button
                size="md"
                onClick={() => {
                  setName(group.name)
                  setMode('idle')
                }}
              >
                Cancel
              </Button>
              {/* Sits with the other commit-level actions rather than on a row
                  of its own; a confirmation step guards the mis-tap. */}
              <Button
                size="md"
                aria-label={`Delete ${group.name}`}
                title="Delete group"
                className="w-11 !px-0"
                onClick={() => setMode('confirm')}
              >
                <TrashIcon />
              </Button>
            </div>
          </form>
        ) : mode === 'confirm' ? (
          <div className="flex items-center gap-2">
            <span className="mr-auto text-sm">
              Delete <strong>{group.name}</strong> and its {trackers.length}{' '}
              {trackers.length === 1 ? 'tracker' : 'trackers'}?
            </span>
            <Button size="sm" variant="solid" onClick={onRemove}>
              Delete
            </Button>
            {/* Back to the form, not out of it: the delete is reached from
                there, and a typed name should survive backing out. */}
            <Button size="sm" onClick={() => setMode('rename')}>
              Keep
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="mr-auto text-lg font-bold uppercase tracking-[0.18em]">{group.name}</h2>
            <Button
              size="sm"
              aria-label={`Edit ${group.name}`}
              className="w-8 !px-0"
              onClick={() => {
                setName(group.name)
                setMode('rename')
              }}
            >
              <PencilIcon />
            </Button>
          </div>
        )}
      </header>

      <ul className="space-y-2">
        {trackers.map((tracker, index) => (
          <TrackerItem
            key={tracker.id}
            tracker={tracker}
            entries={entriesByTracker.get(tracker.id) ?? []}
            expanded={expandedId === tracker.id}
            editing={editingId === tracker.id}
            move={{
              onMove: (direction) => onMoveTracker(tracker.id, direction),
              canMoveUp: !(isFirstGroup && index === 0),
              canMoveDown: !(isLastGroup && index === trackers.length - 1),
            }}
            onToggle={() => onExpand(expandedId === tracker.id ? null : tracker.id)}
            onEditingChange={(next) => onEditing(next ? tracker.id : null)}
            onUpdate={(values) => onUpdateTracker(tracker.id, values)}
            onRemove={() => onRemoveTracker(tracker.id)}
            onArchive={isArchiveGroup(group.name) ? null : () => onArchiveTracker(tracker.id)}
            onLog={(variant, values) => onLog(tracker.id, variant, values)}
            onRemoveEntry={onRemoveEntry}
          />
        ))}
      </ul>

      {mode === 'add' ? (
        <div className="border-2 border-ink p-3">
          <TrackerForm
            initial={{ preset: 'strength', variants: [blankVariant()] }}
            submitLabel="Add tracker"
            onSubmit={(values) => {
              onAddTracker(values)
              setMode('idle')
            }}
            onCancel={() => setMode('idle')}
          />
        </div>
      ) : (
        <Button variant="dashed" size="md" className="w-full" onClick={() => setMode('add')}>
          + Add tracker
        </Button>
      )}
    </section>
  )
}

function blankVariant(): Variant {
  return { id: uid(), name: '', target: '', tag: '' }
}
