import { describe, expect, it } from 'vitest'
import { funLine } from './humor'
import type { Story } from './bodyStory'

const story = (over: Partial<Story>): Story => ({
  id: 'week-2026-10-18', kind: 'week', from: '', to: '', final: true, generatedAt: '', title: '', workouts: 0, workoutMinutes: 0, sets: 0, yogaSessions: 0, yogaMinutes: 0,
  healthWorkouts: 0, healthMinutes: 0, activeDays: 0, topMuscles: [], lifts: [], weight: null, previous: null, headline: '', highlights: [], ...over,
})

describe('Body Story humour', () => {
  it('is stable for the same story and fits the week', () => {
    expect(funLine(story({}))).toEqual(funLine(story({})))
    expect(funLine(story({})).emoji).toBe('😴')
    expect(funLine(story({ workouts: 6 })).emoji).toBe('🔥')
    expect(funLine(story({ workouts: 3 })).emoji).toBe('💪')
    expect(funLine(story({ workouts: 1 })).emoji).toBe('🙂')
    expect(funLine(story({ workouts: 2, lifts: [{ name: 'x', weight: 1, reps: 1, unit: 'lb', pr: true }] })).emoji).toBe('🏆')
  })
  it('never mentions body weight or looks', () => {
    for (const w of [0, 1, 3, 6]) {
      const f = funLine(story({ workouts: w }))
      expect(`${f.line} ${f.drink}`).not.toMatch(/\b(fat|skinny|weight loss|diet|ugly|lazy)\b/i)
    }
  })
})
