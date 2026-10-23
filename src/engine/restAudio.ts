/**
 * A WAV file that is silent except for one 1 second beep, so the beep can play while the screen is locked or the app is
 * in the background. A web page cannot run timers then, but a playing audio file keeps going. Small on purpose:
 * 8 kHz, 8-bit, mono.
 */
const RATE = 8000

export function buildRestWav(totalSeconds: number, beepAtSeconds: number | null): Uint8Array {
  const n = Math.max(1, Math.round(totalSeconds * RATE))
  const data = new Uint8Array(n).fill(128)
  if (beepAtSeconds !== null && beepAtSeconds >= 0) {
    const start = Math.round(beepAtSeconds * RATE)
    for (let i = 0; i < RATE && start + i < n; i++) {
      const fade = Math.min(1, i / 240, (RATE - i) / 240)
      data[start + i] = 128 + Math.round(Math.sin((2 * Math.PI * 880 * i) / RATE) * 100 * fade)
    }
  }
  const out = new Uint8Array(44 + n)
  const v = new DataView(out.buffer)
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i) }
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, RATE, true); v.setUint32(28, RATE, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true)
  str(36, 'data'); v.setUint32(40, n, true)
  out.set(data, 44)
  return out
}
