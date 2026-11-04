import { describe, expect, it } from 'vitest'
import { kcalFor, restingKcal } from './activity'

describe('approximate calories burned', () => {
  const man = { weightKg: 80, heightCm: 180, age: 30, sex: 'male' as const }
  it('resting burn follows the Mifflin-St Jeor equation', () => {
    expect(restingKcal(man)).toBe(1780)
    expect(restingKcal({ ...man, sex: 'female' })).toBe(1614)
  })
  it('needs height, weight and age', () => {
    expect(restingKcal({ weightKg: 70, age: 30 })).toBeNull()
  })
  it('a taller, heavier, younger person burns more in the same session', () => {
    const small = { weightKg: 55, heightCm: 158, age: 45, sex: 'female' as const }
    expect(kcalFor(4.75, 45, man)).toBeGreaterThan(kcalFor(4.75, 45, small))
  })
  it('a 45 minute session is in a believable range', () => {
    const k = kcalFor(4.75, 45, man)
    expect(k).toBeGreaterThan(200)
    expect(k).toBeLessThan(400)
  })
  it('zero minutes burns nothing; unknown height falls back to body weight', () => {
    expect(kcalFor(5, 0, man)).toBe(0)
    expect(kcalFor(5, 60, { weightKg: 70 })).toBe(350)
  })
})
