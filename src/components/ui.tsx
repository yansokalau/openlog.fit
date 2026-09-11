import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { ChevronDownIcon } from './icons'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'outline' | 'solid' | 'ghost' | 'dashed'
  size?: 'sm' | 'md' | 'lg'
}

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  outline: 'border-2 border-ink bg-paper text-ink hover:bg-ink hover:text-paper',
  solid: 'border-2 border-ink bg-ink text-paper hover:bg-paper hover:text-ink',
  ghost: 'border-2 border-transparent text-ink hover:border-ink',
  dashed: 'border-2 border-dashed border-ink/50 text-ink hover:border-ink hover:bg-ink/5',
}

const SIZES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-2 text-[11px] tracking-wider uppercase',
  md: 'h-11 px-4 text-sm',
  lg: 'h-14 px-4 text-base tracking-wide uppercase',
}

export function Button({ variant = 'outline', size = 'md', className = '', ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:pointer-events-none disabled:opacity-30 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    />
  )
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-11 w-full border-2 border-ink px-3 text-sm placeholder:text-ink/40 ${className}`}
      {...rest}
    />
  )
}

/**
 * Native select — the platform picker is the right control on a phone. The
 * chevron is drawn separately because the UA arrow can't be themed.
 */
export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <select
          value={value}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full overflow-hidden text-ellipsis whitespace-nowrap border-2 border-ink bg-paper pl-3 pr-10 text-sm font-medium text-ink appearance-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center" aria-hidden>
          <ChevronDownIcon />
        </span>
      </div>
    </div>
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="block pb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/60">{children}</span>
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="border-2 border-current px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.12em]">
      {children}
    </span>
  )
}
