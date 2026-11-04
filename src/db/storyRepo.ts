import { db, nowIso, uid } from './schema'
import { getSetting, setSetting } from './settings'
import { getProfile } from './repo'
import { exerciseById } from '../data/catalog'
import { musclesOf } from '../engine/muscleMap'
import {
  buildStory, firstDayOfMonth, hasActivity, latestMonthEnd, latestWeekEnd, periodFor, storyId, type Story, type StoryData, type StoryHelpers, type StoryKind,
} from '../engine/bodyStory'
import { startOfWeek } from '../engine/dates'
import { convertWeight, tidy } from '../engine/units'
import type { WeightUnit } from '../engine/types'

const PREFIX = 'story.'
const SEEN = 'story.seen'
const WEIGHIN_DISMISSED = 'weighin.dismissed'
const SHARE_WEIGHT = 'story.shareWeight'

export const storyHelpers: StoryHelpers = {
  exerciseName: (id) => exerciseById(id)?.name ?? 'Exercise',
  mainMuscle: (id) => musclesOf(exerciseById(id)).primary[0],
}

export async function loadStoryData(): Promise<StoryData> {
  const [sessions, logs, yoga, weights, health] = await Promise.all([
    db.sessions.toArray(), db.setLogs.toArray(), db.yogaSessions.toArray(), db.bodyWeights.toArray(), db.healthWorkouts.toArray(),
  ])
  return { sessions, logs, yoga, weights, health }
}

/** Saved stories, newest period first. */
export async function listStories(): Promise<Story[]> {
  const rows = await db.settings.where('key').startsWith(PREFIX).toArray()
  return rows
    .filter((r) => r.key !== SEEN && r.key !== SHARE_WEIGHT && typeof r.value === 'object' && r.value !== null && 'kind' in (r.value as object))
    .map((r) => r.value as Story)
    .sort((a, b) => b.to.localeCompare(a.to) || a.kind.localeCompare(b.kind))
}

export const getSeen = () => getSetting<string[]>(SEEN, [])
export async function markStorySeen(id: string): Promise<void> {
  const seen = await getSeen()
  if (!seen.includes(id)) await setSetting(SEEN, [...seen, id])
}

/**
 * Saves the story for the latest finished week (a Sunday) and month (the last day), if there is anything to tell
 * and it has not been saved yet. Called when the app opens, so a missed Sunday is caught up the next time.
 */
export async function ensureStories(today: string): Promise<Story[]> {
  const profile = await getProfile()
  if (!profile) return []
  const data = await loadStoryData()
  const made: Story[] = []
  for (const kind of ['week', 'month'] as StoryKind[]) {
    const end = kind === 'week' ? latestWeekEnd(today) : latestMonthEnd(today)
    const key = PREFIX + storyId(kind, end)
    if (await db.settings.get(key)) continue
    const { from, to } = periodFor(kind, end)
    const story = buildStory(kind, from, to, true, data, profile.weightUnit, storyHelpers, nowIso())
    if (!hasActivity(story)) continue
    await setSetting(key, story)
    made.push(story)
  }
  return made
}

/** The current week or month so far, not saved. */
export async function liveStory(kind: StoryKind, today: string): Promise<Story | null> {
  const profile = await getProfile()
  if (!profile) return null
  const data = await loadStoryData()
  const from = kind === 'week' ? startOfWeek(today) : firstDayOfMonth(today)
  return buildStory(kind, from, today, false, data, profile.weightUnit, storyHelpers, nowIso(), today)
}

export const getShareWeight = () => getSetting<boolean>(SHARE_WEIGHT, true)
export const setShareWeight = (v: boolean) => setSetting(SHARE_WEIGHT, v)

// ---------- weekly weigh-in ----------
export const getWeighInDismissed = () => getSetting<string>(WEIGHIN_DISMISSED, '')
export const dismissWeighIn = (today: string) => setSetting(WEIGHIN_DISMISSED, today)

/** Saves a weigh-in for a day (replacing that day's own entry) and keeps the profile weight current. */
export async function logWeighIn(value: number, unit: WeightUnit, date: string): Promise<void> {
  const same = await db.bodyWeights.where('date').equals(date).filter((w) => w.source !== 'health').toArray()
  for (const w of same) await db.bodyWeights.delete(w.id)
  await db.bodyWeights.add({ id: uid(), date, value: tidy(value), unit })
  const p = await getProfile()
  if (p) await db.profile.put({ ...p, weightKg: tidy(convertWeight(value, unit, 'kg')), updatedAt: nowIso() })
}
