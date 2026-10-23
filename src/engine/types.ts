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
  | 'bench' | 'pullup_bar' | 'kettlebell' | 'bands' | 'mat' | 'ez_bar'
  | 'treadmill' | 'exercise_bike' | 'elliptical' | 'rower' | 'stair_climber'

export const ALL_EQUIPMENT: EquipmentId[] = [
  'bodyweight', 'dumbbell', 'barbell', 'machine', 'cable', 'smith', 'bench', 'pullup_bar', 'kettlebell', 'bands', 'mat', 'ez_bar',
  'treadmill', 'exercise_bike', 'elliptical', 'rower', 'stair_climber',
]

export const EQUIPMENT_LABEL: Record<EquipmentId, string> = {
  bodyweight: 'Bodyweight / no equipment', dumbbell: 'Dumbbells', barbell: 'Barbell and plates',
  machine: 'Weight machines', cable: 'Cable machines', smith: 'Smith machine',
  bench: 'Bench', pullup_bar: 'Pull-up bar', kettlebell: 'Kettlebells',
  bands: 'Resistance bands', mat: 'Exercise mat', ez_bar: 'EZ-curl bar / fixed barbells',
  treadmill: 'Treadmill', exercise_bike: 'Exercise bike', elliptical: 'Elliptical',
  rower: 'Rowing machine', stair_climber: 'Stair climber',
}

/** Equipment used for cardio only. */
export const CARDIO_EQUIPMENT: EquipmentId[] = ['treadmill', 'exercise_bike', 'elliptical', 'rower', 'stair_climber']

/** Equipment that has a weight range and increment the user can configure. */
export const LOADABLE: EquipmentId[] = ['dumbbell', 'kettlebell', 'barbell']

export type ExerciseType = 'machine' | 'dumbbell' | 'barbell' | 'cable' | 'bodyweight' | 'smith' | 'kettlebell' | 'bands' | 'ez_bar'
export type Level = 'beginner' | 'intermediate'
export type WeightUnit = 'lb' | 'kg'
/** How height is shown and typed. It is always stored in centimetres. */
export type HeightUnit = 'cm' | 'ft-in'
export type Goal = 'muscle' | 'strength' | 'general' | 'endurance' | 'fat_loss'
/** "regular" is the Regular gym-goer choice. It describes habits, not a guarantee of advanced ability. */
export type TrainingLevel = 'beginner' | 'intermediate' | 'regular'
export type Experience = TrainingLevel
export const LEVEL_LABEL: Record<TrainingLevel, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', regular: 'Regular gym-goer',
}
export type Sex = 'female' | 'male'
/** The activities a person uses the app for. At least one is always on. */
export type Track = 'workout' | 'yoga'
export const ALL_TRACKS: Track[] = ['workout', 'yoga']
export const TRACK_LABEL: Record<Track, string> = { workout: 'Workout', yoga: 'Yoga' }
export type LocationType = 'home' | 'gym'
export type GymType = 'standard' | 'generic'

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
  /** The exact weights the person owns (for example 12 only, or 10, 12, 20). Takes priority over the range. */
  weights?: number[]
  unit?: WeightUnit
}

export type EquipmentSet = Partial<Record<EquipmentId, EquipmentItem>>

export interface Profile {
  id: string
  displayName?: string
  age?: number
  /** Canonical height in centimetres. */
  heightCm?: number
  /** Only how height is displayed and typed. */
  heightDisplayUnit: HeightUnit
  /** Canonical body weight in kilograms. */
  weightKg?: number
  /** The app-wide default unit for weights (lifting and body weight). */
  weightUnit: WeightUnit
  goal: Goal
  trainingLevel: TrainingLevel
  /** Which activities are switched on. Missing (older profiles) means both. Turning one off never deletes its history. */
  tracks?: Track[]
  /** Yoga has its own level. It is never assumed from the strength level. */
  yogaLevel?: TrainingLevel
  /** Optional. Only used by the energy estimate equation. */
  sex?: Sex
  /** Date of birth, YYYY-MM-DD. Age is worked out from it each time the profile is read. */
  birthDate?: string
  /** Optional next-day activity guidance. Off unless the user turns it on. */
  nutritionGuidance: boolean
  /** 0 = Monday ... 6 = Sunday. */
  trainingDays: number[]
  preferredDurationMinutes: number
  preferredLocation: LocationType
  gymType: GymType
  excludedExerciseIds: string[]
  excludedPatterns: Pattern[]
  limitationNote?: string
  /** Areas that are injured or being rehabbed. They recover more slowly and get gentler, shorter work. */
  injuredMuscles?: Muscle[]
  createdAt: string
  updatedAt: string
}

export interface DayPlan {
  focus: string
  muscles: Muscle[]
  /** A cardio-only session: no strength exercises. */
  cardioOnly?: boolean
  /** The optional 30 minute express circuit: one exercise per area, done back to back for rounds. */
  circuit?: boolean
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
  /** Missing means strength. Cardio items use `durationMinutes` instead of sets and reps. */
  kind?: 'strength' | 'cardio'
  durationMinutes?: number
  /** Plain-language effort guide for cardio, for example the talk test. */
  intensityCue?: string
  /** Short form cues, more of them for beginners. */
  cues?: string[]
}

export interface GeneratedWorkout {
  title: string
  date: string
  targetMuscles: Muscle[]
  availableMinutes: number
  estimatedMinutes: number
  fits: boolean
  /** Minutes of cardio included in the estimate (0 when none). */
  cardioMinutes: number
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
  /** Cardio only: minutes actually done. */
  actualMinutes?: number
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
  /** What this slot looked like before the last replacement, so it can be undone. Cleared by a new replacement. */
  previous?: { exerciseId: string; replacedFromId?: string; sets: SetLog[] }
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
  /** Minutes the user chose for this session. Each day can differ. */
  plannedMinutes?: number
  updatedAt?: string
  /** Set when a finished session was reopened. Not shown as a new workout. */
  reopenedAt?: string
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
  /** The user chose to keep this workout when their training level changed. */
  keepPlan?: boolean
  /** 'none' skips cardio; a cardio id picks that activity; missing lets the app choose. */
  cardioChoice?: string
  /** A cardio-only session (no strength exercises). */
  cardioOnly?: boolean
  /** The 30 minute express circuit. */
  circuit?: boolean
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
  /** Set when the entry came from Apple Health, so it is never sent back. */
  source?: 'health'
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
