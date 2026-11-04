import { describe, expect, it } from 'vitest'
import { HOME_PROGRAM } from '../data/programs'
import { exerciseById, CATALOG, CATALOG_VERSION } from '../data/catalog'
import { cardioById } from '../data/cardio'
import { formatTarget, nextProgramDay, programFinished, programMinutes, programWorkout } from './program'

const primary = (id: string) => exerciseById(id)?.primaryMuscles ?? []
const build = (i: number) => programWorkout(HOME_PROGRAM, i, '2026-11-05', 'lb', primary, CATALOG_VERSION)
const LEGS_PULL = new Set(['quads', 'hamstrings', 'glutes', 'calves', 'back', 'biceps'])
const PUSH_CORE = new Set(['chest', 'shoulders', 'triceps', 'core'])

describe('Home program (15 days)', () => {
  it('has 15 numbered days, 5 of them recovery, and every exercise exists', () => {
    expect(HOME_PROGRAM.days).toHaveLength(15)
    expect(HOME_PROGRAM.days.map((d, i) => (d.recovery ? i + 1 : 0)).filter(Boolean)).toEqual([3, 6, 8, 13, 15])
    for (const d of HOME_PROGRAM.days) for (const e of d.exercises) expect(exerciseById(e.exerciseId), e.exerciseId).toBeDefined()
  })

  it('no dates or weekdays anywhere in the program', () => {
    const text = JSON.stringify(HOME_PROGRAM)
    expect(text).not.toMatch(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b|Nov|2026/)
  })

  it('A days train legs and pull, B days train push and core', () => {
    HOME_PROGRAM.days.forEach((d, i) => {
      const muscles = build(i).targetMuscles
      if (d.title.startsWith('A')) expect(muscles.every((m) => LEGS_PULL.has(m)), d.title).toBe(true)
      if (d.title.startsWith('B')) expect(muscles.every((m) => PUSH_CORE.has(m)), d.title).toBe(true)
    })
  })

  it('program-only moves are not in the pool Lift picks from', () => {
    expect(CATALOG.some((e) => e.id.startsWith('prog-'))).toBe(false)
  })

  it('builds Day 1 with warm-up first, the walk last and 12 lb filled in', () => {
    const w = build(0)
    expect(w.title).toBe('Home · Day 1: A1 · Legs + Pull (intro)')
    expect(w.exercises[0].name).toBe('Warm-up')
    expect(w.exercises.at(-1)!.name).toBe('Walk + stretch')
    const strength = w.exercises.filter((e) => e.kind !== 'cardio')
    expect(strength.map((e) => e.name)).toEqual(['Goblet squat', 'Romanian deadlift', 'Reverse lunge', 'One-arm row', 'Hammer curl', 'Calf raise'])
    expect(strength.every((e) => e.suggestedWeight === 12 && e.loadUnit === 'lb' && e.sets === 2)).toBe(true)
    expect(formatTarget(strength[3])).toBe('2 × 12 reps per side')
    expect(new Set(w.exercises.map((e) => e.slotId)).size).toBe(w.exercises.length)
    for (const c of w.exercises.filter((e) => e.kind === 'cardio')) expect(cardioById(c.exerciseId)).toBeDefined()
  })

  it('both dumbbells together are 24 lb, and bodyweight moves stay unloaded', () => {
    const w = build(10)
    expect(w.exercises.find((e) => e.name.startsWith('Goblet squat (both'))!.suggestedWeight).toBe(24)
    expect(w.exercises.find((e) => e.name.startsWith('One-arm row'))!.suggestedWeight).toBe(24)
    const d2 = build(1)
    const plank = d2.exercises.find((e) => e.name === 'Plank')!
    expect(formatTarget(plank)).toBe('2 × 20-30 sec')
    expect(plank.suggestedWeight).toBeUndefined()
  })

  it('recovery days are a walk and mobility only; Day 7 is a 3-round circuit', () => {
    const r = build(2)
    expect(r.exercises.map((e) => e.name)).toEqual(['Easy walk', 'Mobility'])
    expect(r.exercises.every((e) => e.kind === 'cardio')).toBe(true)
    const c = build(6)
    expect(c.exercises.filter((e) => e.kind !== 'cardio').every((e) => e.sets === 3 && e.restSeconds === 15)).toBe(true)
  })

  it('estimates sensible session lengths', () => {
    for (const d of HOME_PROGRAM.days) {
      const m = programMinutes(d)
      expect(m, d.title).toBeGreaterThanOrEqual(25)
      expect(m, d.title).toBeLessThanOrEqual(80)
    }
  })

  it('the next day follows the last finished day; an out-of-order recovery day leaves the due day next', () => {
    const state = { programId: 'home', day: 0, setAt: '2026-11-01T00:00:00.000Z' }
    const at = (d: number) => `2026-11-0${d}T10:00:00.000Z`
    expect(nextProgramDay(HOME_PROGRAM, state, [])).toBe(0)
    expect(nextProgramDay(HOME_PROGRAM, state, [{ day: 0, at: at(2) }, { day: 1, at: at(3) }])).toBe(2)
    // Due Day 4, sore, did a recovery day (Day 6) instead: Day 4 is still next.
    expect(nextProgramDay(HOME_PROGRAM, { ...state, day: 3 }, [{ day: 5, at: at(2) }])).toBe(3)
    // The recovery day that was due moves the plan on as normal.
    expect(nextProgramDay(HOME_PROGRAM, { ...state, day: 2 }, [{ day: 2, at: at(2) }])).toBe(3)
    // Choosing a lifting day out of order carries on after it.
    expect(nextProgramDay(HOME_PROGRAM, state, [{ day: 8, at: at(2) }])).toBe(9)
    // After Day 15 it starts again, and the program counts as finished.
    const end = [{ day: 14, at: at(2) }]
    expect(nextProgramDay(HOME_PROGRAM, { ...state, day: 14 }, end)).toBe(0)
    expect(programFinished(HOME_PROGRAM, state, end)).toBe(true)
    // Days finished before a new starting day was chosen do not count.
    expect(nextProgramDay(HOME_PROGRAM, { ...state, day: 5, setAt: '2026-11-04T00:00:00.000Z' }, [{ day: 1, at: at(3) }])).toBe(5)
  })
})
