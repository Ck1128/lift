import type { Goal, Level, TrainingLevel } from './types'

/**
 * What the training level changes. The level is never guessed from height or weight.
 * "regular" means a regular gym-goer. It is about habit and experience, not proof of advanced ability.
 */
export interface LevelParams {
  maxExercises: number
  maxDifficulty: Level
  /** Extra rest in seconds on top of the goal's base rest. */
  restBonus: number
  /** How many how-to steps are shown as form cues in the workout preview. */
  cues: number
  /** A set rated at or above this effort stops the weight from going up. */
  effortCeiling: number
  blurb: string
}

export const LEVEL_PARAMS: Record<TrainingLevel, LevelParams> = {
  beginner: {
    maxExercises: 6, maxDifficulty: 'beginner', restBonus: 15, cues: 4, effortCeiling: 8,
    blurb: 'Simpler exercises, fewer exercises and sets, a little more rest, full form cues, and slower weight increases.',
  },
  intermediate: {
    maxExercises: 8, maxDifficulty: 'intermediate', restBonus: 0, cues: 2, effortCeiling: 9,
    blurb: 'A full range of exercises, moderate volume, short form reminders, and weight increases from your logged sets.',
  },
  regular: {
    maxExercises: 9, maxDifficulty: 'intermediate', restBonus: 0, cues: 0, effortCeiling: 9,
    blurb: 'More volume on the main lifts, more variety from your history and equipment, and no form reminders unless you open them.',
  },
}

export function setsFor(goal: Goal, level: TrainingLevel, compound: boolean): number {
  if (level === 'beginner') return goal === 'endurance' ? 2 : compound ? 3 : 2
  if (level === 'regular') {
    if (compound) return goal === 'strength' || goal === 'muscle' ? 4 : 3
    return 3
  }
  // intermediate
  if (goal === 'strength' && compound) return 4
  return 3
}

/** Height and weight are required before a beginner plan is generated. Other levels can add them later. */
export function requiredProfileGaps(level: TrainingLevel, heightCm: number | undefined, weightKg: number | undefined): string[] {
  if (level !== 'beginner') return []
  const gaps: string[] = []
  if (!heightCm) gaps.push('height')
  if (!weightKg) gaps.push('weight')
  return gaps
}

export function gapsMessage(gaps: string[]): string {
  return `To build your plan, add your ${gaps.join(', ').replace(/, ([^,]*)$/, ' and $1')}. Lift will not guess it, and it stays on this phone.`
}
