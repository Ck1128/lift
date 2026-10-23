/** A two second buzz when a rest ends. No sound. Per-device preference; on by default. */
const KEY = 'lift.restAlert'
export const restAlertOn = (): boolean => { try { return localStorage.getItem(KEY) !== 'off' } catch { return true } }
export const setRestAlert = (on: boolean) => { try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* lasts until reload */ } }

/** Vibrates for 2 seconds where the phone allows it (Android). iPhone web apps cannot vibrate, so nothing happens there. */
export function restEndBuzz() {
  if (!restAlertOn()) return
  try { navigator.vibrate?.(2000) } catch { /* not supported */ }
}
