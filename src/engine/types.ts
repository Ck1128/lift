// Core types shared by the workout engine, database and screens.
// This file has no React or database imports on purpose.

export type Muscle =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core'

export const ALL_MUSCLES: Muscle[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves', 'core',
]

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves', core: 'Core',
}

export type Pattern = 'push' | 'pull' | 'squat' | 'hinge' | 'lunge' | 'core' | 'isolation'

export type EquipmentId =
  | 'bodyweight' | 'dumbbell' | 'barbell' | 'machine' | 'cable' | 'smith'
  | 'bench' | 'pullup_bar' | 'kettlebell' | 'bands' | 'mat'

export const EQUIPMENT_LABEL: Record<EquipmentId, string> = {
  bodyweight: 'Bodyweight only', dumbbell: 'Dumbbells', barbell: 'Barbell and plates',
  machine: 'Weight machines', cable: 'Cable machines', smith: 'Smith machine',
  bench: 'Bench', pullup_bar: 'Pull-up bar', kettlebell: 'Kettlebells',
  bands: 'Resistance bands', mat: 'Exercise mat',
}

/** Equipment that has a weight range and increment the user can configure. */
export const LOADABLE: EquipmentId[] = ['dumbbell', 'kettlebell', 'barbell']

export type ExerciseType = 'machine' | 'dumbbell' | 'barbell' | 'cable' | 'bodyweight' | 'smith' | 'kettlebell' | 'bands'
export type Level = 'beginner' | 'intermediate'
export type WeightUnit = 'lb' | 'kg'
export type HeightUnit = 'cm' | 'in'
export type Goal = 'muscle' | 'strength' | 'general' | 'endurance' | 'fat_loss'
export type Experience = 'beginner' | 'intermediate' | 'advanced'
export type LocationType = 'home' | 'gym'
export type GymType = 'planet_fitness' | 'generic'

export const GOAL_LABEL: Record<Goal, string> = {
  muscle: 'Build muscle', strength: 'Get stronger', general: 'General fitness',
  endurance: 'Endurance', fat_loss: 'Fat loss',
}

export interface Exercise {
  id: string
  name: string
  primaryMuscles: Muscle[]
  secondaryMuscles: Muscle[]
  movementPattern: Pattern
  /** Every item here must be available for the exercise to be eligible. */
  equipmentIds: EquipmentId[]
  exerciseType: ExerciseType
  difficulty: Level
  compound: boolean
  instructions: string[]
  /** free-exercise-db folder id for the start/end photos, when one exists. */
  imageId?: string
  /** Bundled catalog version, for traceability. */
  catalogVersion: string
}

export interface EquipmentItem {
  id: EquipmentId
  available: boolean
  /** Only for loadable equipment (dumbbell, kettlebell, barbell). */
  minWeight?: number
  maxWeight?: number
  increment?: number
  unit?: WeightUnit
}

export type EquipmentSet = Partial<Record<EquipmentId, EquipmentItem>>

export interface Profile {
  id: string
  displayName?: string
  age?: number
  heightValue?: number
  heightUnit: HeightUnit
  weightValue?: number
  weightUnit: WeightUnit
  goal: Goal
  experienceLevel: Experience
  /** 0 = Monday ... 6 = Sunday. */
  trainingDays: number[]
  preferredDurationMinutes: number
  preferredLocation: LocationType
  gymType: GymType
  excludedExerciseIds: string[]
  excludedPatterns: Pattern[]
  limitationNote?: string
  createdAt: string
  updatedAt: string
}

export interface DayPlan {
  focus: string
  muscles: Muscle[]
}

/** Weekday index (0 = Monday) -> plan, or null for a rest day. */
export type WeekSchedule = Record<number, DayPlan | null>

export interface PlannedExercise {
  slotId: string
  exerciseId: string
  name: string
  sets: number
  repMin: number
  repMax: number
  restSeconds: number
  /** Suggested load in `loadUnit`, only when there is real history behind it. */
  suggestedWeight?: number
  loadUnit?: WeightUnit
  /** Plain-language explanation of the load or rep suggestion. */
  loadNote: string
  /** Why this exercise is in the session. */
  why: string
}

export interface GeneratedWorkout {
  title: string
  date: string
  targetMuscles: Muscle[]
  availableMinutes: number
  estimatedMinutes: number
  fits: boolean
  exercises: PlannedExercise[]
  notes: string[]
  assumptions: string[]
  generatorVersion: string
  catalogVersion: string
}

export type GenerationResult =
  | { kind: 'workout'; workout: GeneratedWorkout }
  | { kind: 'rest'; message: string }
  | { kind: 'error'; message: string }

export interface SetLog {
  id: string
  sessionId: string
  slotId: string
  exerciseId: string
  setNumber: number
  plannedRepMin: number
  plannedRepMax: number
  plannedWeight?: number
  actualReps?: number
  actualWeight?: number
  weightUnit: WeightUnit
  completed: boolean
  effortRating?: number
  createdAt: string
  updatedAt: string
}

export type SessionStatus = 'in_progress' | 'completed' | 'partial' | 'abandoned'

export interface ActualExercise {
  slotId: string
  exerciseId: string
  replacedFromId?: string
  skipped: boolean
  painReported: boolean
}

export interface WorkoutSession {
  id: string
  scheduledWorkoutId?: string
  date: string
  startedAt: string
  finishedAt?: string
  status: SessionStatus
  plannedExercises: PlannedExercise[]
  actualExercises: ActualExercise[]
  title: string
  planVersion: number
  generatorVersion: string
  targetMuscles: Muscle[]
  /** Total paused time in milliseconds. */
  pausedMs: number
  pausedAt?: string
  weightUnit: WeightUnit
}

export type ScheduledStatus = 'planned' | 'completed' | 'partial' | 'skipped'

export interface ScheduledWorkout {
  id: string
  planId: string
  /** Local calendar date, YYYY-MM-DD. */
  date: string
  focus: string
  targetMuscles: Muscle[]
  availableMinutes: number
  status: ScheduledStatus
  generatorVersion?: string
  /** Hash of the inputs used to generate `workout`; used to invalidate stale plans. */
  configHash?: string
  workout?: GeneratedWorkout
  rescheduledFromId?: string
  createdAt: string
  updatedAt: string
}

export interface WeeklyPlan {
  id: string
  profileId: string
  startDate: string
  trainingDays: number[]
  schedule: WeekSchedule
  planVersion: number
  createdAt: string
  updatedAt: string
}

export interface SorenessEntry {
  id: string
  date: string
  muscle: Muscle
  /** 1 = mild, 2 = moderate, 3 = very sore. */
  level: 1 | 2 | 3
  createdAt: string
}

export interface BodyWeightEntry {
  id: string
  date: string
  value: number
  unit: WeightUnit
}

/** What the engine needs to know about how an exercise went last time. */
export interface LastPerformance {
  exerciseId: string
  date: string
  unit: WeightUnit
  sets: { weight?: number; reps: number; effort?: number }[]
  painReported: boolean
  /** Rep range that was planned for those sets. */
  repMin: number
  repMax: number
}
