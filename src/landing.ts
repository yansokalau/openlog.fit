import './index.css'

/**
 * The landing page is static HTML; this only wires the install buttons. They
 * start hidden and appear once the browser says it can install, so a visitor
 * never sees a button that does nothing.
 */

// Chrome-only event, not in the DOM typings.
type InstallPromptEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const standalone =
  matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

// An installed copy that lands on / (the scope covers it) belongs in the app.
if (standalone) location.replace('/app/')

const buttons = document.querySelectorAll<HTMLButtonElement>('[data-install]')
const hint = document.querySelector<HTMLElement>('[data-install-hint]')
let deferred: InstallPromptEvent | null = null

function showButtons(visible: boolean) {
  buttons.forEach((button) => (button.hidden = !visible))
}

function showHint(text: string | null) {
  if (!hint) return
  hint.hidden = text === null
  hint.textContent = text ?? ''
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferred = event as InstallPromptEvent
  showButtons(true)
})

window.addEventListener('appinstalled', () => {
  deferred = null
  showButtons(false)
  showHint('Installed. Open OpenLog from your home screen or app list.')
})

buttons.forEach((button) =>
  button.addEventListener('click', async () => {
    if (!deferred) return
    const prompt = deferred
    deferred = null
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'dismissed') {
      // The event is single-use; Chrome fires a fresh one later if it can.
      showButtons(false)
    }
  }),
)

// iOS Safari has no install prompt: point at the Share sheet instead.
const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
if (ios && !standalone) showHint('On iPhone: tap Share, then Add to Home Screen.')
