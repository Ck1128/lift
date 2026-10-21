import Dexie, { type Table } from 'dexie'
import type {
  BodyWeightEntry, EquipmentSet, LocationType, Profile, ScheduledWorkout, SetLog, SorenessEntry,
  WeeklyPlan, WorkoutSession,
} from '../engine/types'

export const APP_VERSION = '1.0.0'
export const DB_SCHEMA_VERSION = 2

/** Equipment is stored once per location (home / gym). */
export interface EquipmentRecord {
  location: LocationType
  items: EquipmentSet
  updatedAt: string
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
  }
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
