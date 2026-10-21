import { APP_VERSION, db, DB_SCHEMA_VERSION, nowIso, upgradeProfileV2 } from './schema'
import { ALL_EQUIPMENT } from '../engine/types'

export const BACKUP_FORMAT = 'lift-backup'
/**
 * Export format version, separate from the database schema version.
 * 3: the file says which categories it holds (`includes`). 2: yoga and an optional food log, height in cm and weight in kg.
 * Version 1 and 2 files still import.
 */
export const BACKUP_VERSION = 3

const ALL_TABLES = ['profile', 'equipment', 'settings', 'plans', 'scheduled', 'sessions', 'setLogs', 'soreness', 'bodyWeights', 'yogaSessions', 'foodLog'] as const
type TableName = (typeof ALL_TABLES)[number]

/** What a person chooses to put in an export. Each category maps to whole tables. */
export const CATEGORIES = ['profile', 'workouts', 'bodyweight', 'yoga', 'food'] as const
export type Category = (typeof CATEGORIES)[number]
export const CATEGORY_TABLES: Record<Category, readonly TableName[]> = {
  profile: ['profile', 'equipment', 'settings'],
  workouts: ['plans', 'scheduled', 'sessions', 'setLogs', 'soreness'],
  bodyweight: ['bodyWeights'],
  yoga: ['yogaSessions'],
  food: ['foodLog'],
}
export const CATEGORY_LABEL: Record<Category, string> = {
  profile: 'Profile, equipment and settings', workouts: 'Workout plans, sessions and sets', bodyweight: 'Body weight entries', yoga: 'Yoga sessions', food: 'Food log',
}
/** Food is personal, so it is off unless the person turns it on. */
export const DEFAULT_CATEGORIES: Category[] = ['profile', 'workouts', 'bodyweight', 'yoga']

const tablesOf = (cats: readonly Category[]): TableName[] => cats.flatMap((c) => [...CATEGORY_TABLES[c]])

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  appVersion: string
  schemaVersion: number
  /** The categories in this file. Anything not listed is left alone on import. */
  includes: Category[]
  /** True when the food log is part of this file (kept for older readers). */
  includesFood?: boolean
  data: Record<TableName, unknown[]>
}

export async function exportBackup(opts: { includeFood?: boolean; categories?: Category[] } = {}): Promise<BackupFile> {
  const categories = opts.categories ?? (opts.includeFood ? [...DEFAULT_CATEGORIES, 'food' as const] : DEFAULT_CATEGORIES)
  const data = {} as Record<TableName, unknown[]>
  const wanted = new Set(tablesOf(categories))
  for (const t of ALL_TABLES) data[t] = wanted.has(t) ? await db.table(t).toArray() : []
  return {
    format: BACKUP_FORMAT, version: BACKUP_VERSION, includes: [...categories], includesFood: categories.includes('food'),
    exportedAt: nowIso(), appVersion: APP_VERSION, schemaVersion: DB_SCHEMA_VERSION, data,
  }
}

export function backupFilename(d = new Date()): string {
  return `lift-backup-${d.toISOString().slice(0, 10)}.json`
}

// ---------- validation (data only: nothing in a backup is ever executed) ----------
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const oneOf = (v: unknown, list: readonly string[]) => typeof v === 'string' && list.includes(v)
const DATE = /^\d{4}-\d{2}-\d{2}$/
const UNITS = ['lb', 'kg'] as const
const GOALS = ['muscle', 'strength', 'general', 'endurance', 'fat_loss'] as const
const MUSCLES = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core'] as const
const SESSION_STATUS = ['in_progress', 'completed', 'partial', 'abandoned'] as const
const SCHEDULED_STATUS = ['planned', 'completed', 'partial', 'skipped'] as const
const EQUIPMENT: readonly string[] = ALL_EQUIPMENT

type Check = (r: Record<string, unknown>) => string | null

