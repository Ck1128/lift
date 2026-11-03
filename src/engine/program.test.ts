import { describe, expect, it } from 'vitest'
import { HOME_PROGRAM } from '../data/programs'
import { exerciseById, CATALOG, CATALOG_VERSION } from '../data/catalog'
import { cardioById } from '../data/cardio'
import { formatTarget, nextProgramDay, programMinutes, programWorkout } from './program'

const primary = (id: string) => exerciseById(id)?.primaryMuscles ?? []

describe('Home program', () => {
  it('has 10 numbered days and every exercise exists', () => {
    expect(HOME_PROGRAM.days).toHaveLength(10)
    for (const d of HOME_PROGRAM.days) for (const e of d.exercises) expect(exerciseById(e.exerciseId), e.exerciseId).toBeDefined()
  })

  it('program-only moves are not in the pool Lift picks from', () => {
    expect(CATALOG.some((e) => e.id.startsWith('prog-'))).toBe(false)
  })

  it('builds Day 1 with warm-up first, the walk last and the 12 lb dumbbells filled in', () => {
    const w = programWorkout(HOME_PROGRAM, 0, '2026-11-05', 'lb', primary, CATALOG_VERSION)
    expect(w.title).toBe('Home · Day 1: Full Body A')
    expect(w.exercises[0].name).toBe('Warm-up')
    expect(w.exercises[0].durationMinutes).toBe(10)
    expect(w.exercises.at(-1)!.name).toBe('Walk + stretching')
    const strength = w.exercises.filter((e) => e.kind !== 'cardio')
    expect(strength.map((e) => e.name)).toEqual([
      'Goblet squat', 'Romanian deadlift', 'Floor press', 'One-arm row', 'Shoulder press', 'Reverse lunge', 'Hammer curl', 'Overhead triceps extension',
    ])
    expect(strength.every((e) => e.suggestedWeight === 12 && e.loadUnit === 'lb')).toBe(true)
    expect(formatTarget(strength[3])).toBe('3 × 12 reps per side')
    for (const c of w.exercises.filter((e) => e.kind === 'cardio')) expect(cardioById(c.exerciseId)).toBeDefined()
    expect(new Set(w.exercises.map((e) => e.slotId)).size).toBe(w.exercises.length)
  })

  it('shows holds in seconds and leaves bodyweight moves unloaded', () => {
    const w = programWorkout(HOME_PROGRAM, 2, '2026-11-05', 'lb', primary, CATALOG_VERSION)
    const plank = w.exercises.find((e) => e.name === 'Plank')!
    expect(formatTarget(plank)).toBe('3 × 30-45 sec')
    expect(plank.suggestedWeight).toBeUndefined()
  })

  it('Day 4 is walking only and Day 8 is a 4-round circuit', () => {
    const d4 = programWorkout(HOME_PROGRAM, 3, '2026-11-05', 'lb', primary, CATALOG_VERSION)
    expect(d4.exercises.every((e) => e.kind === 'cardio')).toBe(true)
    const d8 = programWorkout(HOME_PROGRAM, 7, '2026-11-05', 'lb', primary, CATALOG_VERSION)
    expect(d8.exercises.filter((e) => e.kind !== 'cardio').every((e) => e.sets === 4 && e.restSeconds === 15)).toBe(true)
  })

  it('estimates sensible session lengths', () => {
    for (const d of HOME_PROGRAM.days) {
      const m = programMinutes(d)
      expect(m).toBeGreaterThanOrEqual(30)
      expect(m).toBeLessThanOrEqual(90)
    }
  })

  it('the next day follows the last finished day and wraps after Day 10', () => {
    const state = { programId: 'home', day: 0, setAt: '2026-11-01T00:00:00.000Z' }
    expect(nextProgramDay(HOME_PROGRAM, state, [])).toBe(0)
    expect(nextProgramDay(HOME_PROGRAM, state, [{ day: 0, at: '2026-11-02T10:00:00.000Z' }, { day: 1, at: '2026-11-03T10:00:00.000Z' }])).toBe(2)
    expect(nextProgramDay(HOME_PROGRAM, state, [{ day: 9, at: '2026-11-02T10:00:00.000Z' }])).toBe(0)
    // Days finished before the person chose a new starting day do not count.
    expect(nextProgramDay(HOME_PROGRAM, { ...state, day: 5, setAt: '2026-11-04T00:00:00.000Z' }, [{ day: 1, at: '2026-11-03T10:00:00.000Z' }])).toBe(5)
  })
})
