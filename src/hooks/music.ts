import { useSyncExternalStore } from 'react'

/**
 * Music buttons in the workout screen. A web app cannot talk to Apple Music directly, so each button runs a tiny
 * Shortcut on the iPhone (Play/Pause, Next, Previous). The person makes the three shortcuts once. Off by default.
 */
const KEY = 'lift.musicButtons'
const listeners = new Set<() => void>()
const read = (): boolean => { try { return localStorage.getItem(KEY) === 'on' } catch { return false } }
export const setMusicButtons = (on: boolean) => { try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* lasts until reload */ } listeners.forEach((l) => l()) }
export const useMusicButtons = (): boolean => useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb) } }, read, () => false)

export const MUSIC_SHORTCUTS = { previous: 'Lift Music Previous', toggle: 'Lift Music Play Pause', next: 'Lift Music Next' } as const

/** The link that runs one of the shortcuts and then comes back to this page. */
export function musicLink(name: string, back: string): string {
  return `shortcuts://x-callback-url/run-shortcut?name=${encodeURIComponent(name)}&x-success=${encodeURIComponent(back)}`
}
