/**
 * Registers the service worker (production builds only).
 * Updates use a "prompt" strategy: a new version waits until the user taps Reload,
 * so an update can never interrupt a workout. Saved data lives in IndexedDB and is not touched by updates.
 */
export function registerPwa(handlers: { onNeedRefresh: (update: () => void) => void; onOfflineReady: () => void }): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  void import('virtual:pwa-register').then(({ registerSW }) => {
    const update = registerSW({
      onNeedRefresh: () => handlers.onNeedRefresh(() => void update(true)),
      onOfflineReady: handlers.onOfflineReady,
    })
  })
}
