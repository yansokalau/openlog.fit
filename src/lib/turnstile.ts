import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Cloudflare Turnstile, so only a person in a browser can spend AI calls.
 * The script is loaded on first use rather than in the page head: the plan
 * builder is the only thing that needs it, and the rest of the app works
 * offline without it.
 */

type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

/**
 * Off under `npm run dev`: no script, no widget, and the local function skips
 * the check (`SKIP_TURNSTILE` in `.dev.vars`). Production builds read the key
 * from `.env.production`.
 */
const SITE_KEY: string | undefined = import.meta.env.DEV
  ? undefined
  : import.meta.env.VITE_TURNSTILE_SITE_KEY

let loading: Promise<Turnstile> | null = null

function load(): Promise<Turnstile> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')))
    script.onerror = () => {
      // Forgotten, so reopening the builder once back online tries again.
      loading = null
      reject(new Error('turnstile'))
    }
    document.head.appendChild(script)
  })
  return loading
}

/**
 * Renders the challenge into `container` and hands back a token once it
 * passes. A token is good for one request only, so `consume` returns it and
 * resets the widget, which earns the next one in the background.
 */
export function useTurnstile(container: RefObject<HTMLElement | null>) {
  const [token, setToken] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const widget = useRef<{ api: Turnstile; id: string } | null>(null)

  useEffect(() => {
    if (!SITE_KEY) return
    let cancelled = false

    load()
      .then((api) => {
        if (cancelled || !container.current) return
        const id = api.render(container.current, {
          sitekey: SITE_KEY,
          action: 'turnstile-spin-v2',
          // Invisible unless Cloudflare actually wants the person to click.
          appearance: 'interaction-only',
          callback: (value: string) => {
            setToken(value)
            setFailed(false)
          },
          'expired-callback': () => setToken(null),
          'error-callback': () => {
            setToken(null)
            setFailed(true)
          },
        })
        widget.current = { api, id }
      })
      .catch(() => !cancelled && setFailed(true))

    return () => {
      cancelled = true
      if (widget.current) widget.current.api.remove(widget.current.id)
      widget.current = null
    }
  }, [container])

  const consume = useCallback(() => {
    const current = token
    setToken(null)
    if (widget.current) widget.current.api.reset(widget.current.id)
    return current
  }, [token])

  return {
    /** No site key (local dev, or a build without one): the server decides. */
    ready: !SITE_KEY || token !== null,
    failed,
    consume,
  }
}
