/**
 * Apple Health bridge: the plain-text format shared by both directions, and the rules around it.
 *
 * A web app on the Home Screen cannot reach HealthKit itself. The Shortcuts app can, so Lift talks to Health through it:
 *  - Lift to Health: Lift opens a Shortcut and hands it lines of text (see `buildSendBatches`).
 *  - Health to Lift: a Shortcut copies lines of text, and Lift reads them (see `parseHealthText`).
 * Apple's own Health export (export.zip) is read by `healthXml.ts` and ends up in the same `HealthBatch`.
 *
 * One line is one record, fields separated by "|":
 *   B|2026-10-21T07:30|172.4|lb          body weight
 *   K|2026-10-21T18:05|Strength|42|180   workout: start, type, minutes, calories (calories optional)
 *   F|2026-10-21|1850                    dietary energy for one day
 */
import type { BodyWeightEntry, WorkoutSession } from './types'
import type { YogaSession } from './yoga'
import type { FoodLogEntry } from './food'
import { activeMinutes } from './history'

export interface HealthWeight { at: string; kg: number }
export interface HealthWorkout { start: string; type: string; minutes: number; kcal?: number; source?: string }
export interface HealthBatch { weights: HealthWeight[]; workouts: HealthWorkout[]; ignored: number }

/** A workout brought in from Apple Health, kept next to Lift's own history. */
export interface HealthWorkoutRow {
  id: string
  date: string
  start: string
  type: string
  minutes: number
  kcal?: number
  source?: string
  importedAt: string
}

const KG_PER_LB = 0.45359237
export const emptyBatch = (): HealthBatch => ({ weights: [], workouts: [], ignored: 0 })

/* ---------- reading ---------- */

const ISO_LOCAL = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** "2026-10-21 07:30:12 -0400" or "2026-10-21T07:30" become "2026-10-21T07:30" (the clock time the person saw). */
export function localStamp(s: string): string | null {
  const t = s.trim()
  const m = ISO_LOCAL.exec(t)
  if (m) return `${m[1]}T${m[2]}:${m[3]}`
  if (ISO_DAY.test(t)) return `${t}T12:00`
  return null
}