const CHECKS: Record<TableName, Check> = {
  profile: (r) =>
    !isStr(r.id) ? 'missing id'
    : !oneOf(r.goal, GOALS) ? 'unknown goal'
    : !oneOf(r.weightUnit, UNITS) ? 'bad weight unit'
    : r.heightDisplayUnit !== undefined && !oneOf(r.heightDisplayUnit, ['cm', 'ft-in']) ? 'bad height unit'
    : r.heightCm !== undefined && (!isNum(r.heightCm) || r.heightCm < 50 || r.heightCm > 300) ? 'bad height'
    : r.weightKg !== undefined && (!isNum(r.weightKg) || r.weightKg < 10 || r.weightKg > 700) ? 'bad body weight'
    : !oneOf(r.trainingLevel, ['beginner', 'intermediate', 'regular']) ? 'bad training level'
    : !Array.isArray(r.trainingDays) || r.trainingDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ? 'bad training days'
    : !isNum(r.preferredDurationMinutes) ? 'bad duration' : null,
  equipment: (r) =>
    !oneOf(r.location, ['home', 'gym']) ? 'bad location'
    : !isObj(r.items) || Object.entries(r.items).some(([k, v]) => !oneOf(k, EQUIPMENT) || !isObj(v) || typeof v.available !== 'boolean') ? 'bad equipment items' : null,
  plans: (r) => (!isStr(r.id) ? 'missing id' : !isObj(r.schedule) ? 'bad schedule' : !isNum(r.planVersion) ? 'bad plan version' : null),
  scheduled: (r) =>
    !isStr(r.id) ? 'missing id'
    : !isStr(r.date) || !DATE.test(r.date) ? 'bad date'
    : !oneOf(r.status, SCHEDULED_STATUS) ? 'bad status'
    : !Array.isArray(r.targetMuscles) ? 'bad muscles' : null,
  sessions: (r) =>
    !isStr(r.id) ? 'missing id'
    : !isStr(r.date) || !DATE.test(r.date) ? 'bad date'
    : !oneOf(r.status, SESSION_STATUS) ? 'bad status'
    : !oneOf(r.weightUnit, UNITS) ? 'bad weight unit'
    : !Array.isArray(r.plannedExercises) || !Array.isArray(r.actualExercises) ? 'bad exercises' : null,
  setLogs: (r) =>
    !isStr(r.id) ? 'missing id'
    : !isStr(r.sessionId) ? 'missing session id'
    : !isStr(r.exerciseId) ? 'missing exercise id'
    : !oneOf(r.weightUnit, UNITS) ? 'bad weight unit'
    : typeof r.completed !== 'boolean' ? 'bad completed flag'
    : r.actualReps !== undefined && (!isNum(r.actualReps) || r.actualReps < 0 || r.actualReps > 1000) ? 'bad reps'
    : r.actualWeight !== undefined && (!isNum(r.actualWeight) || r.actualWeight < 0 || r.actualWeight > 2000) ? 'bad weight' : null,
  settings: (r) => (!isStr(r.key) ? 'missing key' : null),
  soreness: (r) => (!isStr(r.id) ? 'missing id' : !oneOf(r.muscle, MUSCLES) ? 'bad muscle' : ![1, 2, 3].includes(r.level as number) ? 'bad level' : !isStr(r.date) || !DATE.test(r.date) ? 'bad date' : null),
  yogaSessions: (r) =>
    !isStr(r.id) ? 'missing id'
    : !isStr(r.date) || !DATE.test(r.date) ? 'bad date'
    : !isStr(r.status) ? 'bad status' : null,
  foodLog: (r) =>
    !isStr(r.id) ? 'missing id'
    : !isStr(r.date) || !DATE.test(r.date) ? 'bad date'
    : !oneOf(r.mealCategory, ['breakfast', 'lunch', 'dinner', 'evening_snacks', 'other']) ? 'bad meal category'
    : r.kcal !== undefined && (!isNum(r.kcal) || r.kcal < 0 || r.kcal > 20000) ? 'bad calories' : null,
  bodyWeights: (r) => (!isStr(r.id) ? 'missing id' : !isNum(r.value) || r.value <= 0 ? 'bad value' : !oneOf(r.unit, UNITS) ? 'bad unit' : !isStr(r.date) || !DATE.test(r.date) ? 'bad date' : null),
}

