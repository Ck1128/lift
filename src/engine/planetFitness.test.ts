import { describe, it, expect } from 'vitest'
import { CATALOG, exerciseById } from '../data/catalog'
import { generateWorkout, type GenerateInput } from './generate'
import { presetEquipment } from './equipment'
import { generateWeeklySchedule } from './split'
import { PF_MACHINE_EXERCISES, pfMachineOk } from './planetFitness'
import { STAPLES } from './suitability'
import { ALL_MUSCLES, type Goal, type TrainingLevel } from './types'

const byName = (n: string) => CATALOG.find((e) => e.name === n)
const equipment = presetEquipment('planet_fitness', 'lb')

const base = (o: Partial<GenerateInput> = {}): GenerateInput => ({
  date: '2026-10-21', planDay: { focus: 'Full body A', muscles: ['quads', 'chest', 'back', 'shoulders', 'core'] }, minutes: 60, goal: 'muscle', experience: 'beginner',
  equipment, excludedExerciseIds: [], excludedPatterns: [], catalog: CATALOG, lastPerformance: {}, soreness: {}, weightUnit: 'lb', weightKg: 75, gym: 'planet_fitness', ...o,
})

function plan(o: Partial<GenerateInput> = {}) {
  const r = generateWorkout(base(o))
  if (r.kind !== 'workout') throw new Error(`no workout: ${JSON.stringify(r)}`)
  return r.workout
}

describe('Planet Fitness equipment list', () => {
  it('matches the club list: rowers, kettlebells, bands and EZ bars yes; Olympic barbell and pull-up bar no', () => {
    const on = (id: keyof typeof equipment) => equipment[id]?.available
    for (const id of ['dumbbell', 'machine', 'cable', 'smith', 'bench', 'kettlebell', 'bands', 'ez_bar', 'rower', 'treadmill', 'elliptical', 'exercise_bike', 'stair_climber'] as const) expect(on(id), id).toBe(true)
    for (const id of ['barbell', 'pullup_bar'] as const) expect(on(id), id).toBe(false)
    expect(equipment.dumbbell?.maxWeight).toBe(75)
  })
  it('every listed machine exercise and every staple exists in the catalog', () => {
    for (const n of PF_MACHINE_EXERCISES) expect(byName(n), n).toBeDefined()
    for (const [m, names] of Object.entries(STAPLES)) for (const n of names) expect(byName(n), `${m}: ${n}`).toBeDefined()
  })
  it('machines the club does not have are not offered, but listed ones are', () => {
    for (const n of ['Hack Squat', 'Lying T-Bar Row', 'Leverage Deadlift', 'Butterfly', 'Seated Calf Raise', 'Chair Squat', 'Lunge Sprint']) expect(pfMachineOk(n), n).toBe(false)
    for (const n of ['Leg Press', 'Seated Leg Curl', 'Leg Extension Machine', 'Glute Kickback Machine', 'Lateral Raise Machine']) expect(pfMachineOk(n), n).toBe(true)
  })
})

