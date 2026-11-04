/**
 * Body Story: a plain recap of a week or a month, built only from what is saved on this phone.
 * Nothing is sent anywhere. A finished story is saved as it was, so later edits to old workouts do not rewrite it.
 */
import { addDays, daysBetween, fromDateKey, toDateKey, weekdayIndex } from './dates'
import type { BodyWeightEntry, SetLog, WeightUnit, WorkoutSession } from './types'
import type { YogaSession } from './yoga'
import type { HealthWorkoutRow } from './health'
import { activeMinutes } from './history'
import { FINE_LABEL, type FineMuscle } from './muscleMap'
import { convertWeight, tidy1 } from './units'

export type StoryKind = 'week' | 'month'

export interface StoryLift { name: string; weight: number; reps: number; unit: WeightUnit; pr: boolean }
export interface Story {
  id: string
  kind: StoryKind
  from: string
  to: string
  /** False for "so far" views of a period that has not ended. */
  final: boolean
  generatedAt: string
  title: string
  workouts: number
  workoutMinutes: number
  sets: number
  yogaSessions: number
  yogaMinutes: number
  healthWorkouts: number
  healthMinutes: number
  activeDays: number
  topMuscles: { muscle: string; sets: number }[]
  lifts: StoryLift[]
  weight: { unit: WeightUnit; start: number; end: number; change: number } | null
  previous: { workouts: number; yogaMinutes: number } | null
  headline: string
  highlights: string[]
}

export interface StoryData {
  sessions: WorkoutSession[]
  logs: SetLog[]
  yoga: YogaSession[]
  weights: BodyWeightEntry[]
  health: HealthWorkoutRow[]
}
export interface StoryHelpers {
  exerciseName: (id: string) => string
  /** The main muscle of an exercise, or undefined when unknown (left out, never guessed). */
  mainMuscle: (id: string) => FineMuscle | undefined
}

const counted = (s: { status: string }) => s.status === 'completed' || s.status === 'partial'
const within = (d: string, from: string, to: string) => d >= from && d <= to

export const lastDayOfMonth = (key: string): string => {
  const d = fromDateKey(key)
  return toDateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}
export const firstDayOfMonth = (key: string): string => `${key.slice(0, 7)}-01`

/** The Sunday that ends the latest finished week (today, when today is Sunday). */
export const latestWeekEnd = (today: string): string => addDays(today, -((weekdayIndex(today) + 1) % 7))
/** The last day of the latest finished month (today, when today is the last day). */
export const latestMonthEnd = (today: string): string => (today === lastDayOfMonth(today) ? today : addDays(firstDayOfMonth(today), -1))

export function periodFor(kind: StoryKind, end: string): { from: string; to: string } {
  return kind === 'week' ? { from: addDays(end, -6), to: end } : { from: firstDayOfMonth(end), to: end }
}
export const storyId = (kind: StoryKind, to: string) => `${kind}:${to}`

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const short = (k: string) => { const d = fromDateKey(k); return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}` }

export function storyTitle(kind: StoryKind, from: string, to: string): string {
  if (kind === 'month') { const d = fromDateKey(from); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}` }
  return `${short(from)} to ${short(to)}`
}

function measure(data: StoryData, from: string, to: string) {
  const sessions = data.sessions.filter((s) => counted(s) && within(s.date, from, to))
  const ids = new Set(sessions.map((s) => s.id))
  const yoga = data.yoga.filter((y) => counted(y) && within(y.date, from, to))
  const health = data.health.filter((h) => within(h.date, from, to))
  return {
    sessions, ids, yoga, health,
    workouts: sessions.length,
    yogaMinutes: Math.round(yoga.reduce((a, y) => a + y.durationSeconds, 0) / 60),
  }
}

