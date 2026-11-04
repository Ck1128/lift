import { describe, expect, it } from 'vitest'
import { CATALOG } from '../data/catalog'
import { generateWorkout, type GenerateInput } from './generate'
import { presetEquipment } from './equipment'
import { buildAdaptPlan, adaptDelta } from './adapt'
import { painAffects, painBlocks } from './pain'
import type { SetLog, WorkoutSession } from './types'

const base = (over: Partial<GenerateInput> = {}): GenerateInput => ({
  date: '2026-10-22', planDay: { focus: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'core'] }, minutes: 60, goal: 'general',
  experience: 'intermediate', equipment: presetEquipment('generic_gym', 'lb'), excludedExerciseIds: [], excludedPatterns: [], catalog: CATALOG,
  lastPerformance: {}, soreness: {}, weightUnit: 'lb', cardioChoice: 'none', ...over,
})
const names = (i: GenerateInput) => {
  const r = generateWorkout(i)
  if (r.kind !== 'workout') return []
  return r.workout.exercises.filter((e) => e.kind !== 'cardio').map((e) => CATALOG.find((c) => c.id === e.exerciseId)!)
}

describe('pain check', () => {
  it('moderate knee pain removes exercises that load the knee', () => {
    const ex = names(base({ pain: { knee: 2 } }))
    expect(ex.length).toBeGreaterThan(0)
    for (const e of ex) expect(painAffects('knee', e)).toBe(false)
    expect(names(base()).some((e) => painAffects('knee', e))).toBe(true)
  })
  it('mild pain keeps the exercise but trims a set', () => {
    const normal = generateWorkout(base())
    const mild = generateWorkout(base({ pain: { knee: 1 } }))
    if (normal.kind !== 'workout' || mild.kind !== 'workout') throw new Error('expected workouts')
    const total = (w: typeof normal.workout) => w.exercises.reduce((a, e) => a + e.sets, 0)
    expect(total(mild.workout)).toBeLessThan(total(normal.workout))
    expect(mild.workout.notes.join(' ')).toMatch(/pain today/i)
  })
  it('pain changes the cache fingerprint so the workout is rebuilt', async () => {
    const { configHash } = await import('./generate')
    const { catalog: _c, ...a } = base()
    void _c
    expect(configHash({ ...a, catalogVersion: 'x', recentSessionIds: [] })).not.toBe(configHash({ ...a, pain: { knee: 2 }, catalogVersion: 'x', recentSessionIds: [] }))
  })
  it('severe pain everywhere explains why there is nothing to do', () => {
    const r = generateWorkout(base({ planDay: { focus: 'Legs', muscles: ['quads'] }, pain: { knee: 3, hip: 3, lower_back: 3, ankle: 3 } }))
    if (r.kind === 'error') expect(r.message).toMatch(/pain/i)
  })
  it('blocks nothing when there is no pain', () => {
    expect(painBlocks(undefined, CATALOG[0])).toBe(false)
    expect(painBlocks({}, CATALOG[0])).toBe(false)
  })
})

describe('the next workout is shaped by how the last one went', () => {
  const muscleOf = (id: string) => CATALOG.find((c) => c.id === id)?.primaryMuscles[0]
  const chest = CATALOG.find((c) => c.primaryMuscles[0] === 'chest')!
  const sess = (id: string, startedAt: string): WorkoutSession => ({ id, date: startedAt.slice(0, 10), startedAt, finishedAt: startedAt, status: 'completed', plannedExercises: [], actualExercises: [], title: 't', planVersion: 1, generatorVersion: 'g', targetMuscles: ['chest'], pausedMs: 0, weightUnit: 'lb' })
  const logs = (sessionId: string, effort: number, done = 3, total = 3): SetLog[] => Array.from({ length: total }, (_, i) => ({
    id: `${sessionId}${i}`, sessionId, slotId: 's1', exerciseId: chest.id, setNumber: i + 1, plannedRepMin: 8, plannedRepMax: 12, weightUnit: 'lb' as const,
    completed: i < done, effortRating: i < done ? effort : undefined, actualReps: 10, createdAt: '', updatedAt: '',
  }))
  it('a very hard session gives one set fewer next time', () => {
    const plan = buildAdaptPlan([sess('a', '2026-10-20T10:00:00Z')], logs('a', 9.5), muscleOf)
    expect(plan.muscles?.chest?.delta).toBe(-1)
    expect(adaptDelta(plan, chest)).toBe(-1)
  })
  it('two easy sessions in a row give one set more', () => {
    const plan = buildAdaptPlan([sess('a', '2026-10-20T10:00:00Z'), sess('b', '2026-10-18T10:00:00Z')], [...logs('a', 6), ...logs('b', 6)], muscleOf)
    expect(plan.muscles?.chest?.delta).toBe(1)
  })
  it('three hard sessions in a row trigger a lighter session', () => {
    const s = [sess('a', '2026-10-20T10:00:00Z'), sess('b', '2026-10-18T10:00:00Z'), sess('c', '2026-10-16T10:00:00Z')]
    const plan = buildAdaptPlan(s, [...logs('a', 8.8), ...logs('b', 8.8), ...logs('c', 8.8)], muscleOf)
    expect(plan.deload).toBe(true)
    expect(adaptDelta(plan, chest)).toBe(-1)
  })
  it('an ordinary session changes nothing', () => {
    expect(buildAdaptPlan([sess('a', '2026-10-20T10:00:00Z')], logs('a', 7.5), muscleOf).muscles).toEqual({})
  })
  it('the generator applies the change to the number of sets', () => {
    const plan = { muscles: { chest: { delta: -1 as const, reason: 'x' } } }
    const eq = presetEquipment('generic_gym', 'lb')
    const mk = (adapt?: typeof plan) => generateWorkout({ ...base({ planDay: { focus: 'Chest', muscles: ['chest'] }, equipment: eq, adapt }) })
    const a = mk(), b = mk(plan)
    if (a.kind !== 'workout' || b.kind !== 'workout') throw new Error('expected workouts')
    expect(b.workout.exercises[0].sets).toBeLessThan(a.workout.exercises[0].sets)
  })
})
