import { db, nowIso } from './schema'
import { getSetting, setSetting } from './settings'
import { liftIntervals, planMerge, type HealthBatch, type MergePlan, type SendItem } from '../engine/health'

export interface HealthPrefs {
  sendName: string
  readName: string
  includeKcal: boolean
  includeFood: boolean
  lastImportAt?: string
  lastSendAt?: string
}
export const DEFAULT_PREFS: HealthPrefs = { sendName: 'Lift to Health', readName: 'Health to Lift', includeKcal: false, includeFood: false }

const PREFS = 'health.prefs'
const SENT = 'health.sent'

export const getHealthPrefs = async (): Promise<HealthPrefs> => ({ ...DEFAULT_PREFS, ...(await getSetting<Partial<HealthPrefs>>(PREFS, {})) })
export const saveHealthPrefs = (p: HealthPrefs) => setSetting(PREFS, p)
export const getSent = () => getSetting<Record<string, string>>(SENT, {})

/** Lift cannot see whether the Shortcut really logged the lines, so "sent" means "handed to the Shortcut". */
export async function markSent(items: SendItem[]): Promise<void> {
  const sent = await getSent()
  const at = nowIso()
  for (const i of items) sent[i.id] = at
  await setSetting(SENT, sent)
  await saveHealthPrefs({ ...(await getHealthPrefs()), lastSendAt: at })
}
export async function clearSent(): Promise<void> {
  await setSetting(SENT, {})
}

export async function previewImport(batch: HealthBatch, unit: 'kg' | 'lb', since?: string): Promise<MergePlan> {
  const [weights, health, sessions, yoga] = await Promise.all([db.bodyWeights.toArray(), db.healthWorkouts.toArray(), db.sessions.toArray(), db.yogaSessions.toArray()])
  const ids = new Set<string>([...health.map((h) => h.id), ...weights.filter((w) => w.source === 'health').map((w) => w.id)])
  return planMerge({ batch, existingWeights: weights, existingHealthIds: ids, intervals: liftIntervals(sessions, yoga), unit, now: nowIso(), since })
}

export async function applyImport(plan: MergePlan): Promise<void> {
  await db.transaction('rw', [db.bodyWeights, db.healthWorkouts, db.settings], async () => {
    await db.bodyWeights.bulkPut(plan.newWeights.map((w) => ({ id: w.id, date: w.date, value: w.value, unit: w.unit, source: 'health' as const })))
    await db.healthWorkouts.bulkPut(plan.newWorkouts)
    await setSetting(PREFS, { ...(await getHealthPrefs()), lastImportAt: nowIso() })
  })
}
