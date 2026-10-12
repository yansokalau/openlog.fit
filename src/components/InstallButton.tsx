import { useEffect, useRef, useState } from 'react'
import { useInstall } from '../lib/install'
import { ShareIcon } from './icons'
import { Button } from './ui'

/**
 * Offers to install the app, from the header, while it is running as an
 * ordinary tab. It disappears once there is nothing to offer — already
 * installed, or a browser with no way to do it.
 *
 * On iOS the button cannot install anything, so it explains instead: Safari
 * has no install API and the Share sheet is the only route. That path is also
 * the one that gets the log persistent storage, which is the real reason this
 * is worth a place in the header rather than only on the landing page.
 */
export function InstallButton() {
  const install = useInstall()
  const [hinting, setHinting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hinting) return

    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setHinting(false)
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setHinting(false)
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [hinting])

  if (!install.offer) return null

  return (
    <div ref={ref} className="relative">
      {/* Bold to match the date chip beside it. Forced, because the size's own
          font-medium is a plain utility too — which of the two wins is decided
          by their order in the stylesheet, not in this attribute. */}
      <Button
        size="sm"
        aria-label="Install OpenLog"
        title="Install OpenLog"
        aria-expanded={install.how === 'hint' ? hinting : undefined}
        className="h-9 px-2 !font-bold"
        onClick={() => {
          if (install.how === 'prompt') void install.install()
          else setHinting((v) => !v)
        }}
      >
        Install
      </Button>

      {install.how === 'hint' && hinting && (
        <div className="absolute right-0 top-11 z-30 w-64 border-2 border-ink bg-paper p-3 text-sm shadow-[4px_4px_0_0_var(--ink)]">
          <p className="font-semibold">Add OpenLog to your Home Screen</p>
          <ol className="mt-2 space-y-1 text-ink/70">
            <li className="flex items-center gap-1.5">
              1. Tap <ShareIcon size={15} /> Share
            </li>
            <li>2. Choose <strong className="font-semibold text-ink">Add to Home Screen</strong></li>
          </ol>
          <p className="mt-3 text-ink/60">
            Opened from there, it gets its own window, and Safari stops
            clearing your log after a week away.
          </p>
        </div>
      )}
    </div>
  )
}
