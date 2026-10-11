import { useEffect, useRef, useState } from 'react'

/** How often a new card lands in the column. */
const STEP_MS = 1600
/** How long each status line stays before the next. */
const MESSAGE_MS = 5000
/** How often the dots after it step: . → .. → ... */
const DOT_MS = 400
/** Cards in view; one more stays mounted at the top while it fades out. */
const VISIBLE = 3
/** One slot in the column: a card's height plus the gap above it. */
const CARD_PX = 56
const GAP_PX = 8
const SLOT_PX = CARD_PX + GAP_PX

/** Skeleton line widths, cycled so neighbouring cards differ. */
const LINE_WIDTHS = ['58%', '44%', '66%', '50%', '38%']

/**
 * What the wait says, in order, each for MESSAGE_MS. The last one holds for as
 * long as the request takes, so it must read as true however long that is.
 */
export const LOADER_MESSAGES = [
  'Reading what you wrote',
  'Picking exercises',
  'Setting sets and reps',
  'Adding alternatives',
  'Putting it in order',
  'Almost there',
]

/**
 * Full-screen wait while a plan is written. Cards like the app's own trackers
 * keep landing at the bottom of a column — the plan being put together — and
 * the status line moves on every few seconds, so it never looks stuck. The
 * overlay takes every click: a request already paid for runs to its answer or
 * its error.
 */
export function PlanLoader() {
  // Newest first: index 0 is the bottom slot, where cards land.
  const [cards, setCards] = useState<number[]>(() => Array.from({ length: VISIBLE }, (_, i) => VISIBLE - 1 - i))
  const next = useRef(VISIBLE)
  const [message, setMessage] = useState(0)
  const [dots, setDots] = useState(1)

  useEffect(() => {
    const cardTimer = setInterval(() => {
      setCards((prev) => [next.current++, ...prev].slice(0, VISIBLE + 1))
    }, STEP_MS)
    const messageTimer = setInterval(() => {
      setMessage((i) => Math.min(i + 1, LOADER_MESSAGES.length - 1))
    }, MESSAGE_MS)
    const dotTimer = setInterval(() => setDots((n) => (n % 3) + 1), DOT_MS)
    return () => {
      clearInterval(cardTimer)
      clearInterval(messageTimer)
      clearInterval(dotTimer)
    }
  }, [])

  // Nothing behind the overlay should move while it is up.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-label="Writing your plan"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-paper px-4"
    >
      <div className="relative w-64" style={{ height: VISIBLE * SLOT_PX - GAP_PX }} aria-hidden>
        {cards.map((id, slot) => (
          <div
            key={id}
            className="absolute inset-x-0 bottom-0 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
            style={{
              transform: `translateY(${-slot * SLOT_PX}px)`,
              opacity: slot >= VISIBLE ? 0 : 1,
            }}
          >
            {/* The fly-in lives on an inner layer, so it never fights the
                outer transform that places the card in its slot. */}
            <div className="plan-card-in">
              <div className="flex items-center border-2 border-ink bg-paper px-4" style={{ height: CARD_PX }}>
                <div className="h-3 bg-ink/20" style={{ width: LINE_WIDTHS[id % LINE_WIDTHS.length] }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Polite, so each new line is read out without interrupting. The dots
          sit outside the centred text's width, so animating them never nudges
          the words sideways. */}
      <p aria-live="polite" className="relative text-sm font-bold uppercase tracking-[0.12em]">
        <span key={message} className="loader-message">
          {LOADER_MESSAGES[message]}
        </span>
        <span className="absolute left-full" aria-hidden>
          {'.'.repeat(dots)}
        </span>
      </p>
    </div>
  )
}
