/**
 * Plays one logging session in the landing page's mock, on a loop.
 *
 * The markup ships in its finished state — card open, two sets logged — so
 * the hero still shows the product with the script blocked, with JavaScript
 * off, or under reduced motion. This only takes over when it may animate: it
 * winds the mock back to the start and plays forward from there.
 */

/* ---------------------------------------------------------------- tuning -- */

/** Each beat of the scenario, in ms, in order. */
const BEAT = {
  beforeOpen: 1100,
  afterOpen: 900,
  betweenSets: 850,
  beforeNudge: 950,
  beforeHistory: 900,
  /** How long the earlier sessions stay in view. */
  showHistory: 1900,
  beforeClose: 400,
  beforeReplay: 1100,
}

/** How far the frame slides to bring the earlier sessions into view, px. */
const HISTORY_SLIDE = 80

/** Panel open/close, matching EXPAND_MS in the app. */
const EXPAND_MS = 200

/** How long a press shows on a button. */
const PRESS_MS = 160

const WEIGHT = '82.5 kg'
const REPS_FIRST = 8
const REPS_AFTER = 7

/* --------------------------------------------------------------------------- */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function heroMock() {
  const root = document.querySelector<HTMLElement>('[data-mock]')
  if (!root) return

  const panel = root.querySelector<HTMLElement>('[data-mock-panel]')
  const head = root.querySelector<HTMLElement>('[data-mock-head]')
  const toggle = root.querySelector<HTMLElement>('[data-mock-toggle]')
  const reps = root.querySelector<HTMLElement>('[data-mock-reps]')
  const down = root.querySelector<HTMLElement>('[data-mock-down]')
  const log = root.querySelector<HTMLElement>('[data-mock-log]')
  const count = root.querySelector<HTMLElement>('[data-mock-count]')
  const sets = root.querySelector<HTMLElement>('[data-mock-sets]')
  const scroller = root.querySelector<HTMLElement>('[data-mock-scroll]')
  if (!panel || !head || !toggle || !reps || !down || !log || !count || !sets || !scroller) return

  // The earlier sessions are dated here rather than in the markup, so the mock
  // does not drift into showing a date from last spring.
  root.querySelectorAll<HTMLElement>('[data-mock-date]').forEach((el, i) => {
    const day = new Date()
    day.setDate(day.getDate() - 7 * (i + 1))
    el.textContent = `${day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}:`
  })

  // Leave the finished state alone for anyone who asked not to see motion.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

  // Nothing to play while it is off screen; a hero loop running behind the
  // FAQ is work nobody is watching.
  let onScreen = true
  new IntersectionObserver(([entry]) => (onScreen = entry.isIntersecting), { threshold: 0.15 }).observe(
    root,
  )
  const beat = async (ms: number) => {
    await sleep(ms)
    while (!onScreen) await sleep(400)
  }

  const open = (shown: boolean) => {
    panel.style.animation = `${shown ? 'panel-open' : 'panel-close'} ${EXPAND_MS}ms ease-out forwards`
    head.classList.toggle('bg-accent', shown)
    head.classList.toggle('text-accent-ink', shown)
    toggle.classList.toggle('rotate-45', shown)
  }

  const press = async (el: HTMLElement, on: string[], off: string[]) => {
    el.classList.remove(...off)
    el.classList.add(...on)
    await sleep(PRESS_MS)
    el.classList.remove(...on)
    el.classList.add(...off)
  }

  const logSet = async (value: number) => {
    await press(log, ['bg-paper', 'text-ink'], ['bg-ink', 'text-paper'])
    const badge = document.createElement('li')
    badge.className =
      'mock-badge flex items-stretch border-2 border-current bg-accent text-accent-ink'
    badge.innerHTML =
      `<span class="px-2 py-1 text-sm tabular-nums">${WEIGHT} × ${value}</span>` +
      '<span class="flex items-center border-l-2 border-current px-2 text-sm leading-none">✕</span>'
    sets.append(badge)
    const n = sets.children.length
    count.textContent = `Today · ${n} ${n === 1 ? 'set' : 'sets'}`
  }

  /** Slides the whole frame, the way a thumb would, to show what is below. */
  const slide = (by: number) => {
    scroller.style.transform = by ? `translateY(${-by}px)` : ''
  }

  const rewind = () => {
    sets.replaceChildren()
    count.textContent = 'Today · 0 sets'
    reps.textContent = String(REPS_FIRST)
  }

  // Straight to the start: no animation on the very first frame, or the card
  // is seen shutting before it was ever open.
  panel.style.gridTemplateRows = '0fr'
  slide(0)
  head.classList.remove('bg-accent', 'text-accent-ink')
  toggle.classList.remove('rotate-45')
  rewind()

  void (async () => {
    for (;;) {
      await beat(BEAT.beforeOpen)
      open(true)

      await beat(BEAT.afterOpen)
      await logSet(REPS_FIRST)

      await beat(BEAT.beforeNudge)
      await press(down, ['bg-ink', 'text-paper'], [])
      reps.textContent = String(REPS_AFTER)

      await beat(BEAT.betweenSets)
      await logSet(REPS_AFTER)

      // Today's two sets are in; now show that the weeks before them are too.
      await beat(BEAT.beforeHistory)
      slide(HISTORY_SLIDE)

      await beat(BEAT.showHistory)
      slide(0)

      await beat(BEAT.beforeClose)
      open(false)

      await beat(BEAT.beforeReplay)
      rewind()
    }
  })()
}