/** "172.4", "172,4", "1,234.5" and "172.4 lb" all give a number. */
export function parseNumber(raw: string | undefined): number {
  if (raw === undefined) return NaN
  const m = /-?\d[\d,]*(?:\.\d+)?|-?\d*,\d+/.exec(raw.trim())
  if (!m) return NaN
  const t = m[0]
  return Number(/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.'))
}

/** Shortcuts writes durations as text: "32 min", "1 hr 5 min", "1:05:00", "1950 sec". A bare number means minutes. */
export function parseMinutes(raw: string | undefined): number {
  if (raw === undefined) return NaN
  const t = raw.trim().toLowerCase()
  const clock = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(t)
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]) + Number(clock[3] ?? 0) / 60
  let total = 0
  let any = false
  for (const m of t.matchAll(/(\d+(?:[.,]\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/g)) {
    const v = Number(m[1].replace(',', '.'))
    const u = m[2][0]
    total += u === 'h' ? v * 60 : u === 's' ? v / 60 : v
    any = true
  }
  return any ? total : parseNumber(t)
}

export function toKg(value: number, unit: string): number | null {
  const u = unit.trim().toLowerCase()
  if (!Number.isFinite(value)) return null
  if (u === 'kg' || u === 'kgs' || u === 'kilogram' || u === 'kilograms') return value
  if (u === 'lb' || u === 'lbs' || u === 'pound' || u === 'pounds') return value * KG_PER_LB
  if (u === 'g' || u === 'gram' || u === 'grams') return value / 1000
  return null
}

const okKg = (kg: number) => kg >= 20 && kg <= 400

export function workoutId(w: { start: string; type: string }): string {
  return `hk-w-${w.start}-${w.type.toLowerCase().replace(/[^a-z0-9]+/g, '')}`
}
export const weightId = (at: string): string => `hk-b-${at}`

function addWorkout(b: HealthBatch, start: string | null, type: string, minutes: number, kcal: number | undefined, source?: string) {
  if (!start || !type.trim() || !Number.isFinite(minutes) || minutes < 1 || minutes > 1440) { b.ignored++; return }
  const k = kcal !== undefined && Number.isFinite(kcal) && kcal >= 0 && kcal <= 10000 ? Math.round(kcal) : undefined
  b.workouts.push({ start, type: type.trim().slice(0, 60), minutes: Math.round(minutes * 10) / 10, kcal: k, source })
}
function addWeight(b: HealthBatch, at: string | null, value: number, unit: string) {
  const kg = toKg(value, unit)
  if (!at || kg === null || !okKg(kg)) { b.ignored++; return }
  b.weights.push({ at, kg: Math.round(kg * 1000) / 1000 })
}

/** Reads the text a Shortcut copied. Lines are the main format; a JSON object with `weights` and `workouts` is accepted too. */
export function parseHealthText(text: string): HealthBatch {
  const b = emptyBatch()
  const t = text.trim()
  if (!t) return b
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      const j = JSON.parse(t) as unknown
      const o = (Array.isArray(j) ? { weights: [], workouts: j } : j) as { weights?: unknown[]; workouts?: unknown[] }
      for (const w of o.weights ?? []) {
        const r = w as Record<string, unknown>
        addWeight(b, localStamp(String(r.at ?? r.date ?? '')), Number(r.value), String(r.unit ?? 'kg'))
      }
      for (const w of o.workouts ?? []) {
        const r = w as Record<string, unknown>
        addWorkout(b, localStamp(String(r.start ?? r.date ?? '')), String(r.type ?? ''), Number(r.minutes ?? r.duration), r.kcal === undefined ? undefined : Number(r.kcal), r.source ? String(r.source) : undefined)
      }
      return b
    } catch { /* fall through to lines */ }
  }
  for (const raw of t.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const f = line.split('|').map((x) => x.trim())
    const kind = f[0].toUpperCase()
    if (kind === 'B' || kind === 'W') {
      // The unit is normally its own field, but "172.4 lb" in the value field works too.
      const unit = f[3] || /[a-z]+/i.exec(f[2] ?? '')?.[0] || 'kg'
      addWeight(b, localStamp(f[1] ?? ''), parseNumber(f[2]), unit)
    } else if (kind === 'K') addWorkout(b, localStamp(f[1] ?? ''), f[2] ?? '', parseMinutes(f[3]), f[4] ? parseNumber(f[4]) : undefined)
    else b.ignored++
  }
  return b
}

/* ---------- merging with what is already here ---------- */

export interface Interval { from: number; to: number }
const ms = (stamp: string) => new Date(stamp.length === 16 ? `${stamp}:00` : stamp).getTime()

/** The time spans of everything the person logged in Lift, so Health copies of the same session are not added twice. */
export function liftIntervals(sessions: WorkoutSession[], yoga: YogaSession[]): Interval[] {
  const out: Interval[] = []
  for (const s of sessions) {
    if (s.status === 'in_progress') continue
    const from = new Date(s.startedAt).getTime()
    const to = s.finishedAt ? new Date(s.finishedAt).getTime() : from + activeMinutes(s) * 60000
    if (Number.isFinite(from)) out.push({ from, to: Math.max(to, from + 60000) })
  }
  for (const y of yoga) {
    const from = new Date(y.startedAt).getTime()
    if (Number.isFinite(from)) out.push({ from, to: from + Math.max(60, y.durationSeconds) * 1000 })
  }
  return out
}

const overlaps = (a: Interval, b: Interval) => a.from < b.to && b.from < a.to

export interface MergePlan {
  newWeights: { id: string; date: string; value: number; unit: 'kg' | 'lb' }[]
  newWorkouts: HealthWorkoutRow[]
  alreadyHere: number
  overlapLift: number
  ignored: number
}

