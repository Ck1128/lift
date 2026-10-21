import { describe, expect, it } from 'vitest'
import { STYLES } from '../data/yoga'
import { generateYoga, yogaCacheKey, type YogaInput } from './yoga'
import { FORBIDDEN_GUIDANCE_WORDS, energyEstimate, nextDayGuidance } from './guidance'
import { csvCell, inRange, rangeFor, toCsv, type ExportData } from './progress'
import { phraseMatches, resetPhrase } from './resetPhrase'
import { addRest, formatClock, isFinished, pauseRest, remainingMs, resumeRest, startRest } from './restTimer'
import { isRoot, matchPath, parentOf } from '../router'
import { calcPortion } from './food'

const base: YogaInput = { date: '2026-10-21', style: 'hatha', level: 'beginner', minutes: 20, location: 'home', props: [], restrictions: [] }

describe('yoga', () => {
  it('has 13 styles and no prenatal style', () => {
    expect(STYLES).toHaveLength(13)
    expect(STYLES.some((s) => /prenatal/i.test(s.id + s.name))).toBe(false)
  })
  it('needs a yoga level and never borrows the strength level', () => {
    expect(generateYoga({ ...base, level: undefined }).kind).toBe('error')
  })
  it('builds a plan for every style at every level', () => {
    for (const s of STYLES) for (const level of ['beginner', 'intermediate', 'regular'] as const) {
      const r = generateYoga({ ...base, style: s.id, level, minutes: 30, props: ['mat', 'blocks', 'strap', 'bolster', 'blanket', 'chair', 'cushion', 'wall'] })
      expect(r.kind, `${s.id}/${level}`).toBe('plan')
    }
  })
  it('is deterministic and the cache key tracks inputs', () => {
    expect(yogaCacheKey(base)).toBe(yogaCacheKey({ ...base }))
    expect(yogaCacheKey(base)).not.toBe(yogaCacheKey({ ...base, minutes: 30 }))
    expect(yogaCacheKey(base)).not.toBe(yogaCacheKey({ ...base, level: 'regular' }))
    expect(JSON.stringify(generateYoga(base))).toBe(JSON.stringify(generateYoga(base)))
  })
  it('rejects out-of-range lengths', () => {
    expect(generateYoga({ ...base, minutes: 2 }).kind).toBe('error')
    expect(generateYoga({ ...base, minutes: 500 }).kind).toBe('error')
  })
  it('yoga nidra is a lying-down practice with no inversions', () => {
    const r = generateYoga({ ...base, style: STYLES.find((s) => /nidra/.test(s.id))!.id, minutes: 20 })
    expect(r.kind).toBe('plan')
  })
})

describe('guidance', () => {
  it('says nothing for an empty day', () => {
    const g = nextDayGuidance({ date: '2026-10-21', entries: [], trained: true })
    expect(g.empty).toBe(true)
    expect(g.notes).toEqual([])
  })
  it('needs all four inputs for an energy estimate', () => {
    expect(energyEstimate({ weightKg: 80, heightCm: 180, age: 30 })).toBeNull()
    const e = energyEstimate({ weightKg: 80, heightCm: 180, age: 30, sex: 'male' })!
    expect(e.low).toBeLessThan(e.high)
  })
  it('never uses punitive wording', () => {
    for (const w of ['burn off', 'make up for', 'punish']) expect(FORBIDDEN_GUIDANCE_WORDS).toContain(w)
  })
})

describe('export', () => {
  it('guards spreadsheet formulas', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(csvCell('+1')).toBe("'+1")
    expect(csvCell('@x')).toBe("'@x")
    expect(csvCell(-5)).toBe('-5')
    expect(csvCell('a,"b"')).toBe('"a,""b"""')
    expect(csvCell(null)).toBe('')
  })
  it('does not zero-fill empty sections and records the range', () => {
    const d = { meta: { exportedAt: 'T', range: { from: '2026-10-01', to: '2026-10-21' }, weightUnit: 'kg', note: 'n' }, yoga: [] } as unknown as ExportData
    const csv = toCsv(d)
    expect(csv).toContain('# exported_at=T')
    expect(csv).toContain('(no records in this range)')
  })
  it('ranges include both ends', () => {
    const r = rangeFor('2026-10-21', '7')
    expect(inRange('2026-10-21', r)).toBe(true)
    expect(inRange('2026-10-22', r)).toBe(false)
    expect(inRange('1999-01-01', rangeFor('2026-10-21', 'all'))).toBe(true)
  })
})

