import { describe, it, expect } from 'vitest'
import { CATALOG, exerciseById } from '../data/catalog'
import { ALL_FINE, musclesOf, musclesOfMany, fineOfCoarse } from './muscleMap'
import { needHoursFor, overlapWithPlan, recoveryReport } from './recovery'
import type { Exercise, SetLog, WorkoutSession } from './types'

const ex = (o: Partial<Exercise> & { name: string }): Exercise => ({
  id: o.name, primaryMuscles: [], secondaryMuscles: [], movementPattern: 'push', equipmentIds: ['bodyweight'], exerciseType: 'bodyweight',
  difficulty: 'beginner', compound: true, instructions: [], catalogVersion: 't', ...o,
})

describe('shared muscle mapping', () => {
  it('maps a bench press to chest, with triceps and shoulders secondary', () => {
    const u = musclesOf(ex({ name: 'Barbell Bench Press', primaryMuscles: ['chest'], secondaryMuscles: ['triceps', 'shoulders'] }))
    expect(u.primary).toEqual(['chest'])
    expect(u.secondary).toEqual(expect.arrayContaining(['triceps', 'shoulders']))
  })
  it('splits back into lats, upper back or lower back from the movement', () => {
    expect(musclesOf(ex({ name: 'Lat Pulldown', primaryMuscles: ['back'], secondaryMuscles: ['biceps'] })).primary).toEqual(['lats'])
    expect(musclesOf(ex({ name: 'Seated Cable Row', primaryMuscles: ['back'] })).primary).toEqual(['upper_back'])
    expect(musclesOf(ex({ name: 'Romanian Deadlift', primaryMuscles: ['hamstrings'], secondaryMuscles: ['glutes', 'back'] })).secondary).toContain('lower_back')
  })
  it('compound lifts use several groups and a grip exercise adds forearms', () => {
    const dl = musclesOf(ex({ name: 'Deadlift', primaryMuscles: ['back', 'glutes', 'hamstrings'] }))
    expect(dl.primary).toEqual(expect.arrayContaining(['lower_back', 'glutes', 'hamstrings']))
    expect(dl.secondary).toContain('forearms')
    expect(musclesOf(ex({ name: 'Dumbbell Curl', primaryMuscles: ['biceps'] })).secondary).toContain('forearms')
  })
  it('core becomes abs, and rotation work adds obliques', () => {
    expect(musclesOf(ex({ name: 'Crunch', primaryMuscles: ['core'] })).primary).toEqual(['abs'])
    expect(musclesOf(ex({ name: 'Russian Twist', primaryMuscles: ['core'] })).primary).toEqual(['obliques', 'abs'])
  })
  it('an exercise with no mapping is reported as unmapped, never guessed', () => {
    expect(musclesOf(ex({ name: 'Mystery' })).unmapped).toBe(true)
    expect(musclesOf(undefined).unmapped).toBe(true)
    const many = musclesOfMany([ex({ name: 'Mystery' }), ex({ name: 'Squat', primaryMuscles: ['quads'] })])
    expect(many.unmappedCount).toBe(1)
    expect(many.primary).toEqual(['quads'])
  })
  it('primary wins over secondary across several exercises', () => {
    const m = musclesOfMany([ex({ name: 'Bench', primaryMuscles: ['chest'], secondaryMuscles: ['triceps'] }), ex({ name: 'Pushdown', primaryMuscles: ['triceps'] })])
    expect(m.primary).toEqual(expect.arrayContaining(['chest', 'triceps']))
    expect(m.secondary).not.toContain('triceps')
  })
  it('every real catalog exercise gets a mapping and only known ids', () => {
    for (const e of CATALOG) {
      const u = musclesOf(e)
      expect(u.unmapped).toBe(false)
      for (const m of [...u.primary, ...u.secondary]) expect(ALL_FINE).toContain(m)
    }
  })
  it('every coarse muscle has at least one fine group', () => {
    for (const c of ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core'] as const) expect(fineOfCoarse(c).length).toBeGreaterThan(0)
  })
})

const NOW = new Date('2026-10-21T18:00:00Z')
const bench = CATALOG.find((e) => musclesOf(e).primary.includes('chest'))!
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString()
const sess = (id: string, h: number, status: WorkoutSession['status'] = 'completed'): WorkoutSession => ({
  id, date: hoursAgo(h).slice(0, 10), startedAt: hoursAgo(h + 1), finishedAt: hoursAgo(h), status, plannedExercises: [], actualExercises: [], title: `Day ${id}`,
  planVersion: 1, generatorVersion: 't', targetMuscles: [], pausedMs: 0, weightUnit: 'lb',
})
const sets = (sid: string, exId: string, n: number, rpe?: number): SetLog[] => Array.from({ length: n }, (_, i) => ({
  id: `${sid}-${i}`, sessionId: sid, slotId: 's1', exerciseId: exId, setNumber: i + 1, plannedRepMin: 8, plannedRepMax: 10, actualReps: 8, actualWeight: 100, weightUnit: 'lb' as const,
  completed: true, effortRating: rpe, createdAt: '', updatedAt: '',
}))

describe('recovery model', () => {
  it('with no history nothing is assumed recovered', () => {
    const r = recoveryReport([], [], NOW)
    expect(r.hasHistory).toBe(false)
    expect(r.daysSinceLast).toBeNull()
    expect(r.fresh).toBe(0)
    expect(ALL_FINE.every((m) => r.muscles[m].status === 'no_data')).toBe(true)
  })
  it('a muscle trained an hour ago is recently trained; one never trained stays no data', () => {
    const r = recoveryReport([sess('a', 1)], sets('a', bench.id, 4), NOW)
    expect(r.muscles.chest.status).toBe('recent')
    expect(r.muscles.calves.status).toBe('no_data')
    expect(r.daysSinceLast).toBe(0)
  })
  it('recovers with time, and passes through recovering', () => {
    const logs = sets('a', bench.id, 4)
    const at = (h: number) => recoveryReport([sess('a', h)], logs, NOW).muscles.chest.status
    expect(at(1)).toBe('recent')
    expect(at(36)).toBe('recovering')
    expect(at(120)).toBe('recovered')
  })
  it('more volume and higher effort need longer, so it is not just days since', () => {
    expect(needHoursFor('chest', 12, undefined, 0)).toBeGreaterThan(needHoursFor('chest', 3, undefined, 0))
    expect(needHoursFor('chest', 6, 9.5, 0)).toBeGreaterThan(needHoursFor('chest', 6, 7, 0))
    expect(needHoursFor('chest', 6, undefined, 3)).toBeGreaterThan(needHoursFor('chest', 6, undefined, 0))
    expect(needHoursFor('chest', 6, undefined, 0)).toBeGreaterThan(needHoursFor('biceps', 6, undefined, 0))
    const light = recoveryReport([sess('a', 30)], sets('a', bench.id, 2), NOW).muscles.chest.remainingHours
    const heavy = recoveryReport([sess('a', 30)], sets('a', bench.id, 14, 9.5), NOW).muscles.chest.remainingHours
    expect(heavy).toBeGreaterThan(light)
  })
  it('ignores unfinished sets, discarded sessions and cardio rows', () => {
    const notDone = sets('a', bench.id, 3).map((l) => ({ ...l, completed: false }))
    expect(recoveryReport([sess('a', 1)], notDone, NOW).muscles.chest.status).toBe('no_data')
    expect(recoveryReport([sess('a', 1, 'abandoned')], sets('a', bench.id, 3), NOW).hasHistory).toBe(false)
    const cardio = sets('a', bench.id, 3).map((l) => ({ ...l, actualMinutes: 10, actualReps: undefined }))
    expect(recoveryReport([sess('a', 1)], cardio, NOW).muscles.chest.status).toBe('no_data')
  })
  it('recalculates when a workout is deleted or edited', () => {
    const logs = sets('a', bench.id, 4)
    expect(recoveryReport([sess('a', 1)], logs, NOW).muscles.chest.status).toBe('recent')
    expect(recoveryReport([], [], NOW).muscles.chest.status).toBe('no_data')
    expect(recoveryReport([sess('a', 1)], logs.map((l) => ({ ...l, completed: false })), NOW).muscles.chest.status).toBe('no_data')
  })
  it('lists the planned muscles that overlap with recent training, without blocking anything', () => {
    const r = recoveryReport([sess('a', 2)], sets('a', bench.id, 4), NOW)
    const o = overlapWithPlan(['chest', 'quads'], r, { chest: ['Bench'] })
    expect(o.map((x) => x.muscle)).toEqual(['chest'])
    expect(o[0].exercises).toEqual(['Bench'])
  })
  it('unknown exercises are counted, not guessed', () => {
    expect(exerciseById('nope')).toBeUndefined()
    const r = recoveryReport([sess('a', 1)], sets('a', 'nope', 3), NOW)
    expect(r.unmappedExercises).toBe(1)
    expect(r.fresh).toBe(0)
  })
})
