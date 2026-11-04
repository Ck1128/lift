import { describe, expect, it } from 'vitest'
import { buildStory, hasActivity, latestMonthEnd, latestWeekEnd, periodFor, storyShareText, type StoryData, type StoryHelpers } from './bodyStory'
import type { BodyWeightEntry, SetLog, WorkoutSession } from './types'
import type { YogaSession } from './yoga'

const helpers: StoryHelpers = { exerciseName: (id) => id.toUpperCase(), mainMuscle: (id) => (id === 'sq' ? 'quads' : 'chest') }
const sess = (id: string, date: string): WorkoutSession => ({
  id, date, startedAt: `${date}T10:00:00.000Z`, finishedAt: `${date}T10:40:00.000Z`, status: 'completed', plannedExercises: [], actualExercises: [], title: 'x',
  planVersion: 1, generatorVersion: 'g', targetMuscles: [], pausedMs: 0, weightUnit: 'lb',
}) as WorkoutSession
const log = (sessionId: string, exerciseId: string, w: number, reps = 5): SetLog => ({
  id: `${sessionId}-${exerciseId}-${w}`, sessionId, slotId: 's1', exerciseId, setNumber: 1, plannedRepMin: 5, plannedRepMax: 8, actualReps: reps, actualWeight: w,
  weightUnit: 'lb', completed: true, createdAt: '', updatedAt: '',
}) as SetLog
const yoga = (date: string, sec: number): YogaSession => ({ id: `y${date}`, date, status: 'completed', durationSeconds: sec }) as YogaSession
const bw = (date: string, value: number): BodyWeightEntry => ({ id: date, date, value, unit: 'lb' })
const empty: StoryData = { sessions: [], logs: [], yoga: [], weights: [], health: [] }

describe('periods', () => {
  it('the weekly story ends on Sunday, the monthly on the last day of the month', () => {
    expect(latestWeekEnd('2026-10-25')).toBe('2026-10-25') // Sunday: today
    expect(latestWeekEnd('2026-10-21')).toBe('2026-10-18') // Wednesday: last Sunday
    expect(latestMonthEnd('2026-10-31')).toBe('2026-10-31')
    expect(latestMonthEnd('2026-10-21')).toBe('2026-09-30')
    expect(latestMonthEnd('2026-03-01')).toBe('2026-02-28')
    expect(periodFor('week', '2026-10-25')).toEqual({ from: '2026-10-19', to: '2026-10-25' })
    expect(periodFor('month', '2026-02-28')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })
})

describe('buildStory', () => {
  const data: StoryData = {
    sessions: [sess('a', '2026-10-12'), sess('b', '2026-10-20'), sess('c', '2026-10-23')],
    logs: [log('a', 'bp', 100), log('b', 'bp', 110), log('b', 'bp', 105), log('b', 'sq', 200), log('c', 'bp', 90)],
    yoga: [yoga('2026-10-21', 1200)],
    weights: [bw('2026-10-14', 180), bw('2026-10-21', 178.5)],
    health: [],
  }
  const s = buildStory('week', '2026-10-19', '2026-10-25', true, data, 'lb', helpers, 'now')

  it('counts only what happened in the period', () => {
    expect(s.workouts).toBe(2)
    expect(s.sets).toBe(4)
    expect(s.yogaMinutes).toBe(20)
    expect(s.activeDays).toBe(3)
    expect(s.title).toBe('Oct 19 to Oct 25')
  })
  it('flags a new best only when it beats everything before the period', () => {
    const bp = s.lifts.find((l) => l.name === 'BP')!
    expect(bp.weight).toBe(110)
    expect(bp.pr).toBe(true)
    expect(s.lifts.find((l) => l.name === 'SQ')!.pr).toBe(false) // first time: not a record
  })
  it('measures body weight against the last weigh-in before the period', () => {
    expect(s.weight).toEqual({ unit: 'lb', start: 180, end: 178.5, change: -1.5 })
  })
  it('lists the most worked muscles and compares with the week before without judging', () => {
    expect(s.topMuscles[0]).toEqual({ muscle: 'Chest', sets: 3 })
    expect(s.previous?.workouts).toBe(1)
    expect(s.highlights.join(' ')).toMatch(/no judgement/i)
  })
  it('an empty period is calm and has no activity', () => {
    const e = buildStory('week', '2026-10-19', '2026-10-25', true, empty, 'lb', helpers, 'now')
    expect(hasActivity(e)).toBe(false)
    expect(e.headline).toMatch(/quiet week/i)
  })
  it('converts weights to the chosen unit', () => {
    const kg = buildStory('week', '2026-10-19', '2026-10-25', true, data, 'kg', helpers, 'now')
    expect(kg.weight!.unit).toBe('kg')
    expect(kg.weight!.end).toBeCloseTo(81, 0)
  })
  it('sharing leaves body weight out unless asked', () => {
    expect(storyShareText(s, false)).not.toMatch(/body weight/i)
    expect(storyShareText(s, true)).toMatch(/body weight/i)
  })
})
