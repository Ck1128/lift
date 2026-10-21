import type { Goal } from './types'

// Time model. These are rough averages, not measurements. The UI shows them as an estimate.
export const TRANSITION_SECONDS = 90 // walk to equipment, adjust it, get set
export const WARMUP_SECONDS = 300 // included only for sessions of 45 minutes or longer
export const MIN_WARMUP_SESSION_MINUTES = 45

export function secondsPerSet(goal: Goal): number {
  return goal === 'strength' ? 40 : 45
}

export function restSecondsFor(goal: Goal, compound: boolean): number {
  const table: Record<Goal, [number, number]> = {
    strength: [150, 90],
    muscle: [90, 60],
    general: [75, 60],
    endurance: [45, 45],
    fat_loss: [45, 45],
  }
  return table[goal][compound ? 0 : 1]
}

export interface TimedExercise {
  sets: number
  restSeconds: number
}

export function exerciseSeconds(e: TimedExercise, goal: Goal): number {
  return TRANSITION_SECONDS + e.sets * secondsPerSet(goal) + Math.max(0, e.sets - 1) * e.restSeconds
}

export function warmupSeconds(minutes: number): number {
  return minutes >= MIN_WARMUP_SESSION_MINUTES ? WARMUP_SECONDS : 0
}

export function estimateSeconds(exercises: TimedExercise[], goal: Goal, minutes: number): number {
  return warmupSeconds(minutes) + exercises.reduce((sum, e) => sum + exerciseSeconds(e, goal), 0)
}

export function assumptionsText(goal: Goal, minutes: number): string[] {
  return [
    `About ${secondsPerSet(goal)} seconds per set.`,
    `Rest between sets depends on your goal (${restSecondsFor(goal, true)} s for big lifts, ${restSecondsFor(goal, false)} s for smaller ones).`,
    `${TRANSITION_SECONDS} seconds to move between exercises.`,
    warmupSeconds(minutes) > 0 ? `${WARMUP_SECONDS / 60} minutes of warm-up are included.` : 'No warm-up time is included for short sessions.',
    'Your real pace will differ. Treat the total as an estimate.',
  ]
}
