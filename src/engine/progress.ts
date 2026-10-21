import { addDays, daysBetween } from './dates'
import type { FoodLogEntry } from './food'
import type { YogaSession } from './yoga'
import type { BodyWeightEntry, SetLog, WeightUnit, WorkoutSession } from './types'
import { convertWeight, tidy1 } from './units'
import { activeMinutes } from './history'

export type RangeKey = '7' | '30' | '90' | 'all'
export const RANGE_LABEL: Record<RangeKey, string> = { '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days', all: 'All time' }

export interface DateRange { from: string; to: string }

/** `from` is empty for "all time". */
export function rangeFor(today: string, key: RangeKey): DateRange {
  return { from: key === 'all' ? '' : addDays(today, -(Number(key) - 1)), to: today }
}
export const inRange = (date: string, r: DateRange) => date <= r.to && (r.from === '' || date >= r.from)

export type Category = 'workouts' | 'yoga' | 'food' | 'bodyweight'
export const CATEGORY_LABEL: Record<Category, string> = { workouts: 'Workouts', yoga: 'Yoga', food: 'Food', bodyweight: 'Body weight' }

export interface DayPoint { date: string; value: number }

const counted = (s: { status: string }) => s.status === 'completed' || s.status === 'partial'

/** Yoga minutes per day. Only days that have a yoga session appear: a missing day is not a zero. */
export function yogaMinutesByDay(sessions: YogaSession[], r: DateRange): DayPoint[] {
  const by = new Map<string, number>()
  for (const s of sessions) if (counted(s) && inRange(s.date, r)) by.set(s.date, (by.get(s.date) ?? 0) + s.durationSeconds / 60)
  return [...by].map(([date, v]) => ({ date, value: Math.round(v) })).sort((a, b) => a.date.localeCompare(b.date))
}

/** Logged calories per day. Only days with at least one entry appear: an unlogged day is not a zero-calorie day. */
export function foodKcalByDay(entries: FoodLogEntry[], r: DateRange): DayPoint[] {
  const by = new Map<string, number>()
  for (const e of entries) if (inRange(e.date, r)) by.set(e.date, (by.get(e.date) ?? 0) + e.kcal)
  return [...by].map(([date, v]) => ({ date, value: Math.round(v) })).sort((a, b) => a.date.localeCompare(b.date))
}

/** One value per day (the last entry that day), in the unit the person asked for. */
export function bodyWeightSeries(entries: BodyWeightEntry[], r: DateRange, unit: WeightUnit): DayPoint[] {
  const by = new Map<string, BodyWeightEntry>()
  for (const e of [...entries].sort((a, b) => a.date.localeCompare(b.date))) if (inRange(e.date, r)) by.set(e.date, e)
  return [...by.values()].map((e) => ({ date: e.date, value: tidy1(convertWeight(e.value, e.unit, unit)) }))
}

// ---------------- export ----------------
export interface ExportOptions {
  range: DateRange
  categories: Category[]
  unit: WeightUnit
  sessions: WorkoutSession[]
  logs: SetLog[]
  yoga: YogaSession[]
  food: FoodLogEntry[]
  weights: BodyWeightEntry[]
  exerciseName: (id: string) => string
  now: string
}

export interface ExportData {
  meta: { app: string; exportedAt: string; range: { from: string | null; to: string }; weightUnit: WeightUnit; categories: Category[]; note: string }
  workouts?: Record<string, unknown>[]
  yoga?: Record<string, unknown>[]
  food?: Record<string, unknown>[]
  bodyWeight?: Record<string, unknown>[]
}

export function buildExport(o: ExportOptions): ExportData {
  const has = (c: Category) => o.categories.includes(c)
  const out: ExportData = {
    meta: {
      app: 'Lift', exportedAt: o.now, range: { from: o.range.from || null, to: o.range.to }, weightUnit: o.unit, categories: o.categories,
      note: 'Estimates only. Days with no entry are left out, not counted as zero.',
    },
  }
  if (has('workouts')) {
    out.workouts = []
    for (const s of o.sessions.filter((x) => counted(x) && inRange(x.date, o.range)).sort((a, b) => a.date.localeCompare(b.date))) {
      for (const l of o.logs.filter((x) => x.sessionId === s.id).sort((a, b) => a.slotId.localeCompare(b.slotId, undefined, { numeric: true }) || a.setNumber - b.setNumber)) {
        const w = l.actualWeight === undefined ? undefined : tidy1(convertWeight(l.actualWeight, l.weightUnit, o.unit))
        out.workouts.push({
          date: s.date, workout: s.title, status: s.status, activeMinutes: activeMinutes(s), exercise: o.exerciseName(l.exerciseId), set: l.setNumber,
          completed: l.completed, reps: l.actualReps ?? null, weight: w ?? null, weightUnit: w === undefined ? null : o.unit, minutes: l.actualMinutes ?? null, rpe: l.effortRating ?? null,
        })
      }
    }
  }
  if (has('yoga')) {
    out.yoga = o.yoga.filter((s) => counted(s) && inRange(s.date, o.range)).sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({ date: s.date, style: s.styleName, level: s.level, status: s.status, plannedMinutes: s.plannedMinutes, minutesDone: Math.round(s.durationSeconds / 60), posesDone: s.completedItems.length, posesInPlan: s.plan.items.length }))
  }
  if (has('food')) {
    out.food = o.food.filter((e) => inRange(e.date, o.range)).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
      .map((e) => ({ date: e.date, meal: e.mealCategory, food: e.name, brand: e.brand ?? null, state: e.state, amount: e.portionValue, unit: e.portionUnit, kcal: Math.round(e.kcal), proteinG: e.protein ?? null, carbsG: e.carbs ?? null, fatG: e.fat ?? null, approximate: !!e.approximate, source: e.source }))
  }
  if (has('bodyweight')) out.bodyWeight = bodyWeightSeries(o.weights, o.range, o.unit).map((p) => ({ date: p.date, weight: p.value, unit: o.unit }))
  return out
}

/** A spreadsheet can run a cell that starts with = + - or @ as a formula. A leading apostrophe keeps it as text. */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  let s = String(v)
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(d: ExportData): string {
  const lines: string[] = [
    `# Lift export`,
    `# exported_at=${d.meta.exportedAt}`,
    `# range=${d.meta.range.from ?? 'start'} to ${d.meta.range.to}`,
    `# weight_unit=${d.meta.weightUnit}`,
    `# note=${d.meta.note}`,
  ]
  const section = (name: string, rows: Record<string, unknown>[] | undefined) => {
    if (!rows) return
    lines.push('', `# ${name}`)
    if (rows.length === 0) { lines.push('# (no records in this range)'); return }
    const cols = Object.keys(rows[0])
    lines.push(cols.join(','))
    for (const r of rows) lines.push(cols.map((c) => csvCell(r[c])).join(','))
  }
  section('workouts', d.workouts)
  section('yoga', d.yoga)
  section('food', d.food)
  section('body weight', d.bodyWeight)
  return lines.join('\n') + '\n'
}

export const exportFilename = (kind: 'csv' | 'json' | 'png', today: string) => `lift-export-${today}.${kind}`
export { daysBetween }
