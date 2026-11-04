import type { HealthWorkoutRow } from '../engine/health'
import Dexie, { type Table } from 'dexie'
import type {
  BodyWeightEntry, EquipmentId, EquipmentSet, LocationType, Profile, ScheduledWorkout, SetLog, SorenessEntry,
  WeeklyPlan, WorkoutSession,
} from '../engine/types'
import type { PresetKind } from '../engine/equipment'
import type { YogaPlan, YogaSession } from '../engine/yoga'
import type { FoodCacheEntry, FoodLogEntry } from '../engine/food'

/** Comes from package.json at build time (see vite.config.ts). Bump the version there for every release. */
export const APP_VERSION: string = __APP_VERSION__
export const DB_SCHEMA_VERSION = 5

/** Equipment is stored once per location (home / gym). */
export interface EquipmentRecord {
  location: LocationType
  items: EquipmentSet
  updatedAt: string
  /**
   * When set, `items` follows this maintained preset (for example the standard gym) and only `excluded` is the user's choice.
   * Missing means the user edited the list by hand.
   */
  preset?: PresetKind
  /** Items the user said their club does not have. Only used with `preset`. */
  excluded?: EquipmentId[]
}

export interface YogaPlanRecord {
  /** Cache key built from every input that changes the plan. */
  key: string
  plan: YogaPlan
  createdAt: string
}

export interface SettingRecord {
  key: string
  value: unknown
}

export class LiftDB extends Dexie {
  profile!: Table<Profile, string>
  equipment!: Table<EquipmentRecord, string>
  plans!: Table<WeeklyPlan, string>
  scheduled!: Table<ScheduledWorkout, string>
  sessions!: Table<WorkoutSession, string>
  setLogs!: Table<SetLog, string>
  settings!: Table<SettingRecord, string>
  soreness!: Table<SorenessEntry, string>
  bodyWeights!: Table<BodyWeightEntry, string>
  yogaSessions!: Table<YogaSession, string>
  yogaPlans!: Table<YogaPlanRecord, string>
  foodLog!: Table<FoodLogEntry, string>
  foodCache!: Table<FoodCacheEntry, string>
  healthWorkouts!: Table<HealthWorkoutRow, string>

  constructor(name = 'lift-db') {
    super(name)
    // Version 1: the original schema.
    this.version(1).stores({
      profile: 'id',
      equipment: 'location',
      plans: 'id, profileId, startDate',
      scheduled: 'id, date, planId, status',
      sessions: 'id, date, status, scheduledWorkoutId',
      setLogs: 'id, sessionId, exerciseId, slotId',
      settings: 'key',
    })
    // Version 2: adds soreness and body-weight history, and backfills older sessions.
    // Existing rows are never deleted; the upgrade only fills in fields that did not exist.
    this.version(2)
      .stores({
        soreness: 'id, date, muscle',
        bodyWeights: 'id, date',
      })
      .upgrade(async (tx) => {
        await tx.table('sessions').toCollection().modify((s: Partial<WorkoutSession>) => {
          if (!s.generatorVersion) s.generatorVersion = 'unknown'
          if (s.pausedMs === undefined) s.pausedMs = 0
          if (!s.targetMuscles) s.targetMuscles = []
        })
      })
    // Version 3 (Phase B): yoga, food, canonical height and weight, three training levels.
    // Nothing is deleted. Old profile fields are converted, and every new table starts empty.
    this.version(3)
      .stores({
        yogaSessions: 'id, date, status',
        yogaPlans: 'key',
        foodLog: 'id, date, mealCategory',
        foodCache: 'key',
      })
      .upgrade(async (tx) => {
        await tx.table('profile').toCollection().modify((p: Record<string, unknown>) => {
          const next = upgradeProfileV2(p)
          for (const k of Object.keys(p)) delete p[k]
          Object.assign(p, next)
        })
        await tx.table('sessions').toCollection().modify((s: Partial<WorkoutSession>) => {
          if (!s.updatedAt) s.updatedAt = s.finishedAt ?? s.startedAt
        })
      })
    // Version 4 (Phase B2): which activities are switched on. Every existing profile keeps both Workout and Yoga,
    // so returning users are not sent back through setup. No table or index changes, and nothing is deleted.
    this.version(4)
      .stores({})
      .upgrade(async (tx) => {
        await tx.table('profile').toCollection().modify((p: Record<string, unknown>) => {
          if (!Array.isArray(p.tracks) || p.tracks.length === 0) p.tracks = ['workout', 'yoga']
        })
      })
    // Version 5: workouts brought in from Apple Health. A new table only; nothing existing changes.
    this.version(5).stores({ healthWorkouts: 'id, date' })
  }
}

/**
 * Converts a version 1 or 2 profile into the version 3 shape. Used by the database upgrade and when importing an old backup.
 * Old values are converted, never dropped: height becomes centimetres, weight becomes kilograms.
 */
export function upgradeProfileV2(p: Record<string, unknown>): Record<string, unknown> {
  const out = { ...p }
  const hUnit = p.heightUnit === 'cm' ? 'cm' : 'in'
  if (typeof p.heightValue === 'number' && out.heightCm === undefined) {
    out.heightCm = Math.round((hUnit === 'cm' ? p.heightValue : p.heightValue * 2.54) * 10) / 10
  }
  if (out.heightDisplayUnit === undefined) out.heightDisplayUnit = hUnit === 'cm' ? 'cm' : 'ft-in'
  const wUnit = p.weightUnit === 'kg' ? 'kg' : 'lb'
  if (typeof p.weightValue === 'number' && out.weightKg === undefined) {
    out.weightKg = Math.round((wUnit === 'kg' ? p.weightValue : p.weightValue / 2.2046226218) * 100) / 100
  }
  if (out.trainingLevel === undefined) {
    const old = p.experienceLevel
    out.trainingLevel = old === 'advanced' ? 'regular' : old === 'intermediate' ? 'intermediate' : 'beginner'
  }
  if (out.nutritionGuidance === undefined) out.nutritionGuidance = false
  delete out.heightValue
  delete out.heightUnit
  delete out.weightValue
  delete out.experienceLevel
  return out
}

export let db = new LiftDB()

/** Tests open a throwaway database. */
export function useDatabase(name: string): LiftDB {
  db = new LiftDB(name)
  return db
}

export const uid = (): string =>
  (globalThis.crypto && 'randomUUID' in globalThis.crypto
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)

export const nowIso = (): string => new Date().toISOString()
