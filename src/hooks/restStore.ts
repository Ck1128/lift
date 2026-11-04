import { useSyncExternalStore } from 'react'
import { addRest, isFinished, isPaused, pauseRest, resumeRest, startRest, type RestTimer } from '../engine/restTimer'
import { buildRestWav } from '../engine/restAudio'
import { beepNow, restBeepOn, restVibrate } from './alerts'

/**
 * The rest timer lives here, outside any screen, so it keeps running when you change tabs.
 * It stores an end time (saved on the phone), so it is still right after the app was in the background,
 * the screen was locked, or the app was reopened. While a rest runs, a quiet audio file with the 1 second beep inside
 * plays, because that is what keeps iPhone sounding the beep with the screen locked.
 */
const KEY = 'lift.rest'
let timer: RestTimer | null = load()
const listeners = new Set<() => void>()
let endT: ReturnType<typeof setTimeout> | undefined
let warnT: ReturnType<typeof setTimeout> | undefined
let audio: HTMLAudioElement | null = null
let audioPlaying = false
let audioUrl: string | null = null

function load(): RestTimer | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const t = JSON.parse(raw) as RestTimer
    return typeof t.endAt === 'number' && !isFinished(t, Date.now()) ? t : null
  } catch { return null }
}
function save() { try { if (timer) localStorage.setItem(KEY, JSON.stringify(timer)); else localStorage.removeItem(KEY) } catch { /* lasts until reload */ } }

function stopAudio() {
  audioPlaying = false
  try { audio?.pause() } catch { /* no audio */ }
  audio = null
  if (audioUrl) { try { URL.revokeObjectURL(audioUrl) } catch { /* ignore */ } audioUrl = null }
}

function startAudio(remainingMs: number) {
  stopAudio()
  if (!restBeepOn() || typeof Audio === 'undefined') return
  try {
    const secs = Math.ceil(remainingMs / 1000)
    const beepAt = secs > 10 ? secs - 10 : null
    if (beepAt === null) return
    const nav = navigator as unknown as { audioSession?: { type: string } }
    if (nav.audioSession) nav.audioSession.type = 'ambient' // mix with the music you already have playing
    audioUrl = URL.createObjectURL(new Blob([buildRestWav(secs + 1, beepAt) as BlobPart], { type: 'audio/wav' }))
    const a = new Audio(audioUrl)
    audio = a
    a.play().then(() => { if (audio === a) audioPlaying = true }).catch(() => { audioPlaying = false })
  } catch { /* the in-page beep is the fallback */ }
}

function clearTimers() { clearTimeout(endT); clearTimeout(warnT); endT = warnT = undefined }

function arm() {
  clearTimers()
  if (!timer || isPaused(timer)) return
  const left = timer.endAt - Date.now()
  if (left <= 0) { set(null); return }
  endT = setTimeout(() => set(null), left)
  const warnIn = left - 10_000
  if (warnIn > 0) {
    warnT = setTimeout(() => {
      restVibrate()
      if (restBeepOn() && !audioPlaying) beepNow()
    }, warnIn)
  }
}

function set(next: RestTimer | null, audioFor?: number) {
  timer = next
  save()
  if (!next || isPaused(next)) stopAudio()
  else if (audioFor !== undefined) startAudio(audioFor)
  arm()
  listeners.forEach((l) => l())
}

export const rest = {
  start: (seconds: number) => set(startRest(Date.now(), seconds), seconds * 1000),
  pause: () => { if (timer) set(pauseRest(timer, Date.now())) },
  resume: () => { if (timer) { const t = resumeRest(timer, Date.now()); set(t, t.endAt - Date.now()) } },
  add: (seconds: number) => { if (timer) { const t = addRest(timer, seconds, Date.now()); set(t, isPaused(t) ? undefined : t.endAt - Date.now()) } },
  skip: () => set(null),
  /** For tests. */
  current: () => timer,
}

if (typeof document !== 'undefined') {
  // Timers freeze while the phone sleeps; on return, finish or re-arm against the real clock.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    if (timer && !isPaused(timer) && timer.endAt <= Date.now()) set(null)
    else arm()
  })
  arm()
}

export function useRest(): RestTimer | null {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => timer)
}
