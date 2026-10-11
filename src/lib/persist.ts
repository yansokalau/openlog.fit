/**
 * Asks the browser to stop evicting this origin's storage.
 *
 * Safari clears a site's IndexedDB after seven days without a visit, which is
 * exactly the shape of a training log — a week off is a normal week. Persisted
 * storage is exempt, and on iOS Safari grants it to a site installed to the
 * home screen. Chrome and Firefox weigh it against how much the site is used.
 *
 * Nothing here blocks or reports back to the user: a denial is a browser-level
 * decision, not something to argue with, and backup/restore already covers the
 * case where data is lost anyway.
 */

/** One attempt per page load — Firefox turns this into a visible prompt. */
let asked = false

export async function keepData(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!navigator.storage?.persist) return 'unsupported'

  try {
    if (await navigator.storage.persisted()) return 'granted'
    if (asked) return 'denied'
    asked = true
    return (await navigator.storage.persist()) ? 'granted' : 'denied'
  } catch {
    return 'unsupported'
  }
}
