import { describe, expect, it } from 'vitest'
import { sessionBests, sessionVolume, weekStreak } from './history'
import type { SetLog, WorkoutSession } from './types'

const sess = (id: string, date: string, status: WorkoutSession['status'] = 'completed') =>
  ({ id, date, startedAt: `${date}T10:00:00.000Z`, status } as WorkoutSession)
const log = (sessionId: string, exerciseId: string, weight: number | undefined, reps: number, unit: 'lb' | 'kg' = 'lb', completed = true) =>
  ({ id: `${sessionId}-${exerciseId}-${weight}-${reps}`, sessionId, exerciseId, actualWeight: weight, actualReps: reps, weightUnit: unit, completed } as SetLog)

describe('session highlights', () => {
  it('adds up weight times reps for completed sets only, in the asked unit', () => {
    const logs = [log('a', 'x', 100, 10), log('a', 'x', 100, 8), log('a', 'y', undefined, 12), log('a', 'x', 200, 5, 'lb', false)]
    expect(sessionVolume(logs, 'lb')).toBe(1800)
    expect(sessionVolume([log('a', 'x', 100, 10, 'kg')], 'lb')).toBe(2205)
  })

  it('a new best needs an earlier session to beat, and compares across units', () => {
    const s1 = sess('s1', '2026-11-01'), s2 = sess('s2', '2026-11-03'), s3 = sess('s3', '2026-11-05', 'abandoned')
    const all = [log('s1', 'press', 50, 8), log('s1', 'row', 40, 10), log('s2', 'press', 55, 6), log('s2', 'row', 40, 12), log('s2', 'curl', 20, 10), log('s3', 'press', 90, 1)]
    const bests = sessionBests(s2, all.filter((l) => l.sessionId === 's2'), [s1, s2, s3], all, 'lb')
    expect(bests).toEqual([{ exerciseId: 'press', weight: 55, previous: 50, unit: 'lb' }]) // row equal, curl first time
    expect(sessionBests(s1, all.filter((l) => l.sessionId === 's1'), [s1, s2], all, 'lb')).toEqual([])
    const kg = [log('s1', 'press', 50, 8, 'lb'), log('s2', 'press', 25, 8, 'kg')]
    expect(sessionBests(s2, [kg[1]], [s1, s2], kg, 'lb')[0].exerciseId).toBe('press') // 25 kg is about 55 lb
  })

  it('counts weeks in a row with a workout, allowing the current week to be empty so far', () => {
    const today = '2026-11-11' // Wednesday
    expect(weekStreak([], today)).toBe(0)
    expect(weekStreak([sess('a', '2026-11-10')], today)).toBe(1)
    expect(weekStreak([sess('a', '2026-11-04'), sess('b', '2026-10-28')], today)).toBe(2)
    expect(weekStreak([sess('a', '2026-11-10'), sess('b', '2026-10-27')], today)).toBe(1) // gap week breaks it
    expect(weekStreak([sess('a', '2026-11-10', 'abandoned')], today)).toBe(0)
  })
})
