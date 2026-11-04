/**
 * Unsaved form input is kept as a draft on this phone, so going Back never erases it.
 * A draft lasts a day, is removed when the form is saved, and is wiped by "Delete all data".
 */
const PREFIX = 'lift.draft.'
const DAY_MS = 24 * 60 * 60 * 1000

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const o = JSON.parse(raw) as { at: number; v: T }
    if (Date.now() - o.at > DAY_MS) { localStorage.removeItem(PREFIX + key); return null }
    return o.v
  } catch { return null }
}

export function saveDraft(key: string, v: unknown): void {
  try { localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), v })) } catch { /* private mode or full: the draft is simply not kept */ }
}

export function clearDraft(key: string): void {
  try { localStorage.removeItem(PREFIX + key) } catch { /* nothing to clear */ }
}

export function clearAllDrafts(): void {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k)
  } catch { /* nothing to clear */ }
}
