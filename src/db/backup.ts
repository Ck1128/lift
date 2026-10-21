import { APP_VERSION, db, DB_SCHEMA_VERSION, nowIso } from './schema'

export const BACKUP_FORMAT = 'lift-backup'
export const BACKUP_VERSION = 1

const TABLES = ['profile', 'equipment', 'plans', 'scheduled', 'sessions', 'setLogs', 'settings', 'soreness', 'bodyWeights'] as const
type TableName = (typeof TABLES)[number]

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  appVersion: string
  schemaVersion: number
  data: Record<TableName, unknown[]>
}

export async function exportBackup(): Promise<BackupFile> {
  const data = {} as Record<TableName, unknown[]>
  for (const t of TABLES) data[t] = await db.table(t).toArray()
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: nowIso(), appVersion: APP_VERSION, schemaVersion: DB_SCHEMA_VERSION, data }
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
const EQUIPMENT = ['bodyweight', 'dumbbell', 'barbell', 'machine', 'cable', 'smith', 'bench', 'pullup_bar', 'kettlebell', 'bands', 'mat'] as const

type Check = (r: Record<string, unknown>) => string | null

const CHECKS: Record<TableName, Check> = {
  profile: (r) =>
    !isStr(r.id) ? 'missing id'
    : !oneOf(r.goal, GOALS) ? 'unknown goal'
    : !oneOf(r.weightUnit, UNITS) ? 'bad weight unit'
    : !oneOf(r.heightUnit, ['cm', 'in']) ? 'bad height unit'
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
  bodyWeights: (r) => (!isStr(r.id) ? 'missing id' : !isNum(r.value) || r.value <= 0 ? 'bad value' : !oneOf(r.unit, UNITS) ? 'bad unit' : !isStr(r.date) || !DATE.test(r.date) ? 'bad date' : null),
}

const KEY: Record<TableName, string> = {
  profile: 'id', equipment: 'location', plans: 'id', scheduled: 'id', sessions: 'id', setLogs: 'id', settings: 'key', soreness: 'id', bodyWeights: 'id',
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string }

export function parseBackup(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file is not valid JSON. Pick a backup file made by this app.' }
  }
  if (!isObj(raw) || raw.format !== BACKUP_FORMAT) return { ok: false, error: 'This is not a Lift backup file.' }
  if (!isNum(raw.version) || raw.version > BACKUP_VERSION || raw.version < 1) {
    return { ok: false, error: `Backup format version ${String(raw.version)} is not supported by this app version.` }
  }
  if (!isObj(raw.data)) return { ok: false, error: 'The backup has no data section.' }
  const data = {} as Record<TableName, unknown[]>
  for (const t of TABLES) {
    const rows = (raw.data as Record<string, unknown>)[t] ?? []
    if (!Array.isArray(rows)) return { ok: false, error: `The "${t}" section is damaged.` }
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
      appVersion: String(raw.appVersion ?? ''), schemaVersion: Number(raw.schemaVersion ?? 0), data,
    },
  }
}

export interface BackupPreview {
  exportedAt: string
  profileName?: string
  workouts: number
  sets: number
  firstDate?: string
  lastDate?: string
}

export function previewBackup(b: BackupFile): BackupPreview {
  const sessions = b.data.sessions as { date: string }[]
  const dates = sessions.map((s) => s.date).sort()
  const profile = b.data.profile[0] as { displayName?: string } | undefined
  return {
    exportedAt: b.exportedAt, profileName: profile?.displayName, workouts: sessions.length,
    sets: b.data.setLogs.length, firstDate: dates[0], lastDate: dates[dates.length - 1],
  }
}

/**
 * replace: wipe this phone's data and load the backup.
 * merge:   keep everything here and add only records that are not already present
 *          (same id = already present). The existing profile and equipment are kept.
 * Runs in ONE transaction: if anything throws, nothing is changed.
 */
export async function importBackup(b: BackupFile, mode: 'replace' | 'merge'): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const t of TABLES) {
      const table = db.table(t)
      const rows = b.data[t]
      if (mode === 'replace') {
        await table.clear()
        await table.bulkAdd(rows)
      } else {
        const keyName = KEY[t]
        const existing = new Set((await table.toArray()).map((r) => String((r as Record<string, unknown>)[keyName])))
        const fresh = rows.filter((r) => !existing.has(String((r as Record<string, unknown>)[keyName])))
        if (t === 'profile' && existing.size > 0) continue
        await table.bulkAdd(fresh)
      }
    }
  })
}
