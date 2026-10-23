import type { LastPerformance, Muscle, SetLog, WeightUnit, WorkoutSession } from './types'
import { convertWeight, tidy } from './units'
import { addDays, daysBetween, startOfWeek } from './dates'

const counted = (s: WorkoutSession) => s.status === 'completed' || s.status === 'partial'

/** The most recent completed work for each exercise, newest session winning. */
export function buildLastPerformance(sessions: WorkoutSession[], logs: SetLog[]): Record<string, LastPerformance> {
  const out: Record<string, LastPerformance> = {}
  const ordered = sessions.filter(counted).sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  for (const s of ordered) {
    const mine = logs.filter((l) => l.sessionId === s.id && l.completed && (l.actualReps ?? 0) > 0)
    const byEx = new Map<string, SetLog[]>()
    for (const l of mine) byEx.set(l.exerciseId, [...(byEx.get(l.exerciseId) ?? []), l])
    for (const [exerciseId, sets] of byEx) {
      const sorted = [...sets].sort((a, b) => a.setNumber - b.setNumber)
      out[exerciseId] = {
        exerciseId,
        date: s.date,
        unit: sorted[0].weightUnit,
        sets: sorted.map((l) => ({ weight: l.actualWeight, reps: l.actualReps ?? 0, effort: l.effortRating })),
        painReported: s.actualExercises.some((a) => a.exerciseId === exerciseId && a.painReported),
        repMin: sorted[0].plannedRepMin,
        repMax: sorted[0].plannedRepMax,
      }
    }
  }
  return out
}

export function buildLastDone(sessions: WorkoutSession[], logs: SetLog[]): Record<string, string> {
  const out: Record<string, string> = {}
  const ordered = sessions.filter(counted).sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  for (const s of ordered) {
    for (const l of logs) if (l.sessionId === s.id && l.completed) out[l.exerciseId] = s.date
  }
  return out
}

export function activeMinutes(s: WorkoutSession): number {
  if (!s.finishedAt) return 0
  const ms = new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime() - (s.pausedMs ?? 0)
  return Math.max(0, Math.round(ms / 60000))
}

// ---- Progress metrics. Always computed from saved records, never mock numbers. ----

export function workoutsPerWeek(sessions: WorkoutSession[], today: string, weeks = 8): { weekStart: string; count: number }[] {
  const thisWeek = startOfWeek(today)
  const rows = Array.from({ length: weeks }, (_, i) => ({ weekStart: addDays(thisWeek, -7 * (weeks - 1 - i)), count: 0 }))
  for (const s of sessions) {
    if (s.status !== 'completed' && s.status !== 'partial') continue
    const row = rows.find((r) => r.weekStart === startOfWeek(s.date))
    if (row) row.count += 1
  }
  return rows
}

export function setsPerMuscle(
  sessions: WorkoutSession[], logs: SetLog[], today: string, days: number,
  musclesOf: (exerciseId: string) => Muscle[],
): Partial<Record<Muscle, number>> {
  const ids = new Set(sessions.filter((s) => counted(s) && daysBetween(s.date, today) < days && daysBetween(s.date, today) >= 0).map((s) => s.id))
  const out: Partial<Record<Muscle, number>> = {}
  for (const l of logs) {
    if (!l.completed || !ids.has(l.sessionId)) continue
    for (const m of musclesOf(l.exerciseId).slice(0, 1)) out[m] = (out[m] ?? 0) + 1
  }
  return out
}

export interface TrendPoint { date: string; topWeight: number; totalReps: number; unit: string }

/**
 * Heaviest weight per session. Sets entered in different units are converted to `unit` (default: the unit of the first set),
 * so a session in kg and one in lb are drawn on the same line without mixing the numbers.
 */
export function exerciseTrend(exerciseId: string, sessions: WorkoutSession[], logs: SetLog[], unit?: WeightUnit): TrendPoint[] {
  const pts: TrendPoint[] = []
  const target: WeightUnit | undefined = unit ?? logs.find((l) => l.exerciseId === exerciseId && l.completed)?.weightUnit
  const w = (l: SetLog) => (l.actualWeight === undefined ? 0 : target ? tidy(convertWeight(l.actualWeight, l.weightUnit, target)) : l.actualWeight)
  for (const s of sessions.filter(counted).sort((a, b) => a.startedAt.localeCompare(b.startedAt))) {
    const mine = logs.filter((l) => l.sessionId === s.id && l.exerciseId === exerciseId && l.completed && (l.actualReps ?? 0) > 0)
    if (mine.length === 0) continue
    pts.push({
      date: s.date,
      topWeight: Math.max(0, ...mine.map(w)),
      totalReps: mine.reduce((n, l) => n + (l.actualReps ?? 0), 0),
      unit: target ?? mine[0].weightUnit,
    })
  }
  return pts
}

/** Personal record = the heaviest weight lifted for at least one rep in a completed set (same unit only). */
export function personalRecords(sessions: WorkoutSession[], logs: SetLog[], unit?: WeightUnit): { exerciseId: string; weight: number; reps: number; unit: string; date: string }[] {
  const dateOf = new Map(sessions.filter(counted).map((s) => [s.id, s.date]))
  const best = new Map<string, { exerciseId: string; weight: number; reps: number; unit: string; date: string }>()
  for (const l of logs) {
    const date = dateOf.get(l.sessionId)
    if (!date || !l.completed || !(l.actualWeight && l.actualWeight > 0) || !(l.actualReps && l.actualReps > 0)) continue
    // With a chosen unit every set is converted into it, so kg and lb sets compete fairly.
    const u = unit ?? l.weightUnit
    const weight = unit ? tidy(convertWeight(l.actualWeight, l.weightUnit, unit)) : l.actualWeight
    const key = `${l.exerciseId}|${u}`
    const cur = best.get(key)
    if (!cur || weight > cur.weight || (weight === cur.weight && l.actualReps > cur.reps)) {
      best.set(key, { exerciseId: l.exerciseId, weight, reps: l.actualReps, unit: u, date })
    }
  }
  return [...best.values()].sort((a, b) => a.exerciseId.localeCompare(b.exerciseId))
}
