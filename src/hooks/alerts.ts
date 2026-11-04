/** Rest timer alerts: a 2 second vibration and a 1 second beep, each with its own switch. Per-device; both on by default. */
const read = (key: string): boolean => { try { return localStorage.getItem(key) !== 'off' } catch { return true } }
const write = (key: string, on: boolean) => { try { localStorage.setItem(key, on ? 'on' : 'off') } catch { /* lasts until reload */ } }

export const restAlertOn = (): boolean => read('lift.restAlert')
export const setRestAlert = (on: boolean) => write('lift.restAlert', on)
export const restBeepOn = (): boolean => read('lift.restBeep')
export const setRestBeep = (on: boolean) => write('lift.restBeep', on)

let ctx: AudioContext | null = null
/** Call from a tap (for example when a set is logged): browsers only allow sound after a user gesture. */
export function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch { /* no audio available */ }
}

/** One 1 second beep. */
export function beepNow() {
  try {
    if (!ctx) return
    const t0 = ctx.currentTime
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.type = 'sine'; o.frequency.value = 880
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.03)
    g.gain.setValueAtTime(0.4, t0 + 0.9)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1)
    o.connect(g).connect(ctx.destination)
    o.start(t0); o.stop(t0 + 1.02)
  } catch { /* sound is a bonus */ }
}

/** Vibrates for 2 seconds where the phone allows it (Android; iPhone web apps cannot). */
export function restVibrate() {
  if (restAlertOn()) { try { navigator.vibrate?.(2000) } catch { /* not supported */ } }
}
