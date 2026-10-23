/** Beep-beep and a short buzz for the last seconds of a rest. Per-device preference; on by default. */
const KEY = 'lift.restAlert'
export const restAlertOn = (): boolean => { try { return localStorage.getItem(KEY) !== 'off' } catch { return true } }
export const setRestAlert = (on: boolean) => { try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* lasts until reload */ } }

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

/** Two short beeps and a one second buzz where the phone allows it. iPhone Safari has no vibration, so it only beeps. */
export function tenSecondWarning() {
  if (!restAlertOn()) return
  try { navigator.vibrate?.([200, 100, 200, 100, 400]) } catch { /* not supported */ }
  try {
    if (!ctx) return
    const t0 = ctx.currentTime
    for (const [i, start] of [0, 0.28].entries()) {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = i === 0 ? 880 : 1175
      g.gain.setValueAtTime(0.0001, t0 + start)
      g.gain.exponentialRampToValueAtTime(0.4, t0 + start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + 0.2)
      o.connect(g).connect(ctx.destination)
      o.start(t0 + start); o.stop(t0 + start + 0.22)
    }
  } catch { /* sound is a bonus */ }
}
