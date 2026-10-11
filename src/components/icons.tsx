import type { ReactNode } from 'react'

type IconProps = {
  /** Square edge in px. */
  size?: number
  className?: string
}

/**
 * Every icon in the app: one stroke weight vocabulary, one viewBox, all
 * inheriting `currentColor` so they take the ink of whatever they sit on —
 * including the black-on-yellow of an expanded card.
 */
function Icon({
  size = 18,
  strokeWidth = 2,
  square,
  className,
  children,
}: IconProps & { strokeWidth?: number; square?: boolean; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap={square ? 'square' : 'butt'}
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={2.5}>
      <path d="m5 9 7 7 7-7" />
    </Icon>
  )
}

/** Reorder arrows — the same glyph, flipped, so up and down read as a pair. */
const ARROW_ROTATION = { up: '', down: 'rotate-180', left: '-rotate-90' }

export function ArrowIcon({ direction, ...props }: IconProps & { direction: 'up' | 'down' | 'left' }) {
  return (
    <Icon
      {...props}
      size={props.size ?? 22}
      strokeWidth={2.5}
      square
      className={direction === 'up' ? props.className : ARROW_ROTATION[direction]}
    >
      <path d="M12 20V5M5 12l7-7 7 7" />
    </Icon>
  )
}

export function DotsIcon(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={2.5}>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </Icon>
  )
}

export function PencilIcon(props: IconProps) {
  return (
    <Icon {...props} size={props.size ?? 14}>
      <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
    </Icon>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
    </Icon>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props} size={props.size ?? 16}>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 1.5v2.5M12 20v2.5M1.5 12h2.5M20 12h2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8" />
    </Icon>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props} size={props.size ?? 16}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
    </Icon>
  )
}

/**
 * The figure from the app icon, drawn in `currentColor` so it takes the ink of
 * the theme: black on white, white on black. The viewBox is cropped to the
 * drawing so it sits level with the wordmark.
 */
export function LogoMark({ size = 28, className }: IconProps) {
  return (
    <svg
      viewBox="6 9 52 46"
      height={size}
      width={(size * 52) / 46}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M25.2532 32.3C22.0848 27.64 20.8845 24.9531 20 20M25.2532 32.3C27.2757 36.0884 27.9848 38.2681 28.1373 42.3M25.2532 32.3C26.4335 31.9086 27.4979 31.5998 28.5 31.3778M38.7468 32.3C41.9441 27.8957 43.4259 25.3182 44 20M38.7468 32.3C36.6788 35.7903 36.0726 38.0022 35.7597 42.3M38.7468 32.3C37.6003 31.903 36.5639 31.5967 35.5913 31.3778M28.1373 42.3C31.3179 43.4338 33.0236 43.6382 35.7597 42.3M28.1373 42.3C25.861 45.5768 25.0516 47.7515 24.1202 52M35.7597 42.3C38.3183 45.3886 39.2452 47.5282 40.0858 52" />
      <circle cx="32" cy="29" r="4" />
      <path d="M14.6255 12H48.255L56 16.1081L48.255 20H14.6255M48.255 12C46.6685 15.1245 46.6398 16.8755 48.255 20M14.6255 12H8.91866C7.66171 15.1243 7.72627 16.8759 8.91866 20H14.6255M14.6255 12V20" />
    </svg>
  )
}

/** A triangle with an exclamation mark, for error messages. */
export function WarnIcon(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={2.25}>
      <path d="M12 3 22 20H2L12 3Z" strokeLinejoin="round" />
      <path d="M12 10v4M12 16.5v.5" strokeLinecap="round" />
    </Icon>
  )
}

/** Two sparkles: something written for you. */
export function SparkleIcon(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={1.75}>
      <path d="M10 3.5 11.8 8.7 17 10.5 11.8 12.3 10 17.5 8.2 12.3 3 10.5 8.2 8.7Z" strokeLinejoin="round" />
      <path d="M18 14.5 18.8 16.7 21 17.5 18.8 18.3 18 20.5 17.2 18.3 15 17.5 17.2 16.7Z" strokeLinejoin="round" />
    </Icon>
  )
}

/** A page of lines: a program you already have. */
export function DocumentIcon(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={1.75}>
      <path d="M6 3h8l4 4v14H6Z" strokeLinejoin="round" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </Icon>
  )
}

/** An arrow turning back on a clock: bring back what you had. */
export function RestoreIcon(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={1.75}>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4 9.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 5v4.5h4.5M12 8v4l2.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={1.75}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </Icon>
  )
}

/** A phone taking something in — install, in the home-screen sense. */
export function InstallIcon(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={1.75}>
      <rect x="6" y="2.5" width="12" height="19" rx="2" strokeLinejoin="round" />
      <path d="M12 7v7m0 0 2.5-2.5M12 14l-2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}

/** iOS share glyph, so the hint names the button by its shape as well. */
export function ShareIcon(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={1.75}>
      <path d="M12 3v11m0-11 3 3m-3-3L9 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 10H5.5v10.5h13V10H17" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  )
}
