/**
 * How much room to leave above an element scrolled into view: the sticky
 * header (62px) plus a little air. The single source for both the "is it
 * visible?" maths and the scroll-margin applied to the elements themselves.
 */
export const STICKY_CLEARANCE = 72

/**
 * Scrolls an element into view, preferring a smooth glide but never depending
 * on it: some embedded webviews accept `behavior: 'smooth'` and then do
 * nothing at all, which would silently leave a just-expanded card off screen.
 * If the page hasn't moved shortly after, the jump is made instantly.
 */
export function bringIntoView(el: HTMLElement, block: ScrollLogicalPosition = 'nearest'): void {
  const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
  const before = window.scrollY

  el.scrollIntoView({ block, behavior: smooth ? 'smooth' : 'auto' })
  if (!smooth) return

  window.setTimeout(() => {
    if (window.scrollY === before) el.scrollIntoView({ block, behavior: 'auto' })
  }, 120)
}
