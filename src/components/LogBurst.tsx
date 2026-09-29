import { useMemo } from 'react'

/* ---------------------------------------------------------------- tuning -- */

/** How long a ray lives. Also keeps the burst mounted for exactly that long. */
export const BURST_MS = 700

/** How many lines fly out. */
const RAYS = 16

/** Line thickness, px. */
const THICKNESS = 2

/** Line length, px — each ray picks its own between the two. */
const LENGTH = [5, 19]

/** How far a ray travels, px — each picks its own between the two. */
const TRAVEL = [30, 56]

/** How far a ray may veer off its own radius: total spread, degrees. */
const VEER = 36

/** Wobble in where rays start around the button: total spread, degrees. */
const SPACING_JITTER = 14

/* --------------------------------------------------------------------------- */

const between = ([min, max]: number[]) => min + Math.random() * (max - min)

/**
 * A short burst of tiny lines when a set is logged — the one bit of flourish in
 * the app.
 *
 * Rays start on the ellipse inscribed in the button's own box, so they leave
 * from all the way around it rather than from behind the label. Where each one
 * starts and which way it flies are jittered separately, so they fan rather
 * than radiating on perfect spokes; length and distance vary per burst too, so
 * no two look stamped from the same die.
 *
 * They are drawn in white with `mix-blend-mode: difference`, which inverts
 * whatever is beneath: white across the solid black button, black once clear of
 * it, in either theme, with no colour of their own.
 */
export function LogBurst() {
  const rays = useMemo(
    () =>
      Array.from({ length: RAYS }, (_, i) => {
        const around = (360 / RAYS) * i + (Math.random() - 0.5) * SPACING_JITTER
        // -90° so 0 points up, matching the rotate() the keyframe applies.
        const radians = ((around - 90) * Math.PI) / 180

        return {
          heading: around + (Math.random() - 0.5) * VEER,
          left: 50 + 50 * Math.cos(radians),
          top: 50 + 50 * Math.sin(radians),
          length: between(LENGTH),
          travel: between(TRAVEL),
        }
      }),
    [],
  )

  return (
    <span
      className="pointer-events-none absolute inset-0"
      aria-hidden
      style={
        {
          '--burst-ms': `${BURST_MS}ms`,
          '--spark-w': `${THICKNESS}px`,
        } as React.CSSProperties
      }
    >
      {rays.map((ray, i) => (
        <span
          key={i}
          className="spark"
          style={
            {
              left: `${ray.left}%`,
              top: `${ray.top}%`,
              '--angle': `${ray.heading}deg`,
              '--len': `${ray.length}px`,
              '--travel': `${ray.travel}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  )
}