describe('workouts designed for Planet Fitness', () => {
  const levels: TrainingLevel[] = ['beginner', 'intermediate', 'regular']
  const goals: Goal[] = ['muscle', 'strength', 'general', 'endurance', 'fat_loss']

  it('never uses anything the club lacks, for every level, goal and training-day split', () => {
    for (const level of levels) for (const goal of goals) for (const n of [2, 3, 4, 5, 6]) {
      const days = [0, 1, 2, 3, 4, 5].slice(0, n).map((d) => (n <= 3 ? d * 2 : d))
      const { schedule } = generateWeeklySchedule({ trainingDays: days, goal, experience: level })
      for (const day of Object.values(schedule)) {
        if (!day) continue
        const w = plan({ planDay: day, experience: level, goal, minutes: 60 })
        const strength = w.exercises.filter((e) => e.kind !== 'cardio')
        expect(strength.length, `${level} ${goal} ${day.focus}`).toBeGreaterThanOrEqual(3)
        for (const e of strength) {
          const ex = exerciseById(e.exerciseId)!
          expect(ex.equipmentIds, ex.name).not.toContain('barbell')
          expect(ex.equipmentIds, ex.name).not.toContain('pullup_bar')
          if (ex.equipmentIds.includes('machine')) expect(pfMachineOk(ex.name), ex.name).toBe(true)
        }
      }
    }
  })

  it('a beginner full-body day is machines and cables first, simple, and covers the muscles of the day', () => {
    const w = plan({ experience: 'beginner' })
    const exs = w.exercises.filter((e) => e.kind !== 'cardio').map((e) => exerciseById(e.exerciseId)!)
    const names = exs.map((e) => e.name)
    expect(names).toContain('Leg Press')
    expect(names).toContain('Leverage Chest Press')
    expect(names.some((n) => /deadlift|stiff|clean|snatch/i.test(n))).toBe(false)
    for (const day of [{ focus: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] as never[] }, { focus: 'Full body B', muscles: ['hamstrings', 'glutes', 'back', 'chest', 'triceps'] as never[] }]) {
      expect(plan({ planDay: day, experience: 'beginner' }).exercises.some((e) => /deadlift|stiff/i.test(e.name)), day.focus).toBe(false)
    }
    expect(exs.filter((e) => e.exerciseType === 'machine' || e.exerciseType === 'cable').length).toBeGreaterThanOrEqual(Math.ceil(exs.length / 2))
    const covered = new Set(exs.flatMap((e) => e.primaryMuscles))
    for (const m of ['quads', 'chest', 'back', 'shoulders']) expect(covered.has(m as never), m).toBe(true)
  })

  it('an experienced lifter leads with free weights and the Smith machine more than a beginner does', () => {
    const free = (level: TrainingLevel) => plan({ experience: level, minutes: 75 }).exercises.filter((e) => e.kind !== 'cardio').map((e) => exerciseById(e.exerciseId)!).filter((e) => e.exerciseType === 'dumbbell' || e.exerciseType === 'smith').length
    expect(free('regular')).toBeGreaterThan(free('beginner'))
  })

  it('the goal changes the prescription', () => {
    const reps = (goal: Goal) => plan({ goal, experience: 'intermediate' }).exercises.find((e) => e.kind !== 'cardio')!
    expect(reps('strength').repMax).toBeLessThan(reps('endurance').repMin + 1)
    expect(reps('strength').restSeconds).toBeGreaterThan(reps('fat_loss').restSeconds)
  })

  it('age shapes the plan: an older beginner on a strength goal gets moderate reps and no jumping moves', () => {
    const w = plan({ goal: 'strength', experience: 'beginner', age: 60 })
    const ex = w.exercises.find((e) => e.kind !== 'cardio')!
    expect(ex.repMin).toBeGreaterThanOrEqual(5)
    expect(ex.repMax).toBeLessThanOrEqual(8)
    for (const e of w.exercises) expect(e.name).not.toMatch(/jump|plyo|hop|burpee|sprint/i)
    expect(w.notes.join(' ')).toMatch(/age 60/)
  })

  it('explains itself: who it was designed for, the club, and a warm-up', () => {
    const w = plan({ age: 34 })
    const text = w.notes.join(' ')
    expect(text).toMatch(/Designed for you: Beginner, goal: build muscle, age 34/)
    expect(text).toMatch(/Planet Fitness/)
    expect(text).toMatch(/Warm up/)
  })

  it('is deterministic and respects exclusions', () => {
    expect(plan()).toEqual(plan())
    const w = plan({ excludedExerciseIds: ['Leg Press'].map((n) => byName(n)!.id) })
    expect(w.exercises.map((e) => e.name)).not.toContain('Leg Press')
  })

  it('a different gym is not limited to the Planet Fitness machine list', () => {
    const gym = presetEquipment('generic_gym', 'lb')
    const w = plan({ equipment: gym, gym: 'generic', experience: 'regular', planDay: { focus: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] } })
    expect(w.exercises.length).toBeGreaterThan(2)
  })
})

it('covers every muscle with at least one Planet Fitness exercise', () => {
  const avail = new Set(['bodyweight', 'dumbbell', 'machine', 'cable', 'smith', 'bench', 'kettlebell', 'bands', 'ez_bar', 'mat'])
  for (const m of ALL_MUSCLES) {
    const n = CATALOG.filter((e) => e.primaryMuscles[0] === m && e.equipmentIds.every((q) => avail.has(q)) && (!e.equipmentIds.includes('machine') || pfMachineOk(e.name))).length
    expect(n, m).toBeGreaterThanOrEqual(3)
  }
})