const KEY: Record<TableName, string> = {
  profile: 'id', equipment: 'location', plans: 'id', scheduled: 'id', sessions: 'id', setLogs: 'id', settings: 'key', soreness: 'id', bodyWeights: 'id', yogaSessions: 'id', foodLog: 'id',
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string }

/** The largest file this app will read. A real backup is far smaller. */
export const MAX_IMPORT_BYTES = 50 * 1024 * 1024

function includesOf(raw: Record<string, unknown>, version: number): Category[] | null {
  if (version >= 3) {
    if (!Array.isArray(raw.includes) || raw.includes.some((c) => !oneOf(c, CATEGORIES))) return null
    return CATEGORIES.filter((c) => (raw.includes as string[]).includes(c))
  }
  // Older files: everything except food, plus food when the file said so.
  return raw.includesFood === true ? [...DEFAULT_CATEGORIES, 'food'] : [...DEFAULT_CATEGORIES]
}

export function parseBackup(text: string): ParseResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'That file is too large to be a Lift backup.' }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file is not valid JSON. Pick a backup file made by this app.' }
  }
  if (isObj(raw) && raw.format === 'lift-encrypted') return { ok: false, error: 'This file is password-protected. Enter its password to open it.' }
  if (!isObj(raw) || raw.format !== BACKUP_FORMAT) return { ok: false, error: 'This is not a Lift backup file.' }
  if (!isNum(raw.version) || raw.version > BACKUP_VERSION || raw.version < 1) {
    return { ok: false, error: `Backup format version ${String(raw.version)} is not supported by this app version.` }
  }
  if (!isObj(raw.data)) return { ok: false, error: 'The backup has no data section.' }
  const includes = includesOf(raw, raw.version)
  if (!includes) return { ok: false, error: 'The backup lists categories this app does not know.' }
  if (includes.length === 0) return { ok: false, error: 'The backup says it contains nothing.' }
  const wanted = new Set(tablesOf(includes))
  const data = {} as Record<TableName, unknown[]>
  for (const t of ALL_TABLES) {
    // A category the file does not claim is ignored, even if rows are present.
    if (!wanted.has(t)) { data[t] = []; continue }
    let rows = (raw.data as Record<string, unknown>)[t] ?? []
    // Older backups store height and weight as typed. Convert them the same way the database upgrade does.
    if (t === 'profile' && Array.isArray(rows) && raw.version < 2) {
      rows = rows.map((p) => (isObj(p) ? upgradeProfileV2(p) : p))
    }
    if (!Array.isArray(rows)) return { ok: false, error: `The "${t}" section is damaged.` }
    if (rows.length > 500_000) return { ok: false, error: `The "${t}" section is too large.` }
    const seen = new Set<string>()
    for (const [i, row] of rows.entries()) {
      if (!isObj(row)) return { ok: false, error: `${t} record ${i + 1} is not an object.` }
      const problem = CHECKS[t](row)
      if (problem) return { ok: false, error: `${t} record ${i + 1}: ${problem}.` }
      const key = String(row[KEY[t]])
      if (seen.has(key)) return { ok: false, error: `${t} has a duplicate record (${key}).` }
      seen.add(key)
    }
    data[t] = rows
  }
  // Every set must belong to a session in the file.
  const sessionIds = new Set((data.sessions as { id: string }[]).map((s) => s.id))
  const orphan = (data.setLogs as { sessionId: string }[]).find((l) => !sessionIds.has(l.sessionId))
  if (orphan) return { ok: false, error: 'A logged set points to a workout that is not in the file.' }
  if ((data.profile as unknown[]).length > 1) return { ok: false, error: 'The backup has more than one profile.' }
  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT, version: raw.version, exportedAt: String(raw.exportedAt ?? ''),
      appVersion: String(raw.appVersion ?? ''), schemaVersion: Number(raw.schemaVersion ?? 0),
      includes, includesFood: includes.includes('food'), data,
    },
  }
}

export interface BackupPreview {
  exportedAt: string
  formatVersion: number
  appVersion: string
  includes: Category[]
  profileName?: string
  workouts: number
  yogaSessions: number
  foodEntries: number
  bodyWeights: number
  includesFood: boolean
  sets: number
  firstDate?: string
  lastDate?: string
  /** The most recent workouts in the file, for a read-only look. Shown as plain text. */
  recent: { date: string; title: string }[]
}

