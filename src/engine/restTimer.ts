/**
 * Rest timer as pure functions. The timer stores an end timestamp, never a counter,
 * so time keeps passing correctly while the phone is locked or the tab is in the background.
 */
export interface RestTimer {
  /** Epoch ms when the rest ends. Only meaningful while not paused. */
  endAt: number
  /** Set while paused: how many ms were left when it was paused. */
  pausedRemainingMs?: number
}

export const startRest = (now: number, seconds: number): RestTimer => ({ endAt: now + Math.max(0, seconds) * 1000 })

export const remainingMs = (t: RestTimer, now: number): number =>
  Math.max(0, t.pausedRemainingMs !== undefined ? t.pausedRemainingMs : t.endAt - now)

export const isPaused = (t: RestTimer): boolean => t.pausedRemainingMs !== undefined
export const isFinished = (t: RestTimer, now: number): boolean => !isPaused(t) && remainingMs(t, now) === 0

export const pauseRest = (t: RestTimer, now: number): RestTimer =>
  isPaused(t) ? t : { endAt: t.endAt, pausedRemainingMs: remainingMs(t, now) }

export const resumeRest = (t: RestTimer, now: number): RestTimer =>
  isPaused(t) ? { endAt: now + (t.pausedRemainingMs ?? 0) } : t

export const addRest = (t: RestTimer, seconds: number, now: number): RestTimer =>
  isPaused(t)
    ? { endAt: t.endAt, pausedRemainingMs: (t.pausedRemainingMs ?? 0) + seconds * 1000 }
    : { endAt: Math.max(t.endAt, now) + seconds * 1000 }

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
