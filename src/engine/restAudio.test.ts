import { buildRestWav } from './restAudio'

describe('rest beep audio', () => {
  it('is a valid 8 kHz mono WAV of the right length', () => {
    const w = buildRestWav(30, 20)
    expect(String.fromCharCode(...w.slice(0, 4))).toBe('RIFF')
    expect(String.fromCharCode(...w.slice(8, 12))).toBe('WAVE')
    expect(w.length).toBe(44 + 30 * 8000)
  })
  it('is silent except for one second at the beep time', () => {
    const w = buildRestWav(30, 20)
    const at = (sec: number) => w.slice(44 + sec * 8000, 44 + (sec + 1) * 8000)
    expect(Array.from(at(5)).every((b) => b === 128)).toBe(true)
    expect(Array.from(at(20)).some((b) => Math.abs(b - 128) > 50)).toBe(true)
    expect(Array.from(at(22)).every((b) => b === 128)).toBe(true)
  })
})