/** A read-only summary of a parsed file. It never touches the database. */
export function previewBackup(b: BackupFile): BackupPreview {
  const sessions = b.data.sessions as { date: string; title?: string }[]
  const dates = sessions.map((s) => s.date).sort()
  const profile = b.data.profile[0] as { displayName?: string } | undefined
  const recent = [...sessions].sort((x, y) => y.date.localeCompare(x.date)).slice(0, 8).map((s) => ({ date: s.date, title: String(s.title ?? 'Workout').slice(0, 80) }))
  return {
    exportedAt: b.exportedAt, formatVersion: b.version, appVersion: b.appVersion, includes: b.includes,
    profileName: profile?.displayName === undefined ? undefined : String(profile.displayName).slice(0, 60),
    workouts: sessions.length, sets: b.data.setLogs.length, yogaSessions: b.data.yogaSessions.length, foodEntries: b.data.foodLog.length,
    bodyWeights: b.data.bodyWeights.length, includesFood: b.includes.includes('food'), firstDate: dates[0], lastDate: dates[dates.length - 1], recent,
  }
}

export interface ImportReport {
  mode: 'replace' | 'merge'
  /** Records written to this device. */
  added: number
  /** Records that were already here (same id), left exactly as they were. Merge only. */
  skipped: number
  /** Always 0 on success: an import is all or nothing, so a failure changes nothing and throws instead. */
  failed: number
  perTable: Partial<Record<TableName, { added: number; skipped: number }>>
}

/**
 * replace: erase the categories in the file on this device, then load them. Categories not in the file are untouched.
 * merge:   keep everything here and add only records that are not already present (same id = already present).
 *          Nothing already on the device is overwritten. A saved profile is kept. Sets whose workout was already
 *          here are skipped too, so a workout is never mixed from two copies.
 * The whole import runs in ONE transaction on data that was validated first: if anything throws, nothing is changed.
 */
export async function importBackup(b: BackupFile, mode: 'replace' | 'merge'): Promise<ImportReport> {
  const report: ImportReport = { mode, added: 0, skipped: 0, failed: 0, perTable: {} }
  const tables = tablesOf(b.includes)
  await db.transaction('rw', db.tables, async () => {
    const skippedSessions = new Set<string>()
    for (const t of ALL_TABLES) {
      if (!tables.includes(t)) continue
      const table = db.table(t)
      const rows = b.data[t]
      if (mode === 'replace') {
        await table.clear()
        await table.bulkAdd(rows)
        report.perTable[t] = { added: rows.length, skipped: 0 }
        report.added += rows.length
        continue
      }
      const keyName = KEY[t]
      const existing = new Set((await table.toArray()).map((r) => String((r as Record<string, unknown>)[keyName])))
      let fresh = rows.filter((r) => !existing.has(String((r as Record<string, unknown>)[keyName])))
      if (t === 'sessions') for (const r of rows) if (existing.has(String((r as { id: string }).id))) skippedSessions.add((r as { id: string }).id)
      if (t === 'setLogs') fresh = fresh.filter((r) => !skippedSessions.has((r as { sessionId: string }).sessionId))
      if (t === 'profile' && existing.size > 0) fresh = []
      await table.bulkAdd(fresh)
      report.perTable[t] = { added: fresh.length, skipped: rows.length - fresh.length }
      report.added += fresh.length
      report.skipped += rows.length - fresh.length
    }
  })
  return report
}

/** What is on this device right now, shown next to a preview so the two are never confused. */
export async function deviceSummary(): Promise<{ workouts: number; yogaSessions: number; foodEntries: number; bodyWeights: number }> {
  return {
    workouts: await db.sessions.count(), yogaSessions: await db.yogaSessions.count(), foodEntries: await db.foodLog.count(), bodyWeights: await db.bodyWeights.count(),
  }
}

export const encryptedBackupFilename = (d = new Date()): string => `lift-backup-encrypted-${d.toISOString().slice(0, 10)}.json`
