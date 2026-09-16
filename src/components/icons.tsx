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
export function ArrowIcon({ direction, ...props }: IconProps & { direction: 'up' | 'down' }) {
  return (
    <Icon
      {...props}
      size={props.size ?? 22}
      strokeWidth={2.5}
      square
      className={direction === 'down' ? 'rotate-180' : props.className}
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
