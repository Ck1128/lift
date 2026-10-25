/**
 * Ranks the exercises that could fill a muscle slot, using what the person told the app: training level, goal, age,
 * and where they train. Higher is better. Rotation (what you did least recently) only breaks ties, so a session is
 * designed, not just "whatever sorts first".
 */
import type { Exercise, ExerciseType, Goal, Muscle, TrainingLevel } from './types'

/** Best-first lists of well-known, sensible exercises per muscle. Names must match the catalog (a test checks them). */
export const STAPLES: Record<Muscle, string[]> = {
  chest: ['Leverage Chest Press', 'Dumbbell Bench Press', 'Incline Dumbbell Press', 'Pushups', 'Cable Crossover', 'Incline Push-Up', 'Smith Machine Bench Press', 'Machine Bench Press'],
  back: ['Wide-Grip Lat Pulldown', 'Seated Cable Rows', 'Leverage Iso Row', 'One-Arm Dumbbell Row', 'Underhand Cable Pulldowns', 'Bent Over Two-Dumbbell Row', 'Back Extension Machine'],
  shoulders: ['Leverage Shoulder Press', 'Seated Dumbbell Press', 'Lateral Raise Machine', 'Dumbbell Raise', 'Cable Rope Rear-Delt Rows', 'Smith Machine Overhead Shoulder Press'],
  quads: ['Leg Press', 'Goblet Squat', 'Smith Machine Squat', 'Leg Extension Machine', 'Dumbbell Lunges', 'Split Squat with Dumbbells', 'Dumbbell Squat', 'Bodyweight Squat'],
  hamstrings: ['Seated Leg Curl', 'Lying Leg Curls', 'Stiff-Legged Dumbbell Deadlift', 'Smith Machine Stiff-Legged Deadlift'],
  glutes: ['Glute Kickback Machine', 'Dumbbell Glute Bridge', 'Pull Through', 'Dumbbell Hip Thrust', 'Butt Lift (Bridge)', 'Step-up with Knee Raise'],
  calves: ['Standing Calf Raises', 'Calf Press', 'Smith Machine Calf Raise', 'Standing Dumbbell Calf Raise'],
  biceps: ['Machine Bicep Curl', 'Dumbbell Bicep Curl', 'Hammer Curls', 'EZ-Bar Curl', 'Standing Biceps Cable Curl', 'Incline Dumbbell Curl'],
  triceps: ['Triceps Pushdown', 'Machine Triceps Extension', 'Dumbbell Tricep Extension -Pronated Grip', 'Cable One Arm Tricep Extension', 'Close-Grip Dumbbell Press', 'Tricep Dumbbell Kickback'],
  core: ['Ab Crunch Machine', 'Dead Bug', 'Rope Crunch', 'Standing Cable Wood Chop', 'Pallof Press With Rotation', 'Cocoons', '3/4 Sit-Up'],
}

const EQUIPMENT_FIT: Record<TrainingLevel, Partial<Record<ExerciseType, number>>> = {
  beginner: { machine: 2.5, cable: 1.5, dumbbell: 1, smith: 0.5, ez_bar: 0.5, bodyweight: 0.5 },
  intermediate: { dumbbell: 1.5, cable: 1, smith: 1, machine: 0.5, ez_bar: 1, kettlebell: 0.5 },
  regular: { dumbbell: 2, smith: 1.5, cable: 1, barbell: 2, ez_bar: 1, machine: 0.5, kettlebell: 0.5 },
}

/** Skill-heavy or ballistic movements: a poor first choice for newer lifters. */
const COMPLEX = /deadlift|clean|snatch|jerk|behind|good morning|stiff|sprint|bosu|overhead squat|pistol|muscle-up|handstand|jm press|neck press|spider|drag|rocking|iron cross|judo|windmill|pass through|thruster|sumo/i
/** High-impact or jumpy: skipped as a first choice for older lifters. */
const IMPACT = /jump|plyo|hop|bound|burpee|sprint|box|clap|kipping/i
/** Less common variations that make a plain, repeatable session harder to follow. */
const FUSSY = /one-legged|single-leg|one-arm|alternating|iso\b|rear pull|speed band|towel|anti-gravity|bradford|cuban|pirate/i

export interface SuitabilityContext {
  level: TrainingLevel
  goal: Goal
  age?: number
}

export function suitability(ex: Exercise, ctx: SuitabilityContext): number {
  let score = 0
  const list = STAPLES[ex.primaryMuscles[0]] ?? []
  const idx = list.indexOf(ex.name)
  if (idx >= 0) score += Math.max(2, 12 - idx * 1.4)
  score += EQUIPMENT_FIT[ctx.level][ex.exerciseType] ?? 0
  if (ctx.goal === 'strength' || ctx.goal === 'fat_loss' || ctx.goal === 'endurance') score += ex.compound ? 1.5 : 0
  if (ctx.goal === 'muscle') score += ex.compound ? 0.5 : 0.3
  if (COMPLEX.test(ex.name)) score -= ctx.level === 'beginner' ? 20 : ctx.level === 'intermediate' ? 3 : 0.5
  if (ctx.age !== undefined && ctx.age >= 50) {
    if (IMPACT.test(ex.name)) score -= 6
    if (ex.exerciseType === 'machine' || ex.exerciseType === 'cable') score += 1.5
  }
  if (ctx.level === 'beginner' && FUSSY.test(ex.name)) score -= 1.5
  return score
}
