import { describe, expect, it } from 'vitest'
import { CATALOG, exerciseById } from '../data/catalog'
import { presetEquipment } from './equipment'
import { alternativesFor, equipmentOptions, sessionEstimateMinutes } from './variants'
import type { Exercise } from './types'

const gym = presetEquipment('planet_fitness', 'lb')
const home = presetEquipment('home', 'lb')
const rules = (equipment = gym, extra: Partial<Parameters<typeof alternativesFor>[1]> = {}) => ({
  catalog: CATALOG, equipment, excludedExerciseIds: [], excludedPatterns: [], experience: 'regular' as const, ...extra,
})
const pick = (pred: (e: Exercise) => boolean) => CATALOG.find(pred)!

describe('replace keeps the day intent (US-064)', () => {
  const squat = pick((e) => e.primaryMuscles[0] === 'quads' && e.movementPattern === 'squat' && e.exerciseType === 'machine')

  it('offers only exercises for the same main muscle, with the same movement first', () => {
    const { best, related } = alternativesFor(squat, rules())
    expect(best.length + related.length).toBeGreaterThan(0)
    for (const e of [...best, ...related]) expect(e.primaryMuscles[0]).toBe('quads')
    for (const e of best) expect(e.movementPattern).toBe(squat.movementPattern)
    for (const e of related) expect(e.movementPattern).not.toBe(squat.movementPattern)
    expect([...best, ...related].some((e) => e.primaryMuscles[0] === 'biceps')).toBe(false)
  })

  it('respects equipment, exclusions and what is already in the session', () => {
    const base = alternativesFor(squat, rules()).best
    expect(base.length).toBeGreaterThan(0)
    const without = alternativesFor(squat, rules(gym, { excludedExerciseIds: [base[0].id] })).best
    expect(without.find((e) => e.id === base[0].id)).toBeUndefined()
    const used = alternativesFor(squat, rules(), [base[0].id]).best
    expect(used.find((e) => e.id === base[0].id)).toBeUndefined()
    const homeAlts = alternativesFor(squat, rules(home))
    for (const e of [...homeAlts.best, ...homeAlts.related]) expect(e.equipmentIds.every((q) => q === 'bodyweight' || q === 'mat')).toBe(true)
    const noPattern = alternativesFor(squat, rules(gym, { excludedPatterns: ['squat'] }))
    expect(noPattern.best).toHaveLength(0)
  })

  it('can come back empty, which the screen explains', () => {
    const lonely = pick((e) => e.exerciseType === 'machine' && e.equipmentIds.includes('machine'))
    const none = alternativesFor(lonely, rules(home))
    expect([...none.best, ...none.related].every((e) => e.primaryMuscles[0] === lonely.primaryMuscles[0])).toBe(true)
  })
})

describe('per-exercise equipment (US-065)', () => {
  const press = pick((e) => e.primaryMuscles[0] === 'chest' && e.movementPattern === 'push' && e.exerciseType === 'dumbbell')

  it('marks the current equipment, offers valid alternatives and keeps bodyweight selectable', () => {
    const opts = equipmentOptions(press, rules())
    expect(opts.find((o) => o.current)?.type).toBe('dumbbell')
    const bw = opts.find((o) => o.type === 'bodyweight')
    expect(bw?.exerciseId).toBeTruthy() // bodyweight is not switched off by a gym profile
    for (const o of opts.filter((x) => x.exerciseId && !x.current)) {
      const ex = exerciseById(o.exerciseId!)!
      expect(ex.exerciseType).toBe(o.type)
      expect(ex.movementPattern).toBe(press.movementPattern)
      expect(ex.primaryMuscles[0]).toBe('chest')
    }
  })

  it('explains why equipment is not available instead of hiding it', () => {
    const opts = equipmentOptions(press, rules())
    const barbell = opts.find((o) => o.type === 'barbell')
    expect(barbell).toBeTruthy()
    expect(barbell?.exerciseId).toBeUndefined()
    expect(barbell?.reason).toMatch(/barbell/i) // Planet Fitness has no barbell
  })

  it('a home profile only offers what is usable there', () => {
    const opts = equipmentOptions(press, rules(home))
    expect(opts.filter((o) => o.exerciseId && !o.current).every((o) => o.type === 'bodyweight')).toBe(true)
  })
})

describe('session length is recalculated (US-064)', () => {
  const planned = (id: string, sets = 3, rest = 90) => ({ slotId: 's', exerciseId: id, name: 'x', sets, repMin: 8, repMax: 10, restSeconds: rest, loadNote: '', why: '' })
  it('drops when a slot is skipped and reflects a compound/isolation swap', () => {
    const compound = pick((e) => e.compound && e.primaryMuscles[0] === 'chest')
    const iso = pick((e) => !e.compound && e.primaryMuscles[0] === 'chest')
    const base = { plannedExercises: [planned(compound.id)], actualExercises: [{ slotId: 's', exerciseId: compound.id, skipped: false, painReported: false }], plannedMinutes: 30 }
    const full = sessionEstimateMinutes(base, 'muscle')
    expect(sessionEstimateMinutes({ ...base, actualExercises: [{ ...base.actualExercises[0], skipped: true }] }, 'muscle')).toBeLessThan(full)
    const swapped = sessionEstimateMinutes({ ...base, actualExercises: [{ ...base.actualExercises[0], exerciseId: iso.id }] }, 'muscle')
    expect(swapped).toBeLessThanOrEqual(full) // isolation lifts rest less than compounds
  })
})
