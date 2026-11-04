import { describe, expect, it } from 'vitest'
import { CATALOG } from '../data/catalog'
import { generateWorkout, type GenerateInput } from './generate'
import { loadSpec } from './equipment'
import { snapToSpec } from './progression'
import { needsBench } from './requirements'
import type { EquipmentSet } from './types'

const home = (extra: EquipmentSet): EquipmentSet => ({ bodyweight: { id: 'bodyweight', available: true }, mat: { id: 'mat', available: true }, ...extra })
const db12: EquipmentSet = { dumbbell: { id: 'dumbbell', available: true, weights: [12], minWeight: 12, maxWeight: 12, increment: 5, unit: 'lb' } }
const input = (over: Partial<GenerateInput>): GenerateInput => ({
  date: '2026-10-22', planDay: { focus: 'Full', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'glutes', 'core'] },
  minutes: 60, goal: 'general', experience: 'beginner', equipment: home(db12), excludedExerciseIds: [], excludedPatterns: [],
  catalog: CATALOG, lastPerformance: {}, soreness: {}, weightUnit: 'lb', cardioChoice: 'none', ...over,
})
const lifts = (i: GenerateInput) => {
  const r = generateWorkout(i)
  if (r.kind !== 'workout') throw new Error(r.kind)
  return r.workout.exercises.filter((e) => e.kind !== 'cardio')
}

describe('equipment is respected', () => {
  it('never suggests a bench exercise when there is no bench', () => {
    const w = lifts(input({ experience: 'regular', weightKg: 80, sex: 'male' }))
    for (const e of w) expect(needsBench(CATALOG.find((c) => c.id === e.exerciseId)!)).toBe(false)
    expect(needsBench(CATALOG.find((c) => c.name === 'Dumbbell Tricep Extension -Pronated Grip')!)).toBe(true)
  })
  it('allows bench exercises once a bench is ticked', () => {
    const eq = home({ ...db12, bench: { id: 'bench', available: true } })
    const names = CATALOG.filter((e) => e.exerciseType === 'dumbbell' && needsBench(e)).length
    expect(names).toBeGreaterThan(0)
    expect(lifts(input({ equipment: eq, weightKg: 80, sex: 'male', experience: 'regular' })).length).toBeGreaterThan(0)
  })
  it('uses only the exact weights owned', () => {
    const spec = loadSpec(db12, 'dumbbell')!
    expect(snapToSpec(5, spec)).toBe(12)
    expect(snapToSpec(30, spec)).toBe(12)
    for (const e of lifts(input({ weightKg: 70, sex: 'male', experience: 'intermediate' }))) {
      if (e.suggestedWeight !== undefined && CATALOG.find((c) => c.id === e.exerciseId)!.exerciseType === 'dumbbell') expect(e.suggestedWeight).toBe(12)
    }
  })
  it('keeps small isolation moves away from a light beginner who only has 12 lb', () => {
    const w = lifts(input({ weightKg: 55, sex: 'female', experience: 'beginner' }))
    const names = w.map((e) => e.name)
    expect(names).not.toContain('Dumbbell Raise')
    expect(names).not.toContain('Dumbbell Bicep Curl')
    expect(w.length).toBeGreaterThan(2)
  })
  it('keeps heavy compound dumbbell moves away from a strong lifter who only has 12 lb', () => {
    const w = lifts(input({ weightKg: 90, sex: 'male', experience: 'regular', planDay: { focus: 'Legs', muscles: ['quads', 'glutes'] } }))
    const heavyOnes = w.filter((e) => { const c = CATALOG.find((x) => x.id === e.exerciseId)!; return c.exerciseType === 'dumbbell' && c.compound })
    expect(heavyOnes.length).toBeLessThanOrEqual(w.length / 2)
  })
})
