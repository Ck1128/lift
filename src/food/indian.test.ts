import { INDIAN_FOODS } from '../data/indianFoods'
import { matchLocal } from './providers'

describe('Indian foods with Telugu names', () => {
  it('has a large list, every item with a Telugu name and unique ids', () => {
    expect(INDIAN_FOODS.length).toBeGreaterThan(600)
    const ids = INDIAN_FOODS.map((f) => f.providerId)
    expect(new Set(ids).size).toBe(ids.length)
    for (const f of INDIAN_FOODS) {
      expect(f.nameTe, f.name).toMatch(/[ఀ-౿]/)
      expect(f.approximate).toBe(true)
    }
  })

  it('calories roughly agree with the protein, carbs and fat of each food', () => {
    const bad: string[] = []
    for (const f of INDIAN_FOODS) for (const s of f.states) {
      const est = 4 * (s.proteinPer100 ?? 0) + 4 * (s.carbsPer100 ?? 0) + 9 * (s.fatPer100 ?? 0)
      // Whole spices are mostly fibre, which has few calories, and are eaten in pinches: skip them here.
      if (s.unitSize.tsp !== undefined && s.kcalPer100 < 340) continue
      // Fibre, alcohol and rounding make small foods differ; large gaps point to a typing mistake.
      if (Math.abs(est - s.kcalPer100) > Math.max(45, s.kcalPer100 * 0.3)) bad.push(`${f.name} (${s.state}): ${s.kcalPer100} vs ${Math.round(est)}`)
      expect(s.kcalPer100).toBeGreaterThanOrEqual(0)
      expect(Object.values(s.unitSize).every((g) => (g ?? 0) > 0)).toBe(true)
    }
    expect(bad).toEqual([])
  })

  it('finds foods by Telugu letters, Telugu script, English and Hindi names', () => {
    const first = (q: string) => matchLocal(q).map((f) => f.name)
    expect(first('sorakaya')).toContain('Bottle gourd (squash)')
    expect(first('సొరకాయ')).toContain('Bottle gourd (squash)')
    expect(first('squash')).toContain('Bottle gourd (squash)')
    expect(first('lauki')).toContain('Bottle gourd (squash)')
    expect(first('bendakaya')).toContain('Okra (ladies finger)')
    expect(first('pesarattu')[0]).toBe('Pesarattu (green gram dosa)')
    expect(first('kandipappu')).toContain('Toor dal (pigeon pea, split)')
    expect(first('పెరుగు')).toContain('Curd / dahi (whole milk)')
    expect(first('idli')[0]).toBe('Idli')
  })

  it('still finds everyday foods and ignores accents', () => {
    expect(matchLocal('banana').length).toBeGreaterThan(0)
    expect(matchLocal('cafe').length).toBe(matchLocal('café').length)
  })
})
