import { db, nowIso, uid } from './schema'
import { getSetting, setSetting, SETTING } from './settings'
import { generateYoga, itemTotalSeconds, yogaCacheKey, type YogaInput, type YogaPlan, type YogaResult, type YogaSession } from '../engine/yoga'
import type { PropId, Restriction, YogaLocation, YogaStyleId } from '../data/yoga'

export interface YogaPrefs {
  style: YogaStyleId
  minutes: number
  location: YogaLocation
  props: PropId[]
  restrictions: Restriction[]
}

export const DEFAULT_YOGA_PREFS: YogaPrefs = { style: 'hatha', minutes: 20, location: 'home', props: ['mat'], restrictions: [] }

export const getYogaPrefs = () => getSetting<YogaPrefs>(SETTING.yogaPrefs, DEFAULT_YOGA_PREFS)
export const saveYogaPrefs = (p: YogaPrefs) => setSetting(SETTING.yogaPrefs, p)

/** The plan for a date and settings. The same inputs always give the same plan, and the result is cached on the phone. */
export async function planYoga(input: YogaInput): Promise<YogaResult> {
  if (!input.level) return generateYoga(input)
  const key = yogaCacheKey(input)
  const cached = await db.yogaPlans.get(key)
  if (cached) return { kind: 'plan', plan: cached.plan }
  const r = generateYoga(input)
  if (r.kind === 'plan') await db.yogaPlans.put({ key, plan: r.plan, createdAt: nowIso() })
  return r
}

export async function getActiveYoga(): Promise<YogaSession | undefined> {
  return (await db.yogaSessions.where('status').equals('in_progress').toArray())[0]
}

export async function startYogaSession(plan: YogaPlan): Promise<YogaSession> {
  const active = await getActiveYoga()
  if (active) return active
  const now = nowIso()
  const s: YogaSession = {
    id: uid(), date: plan.date, style: plan.style, styleName: plan.styleName, level: plan.level, location: plan.location,
    props: plan.props, restrictions: plan.restrictions, plannedMinutes: plan.minutes, plan: structuredClone(plan), planKey: plan.key,
    completedItems: [], skippedItems: [], status: 'in_progress', durationSeconds: 0, startedAt: now, createdAt: now, updatedAt: now,
  }
  await db.yogaSessions.add(s)
  return s
}

const secondsDone = (s: YogaSession, completed: number[]) =>
  s.plan.items.filter((i) => completed.includes(i.index)).reduce((a, i) => a + itemTotalSeconds(i), 0)

/** Marks one pose done, skipped, or back to not done. */
export async function markYogaItem(id: string, index: number, to: 'done' | 'skipped' | 'clear'): Promise<void> {
  const s = await db.yogaSessions.get(id)
  if (!s) return
  const completed = s.completedItems.filter((i) => i !== index)
  const skipped = s.skippedItems.filter((i) => i !== index)
  if (to === 'done') completed.push(index)
  if (to === 'skipped') skipped.push(index)
  await db.yogaSessions.put({ ...s, completedItems: completed, skippedItems: skipped, durationSeconds: secondsDone(s, completed), updatedAt: nowIso() })
}

export function yogaStatusOf(s: YogaSession): YogaSession['status'] {
  if (s.completedItems.length === 0) return 'abandoned'
  const needed = s.plan.items.filter((i) => !i.optional && !s.skippedItems.includes(i.index))
  return needed.every((i) => s.completedItems.includes(i.index)) ? 'completed' : 'partial'
}

/** Saving twice is harmless. */
export async function finishYoga(id: string, mode: 'finish' | 'discard' = 'finish'): Promise<YogaSession | undefined> {
  const s = await db.yogaSessions.get(id)
  if (!s || s.status !== 'in_progress') return s
  const next: YogaSession = { ...s, status: mode === 'discard' ? 'abandoned' : yogaStatusOf(s), finishedAt: nowIso(), updatedAt: nowIso() }
  await db.yogaSessions.put(next)
  return next
}

export async function reopenYoga(id: string): Promise<{ ok: boolean; reason?: string }> {
  const s = await db.yogaSessions.get(id)
  if (!s) return { ok: false, reason: 'That session was not found.' }
  if (s.status === 'in_progress') return { ok: true }
  const active = await getActiveYoga()
  if (active) return { ok: false, reason: 'Finish your open yoga session first.' }
  await db.yogaSessions.put({ ...s, status: 'in_progress', finishedAt: undefined, updatedAt: nowIso() })
  return { ok: true }
}

export async function setYogaNotes(id: string, notes: string): Promise<void> {
  const s = await db.yogaSessions.get(id)
  if (s) await db.yogaSessions.put({ ...s, notes: notes.trim() || undefined, updatedAt: nowIso() })
}

export async function deleteYogaSession(id: string): Promise<void> {
  await db.yogaSessions.delete(id)
}