export function planMerge(opts: {
  batch: HealthBatch
  existingWeights: BodyWeightEntry[]
  existingHealthIds: Set<string>
  intervals: Interval[]
  unit: 'kg' | 'lb'
  now: string
  /** Only keep records on or after this date (YYYY-MM-DD). */
  since?: string
}): MergePlan {
  const { batch, existingWeights, existingHealthIds, intervals, unit, now, since } = opts
  const plan: MergePlan = { newWeights: [], newWorkouts: [], alreadyHere: 0, overlapLift: 0, ignored: batch.ignored }
  const seen = new Set<string>()
  const tidy = (v: number) => Math.round(v * 10) / 10
  for (const w of batch.weights) {
    const date = w.at.slice(0, 10)
    if (since && date < since) continue
    const id = weightId(w.at)
    if (existingHealthIds.has(id) || seen.has(id)) { plan.alreadyHere++; continue }
    const value = tidy(unit === 'kg' ? w.kg : w.kg / KG_PER_LB)
    // A weight Lift already sent to Health comes back as the same day and number. Do not add it again.
    const sameAsLogged = existingWeights.some((e) => e.date === date && Math.abs((toKg(e.value, e.unit) ?? -1) - w.kg) < 0.06)
    if (sameAsLogged) { plan.alreadyHere++; continue }
    seen.add(id)
    plan.newWeights.push({ id, date, value, unit })
  }
  for (const w of batch.workouts) {
    const date = w.start.slice(0, 10)
    if (since && date < since) continue
    const id = workoutId(w)
    if (existingHealthIds.has(id) || seen.has(id)) { plan.alreadyHere++; continue }
    const from = ms(w.start)
    const span = { from, to: from + w.minutes * 60000 }
    if (intervals.some((i) => overlaps(i, span))) { plan.overlapLift++; continue }
    seen.add(id)
    plan.newWorkouts.push({ id, date, start: w.start, type: w.type, minutes: w.minutes, kcal: w.kcal, source: w.source, importedAt: now })
  }
  return plan
}

/* ---------- sending ---------- */

export const DEFAULT_SHORTCUT_SEND = 'Lift to Health'
export const DEFAULT_SHORTCUT_READ = 'Health to Lift'
/** A URL this long is still safe to open on iPhone. Longer batches are split. */
export const BATCH_LINES = 25

export interface SendItem { id: string; line: string; label: string }

export function stampOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function workoutItem(s: WorkoutSession, includeKcal: boolean, kcal?: number): SendItem | null {
  if (s.status !== 'completed' && s.status !== 'partial') return null
  const minutes = Math.round(activeMinutes(s))
  if (minutes < 1) return null
  const k = includeKcal && kcal ? `|${Math.round(kcal)}` : ''
  return { id: `w-${s.id}`, line: `K|${stampOf(new Date(s.startedAt))}|Strength|${minutes}${k}`, label: `${s.title} on ${s.date}` }
}
export function yogaItem(y: YogaSession, includeKcal: boolean, kcal?: number): SendItem | null {
  if (y.status !== 'completed' && y.status !== 'partial') return null
  const minutes = Math.round(y.durationSeconds / 60)
  if (minutes < 1) return null
  const k = includeKcal && kcal ? `|${Math.round(kcal)}` : ''
  return { id: `y-${y.id}`, line: `K|${stampOf(new Date(y.startedAt))}|Yoga|${minutes}${k}`, label: `Yoga on ${y.date}` }
}
export function weightItem(e: BodyWeightEntry): SendItem | null {
  if ((e as { source?: string }).source === 'health') return null
  return { id: `b-${e.id}`, line: `B|${e.date}T12:00|${e.value}|${e.unit}`, label: `Weight ${e.value} ${e.unit} on ${e.date}` }
}
/** One line per day with food logged. The id includes the total, so a changed day is sent again. */
export function foodItems(food: FoodLogEntry[]): SendItem[] {
  const byDay = new Map<string, number>()
  for (const f of food) if (typeof f.kcal === 'number') byDay.set(f.date, (byDay.get(f.date) ?? 0) + f.kcal)
  return [...byDay.entries()].filter(([, k]) => k > 0).sort().map(([d, k]) => ({ id: `f-${d}-${Math.round(k)}`, line: `F|${d}|${Math.round(k)}`, label: `Food ${Math.round(k)} kcal on ${d}` }))
}

export function unsentOnly(items: SendItem[], sent: Record<string, string>): SendItem[] {
  return items.filter((i) => !sent[i.id])
}
export function batchesOf(items: SendItem[], size = BATCH_LINES): SendItem[][] {
  const out: SendItem[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export function runShortcutUrl(name: string, text?: string): string {
  const base = `shortcuts://run-shortcut?name=${encodeURIComponent(name)}`
  return text === undefined ? base : `${base}&input=text&text=${encodeURIComponent(text)}`
}