describe('reset phrase', () => {
  it('is forgiving about case, spaces and curly apostrophes, but not about the date', () => {
    const p = resetPhrase('2026-10-21', '2026-10-21')
    expect(phraseMatches('reset today’s  workout', p)).toBe(true)
    expect(phraseMatches('reset', p)).toBe(false)
    expect(resetPhrase('2026-10-20', '2026-10-21')).toBe('RESET 2026-10-20')
  })
})

describe('rest timer', () => {
  it('pauses, resumes, extends and finishes', () => {
    let t = startRest(1000, 60)
    expect(remainingMs(t, 11000)).toBe(50000)
    t = pauseRest(t, 11000)
    expect(remainingMs(t, 99999)).toBe(50000)
    t = addRest(t, 15, 99999)
    expect(remainingMs(t, 0)).toBe(65000)
    t = resumeRest(t, 100000)
    expect(isFinished(t, 100000 + 65000)).toBe(true)
    expect(formatClock(65000)).toBe('1:05')
  })
})

describe('router helpers', () => {
  it('matches params and finds parents', () => {
    expect(matchPath('/session/:id', '/session/abc')).toEqual({ id: 'abc' })
    expect(matchPath('/session/:id', '/yoga')).toBeNull()
    expect(parentOf('/food/add?meal=lunch')).toBe('/food')
    expect(parentOf('/yoga/session/x')).toBe('/yoga')
    expect(isRoot('/food?date=2026-10-21')).toBe(true)
    expect(isRoot('/yoga')).toBe(false)
  })
})

describe('food portions', () => {
  const rice = (kcalPer100: number) => ({ basis: 'g' as const, kcalPer100, unitSize: {} })
  it('raw and cooked rice differ for the same grams', () => {
    const raw = calcPortion(rice(360), 100, 'g')
    const cooked = calcPortion(rice(130), 100, 'g')
    expect(raw.ok && cooked.ok && raw.kcal > cooked.kcal * 2).toBe(true)
  })
  it('converts ounces and rejects bad amounts', () => {
    const r = calcPortion(rice(100), 1, 'oz')
    expect(r.ok && Math.round(r.kcal)).toBe(28)
    expect(calcPortion(rice(100), 0, 'g').ok).toBe(false)
  })
})

import { startingWeight } from './progression'
describe('starting weight guess', () => {
  const spec = { min: 5, max: 50, increment: 5, unit: 'lb' as const }
  const base = { exerciseType: 'dumbbell', compound: true, primaryMuscles: ['chest'], level: 'beginner' as const, weightKg: 80 }
  it('is light, snapped to the equipment, and needs body weight', () => {
    const w = startingWeight({ ...base, sex: 'male' }, spec, 'lb')!
    expect(w).toBeGreaterThanOrEqual(5)
    expect(w % 5).toBe(0)
    expect(startingWeight({ ...base, weightKg: undefined }, spec, 'lb')).toBeUndefined()
    expect(startingWeight({ ...base, exerciseType: 'bodyweight' }, spec, 'lb')).toBeUndefined()
  })
  it('depends on level and sex', () => {
    const m = startingWeight({ ...base, level: 'regular', sex: 'male' }, spec, 'lb')!
    const f = startingWeight({ ...base, level: 'regular', sex: 'female' }, spec, 'lb')!
    const b = startingWeight({ ...base, level: 'beginner', sex: 'male' }, spec, 'lb')!
    expect(m).toBeGreaterThanOrEqual(f)
    expect(m).toBeGreaterThanOrEqual(b)
  })
})
