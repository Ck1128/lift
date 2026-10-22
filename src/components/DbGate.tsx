import { useEffect, useState, type ReactNode } from 'react'
import { db } from '../db/schema'
import { migrateGymNames } from '../db/migrate'
import { Button } from './ui'

/**
 * Asks the browser not to clear this app's saved data when the device runs low on space.
 * It is a request only: nothing is shown, nothing is sent anywhere, and the app works the same if it is refused.
 */
function askBrowserToKeepData(): void {
  try { void navigator.storage?.persist?.().catch(() => undefined) } catch { /* not supported: fine */ }
}

/**
 * Opens the local database and, if that fails (for example an upgrade could not finish), shows a plain recovery
 * message instead of an endless "Loading...". It never deletes or resets anything: a failed upgrade leaves the old
 * data in place, and reloading is safe.
 */
export function DbGate({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    db.open().then(() => { askBrowserToKeepData(); return migrateGymNames() }).catch((e: unknown) => {
      if (alive) setError(e instanceof Error ? e.message : 'unknown error')
    })
    return () => { alive = false }
  }, [])

  if (error === null) return <>{children}</>
  return (
    <div className="app">
      <main className="content">
        <h1>We could not open your saved data</h1>
        <p role="alert">Your data has <strong>not</strong> been changed or deleted. The app could not finish opening its local database.</p>
        <ol>
          <li>Close any other open tabs or windows of this app, then reload this page. An update can wait for an old tab to close.</li>
          <li>If it still fails, restart your browser or phone and open the app again.</li>
          <li>Do not clear website data for this site: that would erase your history. If you have a backup file, it can be restored once the app opens.</li>
        </ol>
        <p className="hint">Technical detail: {error}</p>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </main>
    </div>
  )
}