export function buildStory(kind: StoryKind, from: string, to: string, final: boolean, data: StoryData, unit: WeightUnit, h: StoryHelpers, now: string, today = to): Story {
  const m = measure(data, from, to)
  const logs = data.logs.filter((l) => l.completed && m.ids.has(l.sessionId))

  // Muscles with the most completed sets (main muscle only).
  const bySets = new Map<string, number>()
  for (const l of logs) {
    const mm = h.mainMuscle(l.exerciseId)
    if (mm) bySets.set(FINE_LABEL[mm], (bySets.get(FINE_LABEL[mm]) ?? 0) + 1)
  }
  const topMuscles = [...bySets].map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle)).slice(0, 3)

  // Heaviest set per exercise, and whether it beat everything logged before this period.
  const earlierIds = new Set(data.sessions.filter((s) => counted(s) && s.date < from).map((s) => s.id))
  const earlierMax = new Map<string, number>()
  for (const l of data.logs) {
    if (!l.completed || !earlierIds.has(l.sessionId) || !l.actualWeight) continue
    const w = convertWeight(l.actualWeight, l.weightUnit, unit)
    earlierMax.set(l.exerciseId, Math.max(earlierMax.get(l.exerciseId) ?? 0, w))
  }
  const best = new Map<string, StoryLift>()
  for (const l of logs) {
    if (!l.actualWeight || !l.actualReps) continue
    const w = tidy1(convertWeight(l.actualWeight, l.weightUnit, unit))
    const cur = best.get(l.exerciseId)
    if (!cur || w > cur.weight) {
      const prev = earlierMax.get(l.exerciseId)
      best.set(l.exerciseId, { name: h.exerciseName(l.exerciseId), weight: w, reps: l.actualReps, unit, pr: prev !== undefined && w > tidy1(prev) })
    }
  }
  const lifts = [...best.values()].sort((a, b) => Number(b.pr) - Number(a.pr) || b.weight - a.weight).slice(0, 3)

  // Body weight: change from the last weigh-in before the period (or the first inside it) to the last inside it.
  const sorted = [...data.weights].sort((a, b) => a.date.localeCompare(b.date))
  const inside = sorted.filter((w) => within(w.date, from, to))
  let weight: Story['weight'] = null
  if (inside.length > 0) {
    const before = [...sorted].reverse().find((w) => w.date < from)
    const base = before ?? inside[0]
    const start = tidy1(convertWeight(base.value, base.unit, unit))
    const last = inside[inside.length - 1]
    const end = tidy1(convertWeight(last.value, last.unit, unit))
    weight = { unit, start, end, change: tidy1(end - start) }
  }

  const days = new Set<string>([...m.sessions.map((s) => s.date), ...m.yoga.map((y) => y.date), ...m.health.map((x) => x.date)])
  const span = daysBetween(from, to) + 1
  const pf = kind === 'week' ? addDays(from, -7) : firstDayOfMonth(addDays(from, -1))
  const pt = addDays(from, -1)
  const pm = measure(data, pf, pt)
  const previous = pm.workouts + pm.yogaMinutes > 0 ? { workouts: pm.workouts, yogaMinutes: pm.yogaMinutes } : null

  const workoutMinutes = m.sessions.reduce((a, s) => a + activeMinutes(s), 0)
  const healthMinutes = m.health.reduce((a, x) => a + x.minutes, 0)
  const unitWord = kind === 'week' ? 'week' : 'month'
  const highlights: string[] = []
  if (m.workouts > 0) highlights.push(`${m.workouts} workout${m.workouts === 1 ? '' : 's'}${workoutMinutes > 0 ? `, ${workoutMinutes} min` : ''}, ${logs.length} sets`)
  if (m.yoga.length > 0) highlights.push(`${m.yoga.length} yoga session${m.yoga.length === 1 ? '' : 's'}, ${m.yogaMinutes} min`)
  if (m.health.length > 0) highlights.push(`${m.health.length} workout${m.health.length === 1 ? '' : 's'} from Apple Health, ${healthMinutes} min`)
  for (const l of lifts.filter((x) => x.pr)) highlights.push(`New best: ${l.name} ${l.weight} ${l.unit} × ${l.reps}`)
  if (previous && kind === 'week' && m.workouts !== previous.workouts) highlights.push(`${m.workouts > previous.workouts ? 'Up' : 'Down'} from ${previous.workouts} workout${previous.workouts === 1 ? '' : 's'} the ${unitWord} before. No judgement either way.`)
  if (weight && weight.change !== 0) highlights.push(`Body weight ${weight.change > 0 ? 'up' : 'down'} ${Math.abs(weight.change)} ${unit}, to ${weight.end} ${unit}`)
  else if (weight) highlights.push(`Body weight steady at ${weight.end} ${unit}`)

  const total = m.workouts + m.yoga.length + m.health.length
  const headline = total === 0
    ? `A quiet ${unitWord}. Rest counts too.`
    : `${days.size} active day${days.size === 1 ? '' : 's'} out of ${final ? span : daysBetween(from, today) + 1}`

  return {
    id: storyId(kind, to), kind, from, to, final, generatedAt: now, title: storyTitle(kind, from, to),
    workouts: m.workouts, workoutMinutes, sets: logs.length, yogaSessions: m.yoga.length, yogaMinutes: m.yogaMinutes,
    healthWorkouts: m.health.length, healthMinutes, activeDays: days.size, topMuscles, lifts, weight, previous, headline, highlights,
  }
}

export const hasActivity = (s: Story) => s.workouts + s.yogaSessions + s.healthWorkouts > 0 || s.weight !== null

/** Plain text for the share sheet. Body weight is left out unless asked for. */
export function storyShareText(s: Story, includeWeight: boolean): string {
  const lines = [`My Lift ${s.kind === 'week' ? 'week' : 'month'}: ${s.title}`, s.headline]
  for (const x of s.highlights) {
    if (!includeWeight && x.startsWith('Body weight')) continue
    lines.push(`• ${x}`)
  }
  if (s.topMuscles.length > 0) lines.push(`Most worked: ${s.topMuscles.map((x) => x.muscle.toLowerCase()).join(', ')}`)
  return lines.join('\n')
}
