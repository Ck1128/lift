import { describe, expect, it } from 'vitest'
import { ringState } from './Ring'

describe('ringState', () => {
  it('starts full and closes as time passes', () => {
    expect(ringState(0, 45, 0, 10).timeLeft).toBe(1)
    expect(ringState(22.5 * 60_000, 45, 5, 10).timeLeft).toBeCloseTo(0.5)
  })
  it('counts time over once the plan has run out', () => {
    const s = ringState(50 * 60_000, 45, 10, 10)
    expect(s.timeLeft).toBe(0)
    expect(s.over).toBe(true)
    expect(s.seconds).toBe(300)
  })
  it('fills the sets ring and copes with zero sets', () => {
    expect(ringState(0, 45, 3, 12).setsFill).toBeCloseTo(0.25)
    expect(ringState(0, 45, 0, 0).setsFill).toBe(0)
  })
})
