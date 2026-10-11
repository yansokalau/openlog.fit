import { useCallback, useEffect, useState } from 'react'

/**
 * Whether the app can still be installed, and how to go about it.
 *
 * Installing is worth offering from inside the app and not only from the
 * landing page: an installed copy gets its own window, and — the part that
 * matters here — Safari only grants persistent storage to a home-screen web
 * app, so an uninstalled tab is the one whose log can be evicted after a week
 * away. See `persist.ts`.
 *
 * There is no one way to do it. Chromium hands over an install event the page
 * can fire; Safari has no equivalent and never will, so the only thing left is
 * to name the steps. Where neither applies, nothing is offered — a button that
 * cannot install anything is worse than no button.
 */

/** Chromium-only event, absent from the DOM typings. */
type InstallPromptEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const STANDALONE = '(display-mode: standalone)'

export function isStandalone(): boolean {
  return (
    matchMedia(STANDALONE).matches ||
    // iOS Safari predates display-mode and still reports it here alone.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** iPhone, iPad, and an iPad reporting itself as a Mac with a touchscreen. */
const IOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export type Install =
  | { offer: false }
  /** The browser will show its own install dialog. */
  | { offer: true; how: 'prompt'; install: () => Promise<void> }
  /** No dialog exists; the user has to do it through the Share sheet. */
  | { offer: true; how: 'hint' }

export function useInstall(): Install {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // Suppressing Chrome's own mini-infobar is what makes the event ours.
      event.preventDefault()
      setDeferred(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      setDeferred(null)
      setInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)

    // The tab it was installed from stays open and stays a tab; this catches
    // the other direction, a window that becomes standalone.
    const display = matchMedia(STANDALONE)
    const onDisplay = () => setInstalled(isStandalone())
    display.addEventListener('change', onDisplay)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      display.removeEventListener('change', onDisplay)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferred) return
    const event = deferred
    // The event is single-use: spent whether or not they go through with it,
    // and Chrome fires a fresh one later if the app is still installable.
    setDeferred(null)
    await event.prompt()
    await event.userChoice
  }, [deferred])

  if (installed) return { offer: false }
  if (deferred) return { offer: true, how: 'prompt', install }
  if (IOS) return { offer: true, how: 'hint' }
  return { offer: false }
}
