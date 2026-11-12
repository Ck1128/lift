import { describe, expect, it } from 'vitest'
import { levelToSore, levelWord, sorenessFromRating } from './soreness'
import { programWorkout } from './program'
import { HOME_PROGRAM } from '../data/programs'
import { CATALOG_VERSION, exerciseById } from '../data/catalog'
import { todaysCall } from './todaysCall'

const primary = (id: string) => exerciseById(id)?.primaryMuscles ?? []

describe('soreness meter', () => {
  it('maps 1-10 onto none, mild, moderate and very sore', () => {
    expect([1, 2, 3, 4, 5, 7, 8, 10].map(levelToSore)).toEqual([0, 0, 1, 1, 2, 2, 3, 3])
    expect(levelWord(1)).toBe('Fresh')
    expect(levelWord(10)).toBe('Extremely sore')
  })

  it('applies to the chosen areas, or all over when none are chosen', () => {
    expect(sorenessFromRating({ level: 6, areas: ['quads', 'glutes'] })).toEqual({ quads: 2, glutes: 2 })
    expect(Object.keys(sorenessFromRating({ level: 9, areas: [] }))).toHaveLength(10)
    expect(sorenessFromRating({ level: 2, areas: [] })).toEqual({})
    expect(sorenessFromRating(null)).toEqual({})
  })

  it('trims a Home day: sore areas lose a set, very sore ones drop to one easy set', () => {
    const plain = programWorkout(HOME_PROGRAM, 3, '2026-11-08', 'lb', primary, CATALOG_VERSION)
    const sore = programWorkout(HOME_PROGRAM, 3, '2026-11-08', 'lb', primary, CATALOG_VERSION, sorenessFromRating({ level: 6, areas: ['quads', 'glutes'] }))
    const sets = (w: typeof plain, name: string) => w.exercises.find((e) => e.name === name)!.sets
    expect(sets(plain, 'Goblet squat')).toBe(3)
    expect(sets(sore, 'Goblet squat')).toBe(2)
    expect(sets(sore, 'Hammer curl')).toBe(3) // arms were not sore
    expect(sore.notes[0]).toMatch(/rated your .*quads.* as sore/)
    const very = programWorkout(HOME_PROGRAM, 3, '2026-11-08', 'lb', primary, CATALOG_VERSION, sorenessFromRating({ level: 9, areas: ['quads'] }))
    expect(sets(very, 'Goblet squat')).toBe(1)
    expect(very.exercises.find((e) => e.name === 'Goblet squat')!.cues?.[0]).toMatch(/skip/)
  })

  it('with no workouts logged yet, soreness in the planned muscles still changes the call', () => {
    const report = { hasHistory: false, muscles: {} } as never
    const scheduled = { focus: 'Lower body', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] as const }
    const plain = todaysCall({ report, scheduled: { ...scheduled, muscles: [...scheduled.muscles] }, yogaOn: false, workoutOn: true })
    expect(plain.onPlan).toBe(true)
    const sore = todaysCall({ report, scheduled: { ...scheduled, muscles: [...scheduled.muscles] }, yogaOn: false, workoutOn: true, soreness: sorenessFromRating({ level: 8, areas: ['quads', 'hamstrings', 'glutes', 'calves'] }) })
    expect(sore.onPlan).toBe(false)
    expect(sore.plan?.muscles ?? []).not.toContain('quads')
  })
})
