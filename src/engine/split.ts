import { WEEKDAY_NAMES } from './dates'
import type { DayPlan, Experience, Goal, Muscle, WeekSchedule } from './types'
import { ALL_MUSCLES, MUSCLE_LABEL } from './types'

const UPPER: DayPlan = { focus: 'Upper body', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] }
const LOWER: DayPlan = { focus: 'Lower body', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'core'] }
const PUSH: DayPlan = { focus: 'Push', muscles: ['chest', 'shoulders', 'triceps'] }
const PULL: DayPlan = { focus: 'Pull', muscles: ['back', 'biceps', 'core'] }
const LEGS: DayPlan = { focus: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] }
const FULL_A: DayPlan = { focus: 'Full body A', muscles: ['quads', 'chest', 'back', 'shoulders', 'core'] }
const FULL_B: DayPlan = { focus: 'Full body B', muscles: ['hamstrings', 'glutes', 'back', 'chest', 'triceps'] }
const FULL_C: DayPlan = { focus: 'Full body C', muscles: ['quads', 'back', 'shoulders', 'biceps', 'calves'] }

export interface SplitInput {
  trainingDays: number[]
  goal: Goal
  experience: Experience
}

export interface SplitResult {
  schedule: WeekSchedule
  notes: string[]
  /** How many sessions per week hit each muscle group. */
  coverage: Record<Muscle, number>
}

function templatesFor(n: number, consecutive: boolean, input: SplitInput): DayPlan[] {
  const experienced = input.experience !== 'beginner'
  switch (n) {
    case 1: return [FULL_A]
    case 2: return consecutive ? [UPPER, LOWER] : [FULL_A, FULL_B]
    case 3:
      return consecutive || (experienced && (input.goal === 'muscle' || input.goal === 'strength'))
        ? [PUSH, PULL, LEGS]
        : [FULL_A, FULL_B, FULL_C]
    case 4: return [UPPER, LOWER, UPPER, LOWER]
    case 5: return [PUSH, PULL, LEGS, UPPER, LOWER]
    default: return [PUSH, PULL, LEGS, PUSH, PULL, LEGS]
  }
}

function hasConsecutive(days: number[]): boolean {
  const s = new Set(days)
  return days.some((d) => s.has((d + 1) % 7))
}

export function coverageOf(schedule: WeekSchedule): Record<Muscle, number> {
  const c = Object.fromEntries(ALL_MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>
  for (const p of Object.values(schedule)) p?.muscles.forEach((m) => (c[m] += 1))
  return c
}

/**
 * Builds a repeating weekly muscle-group plan from the days the user picked.
 * Not one fixed split: the template depends on how many days there are, whether any
 * are back-to-back, and (for 3 days) the goal and experience. Back-to-back days get
 * templates that do not repeat the same muscles.
 */
export function generateWeeklySchedule(input: SplitInput): SplitResult {
  const days = [...new Set(input.trainingDays)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b)
  if (days.length === 0) throw new Error('Pick at least one training day.')
  const picked = days.slice(0, 6)
  const notes: string[] = []
  if (days.length > 6) notes.push('Only six training days are used. Everyone needs at least one rest day.')

  const templates = templatesFor(picked.length, hasConsecutive(picked), input)
  const schedule: WeekSchedule = {}
  for (let d = 0; d < 7; d++) schedule[d] = null
  picked.forEach((d, i) => (schedule[d] = templates[i]))

  // Flag same-muscle sessions on consecutive days (including Sunday -> Monday).
  for (const d of picked) {
    const next = (d + 1) % 7
    const a = schedule[d]
    const b = schedule[next]
    if (a && b) {
      const shared = a.muscles.filter((m) => b.muscles.includes(m))
      if (shared.length > 0) {
        notes.push(
          `${WEEKDAY_NAMES[d]} and ${WEEKDAY_NAMES[next]} both train ${shared.map((m) => MUSCLE_LABEL[m].toLowerCase()).join(', ')}. Spacing training days out gives those muscles more recovery.`,
        )
      }
    }
  }
  const coverage = coverageOf(schedule)
  const missing = ALL_MUSCLES.filter((m) => coverage[m] === 0)
  if (missing.length > 0) {
    notes.push(`This week does not train: ${missing.map((m) => MUSCLE_LABEL[m].toLowerCase()).join(', ')}. Adding a training day would cover more.`)
  }
  return { schedule, notes, coverage }
}
