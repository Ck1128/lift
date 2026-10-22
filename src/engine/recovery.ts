/**
 * Muscle recovery estimate (US-06). Runs locally on the workout log. It is an estimate, not a medical measure.
 *
 * It is NOT just "days since the last workout". For each muscle we look at every recent session that used it:
 *  - volume: effective sets (a set counts 1 for a primary muscle, 0.5 for a secondary one)
 *  - effort: sessions averaging RPE 9 or more need longer
 *  - size: large groups (quads, lats...) need longer than small ones (biceps, calves...)
 *  - frequency: other sessions in the 7 days before add some extra fatigue
 *  - elapsed time since that session
 * Then the status is the remaining recovery time compared with what that muscle needed.
 */
import { exerciseById } from '../data/catalog'
import { ALL_FINE, LARGE_MUSCLES, musclesOf, type FineMuscle } from './muscleMap'
import type { Profile, SetLog, WorkoutSession } from './types'

export type RecoveryStatus = 'recovered' | 'recovering' | 'recent' | 'no_data'
export const STATUS_LABEL: Record<RecoveryStatus, string> = {
  recovered: 'Recovered', recovering: 'Recovering', recent: 'Recently trained', no_data: 'No data',
}

export const BASE_HOURS_LARGE = 48
export const BASE_HOURS_SMALL = 36
const HOUR = 3_600_000
/** Anything older than this is treated as fully recovered for display, but still counts as "has data". */
const WINDOW_DAYS = 14

export interface MuscleSession {
  sessionId: string
  date: string
  title: string
  exercises: string[]
  effectiveSets: number
  avgRpe?: number
  /** Hours this session asked of the muscle, before elapsed time. */
  needHours: number
  hoursSince: number
}

export interface MuscleRecovery {
  muscle: FineMuscle
  status: RecoveryStatus
  /** 0 to 100: how far along recovery is. Missing when there is no data. */
  readiness?: number
  /** Hours until recovered (0 when recovered). */
  remainingHours: number
  lastTrained?: string
  hoursSinceLast?: number
  recent: MuscleSession[]
}

export interface RecoveryReport {
  hasHistory: boolean
  daysSinceLast: number | null
  muscles: Record<FineMuscle, MuscleRecovery>
  fresh: number
  total: number
  /** Logged strength exercises that had no muscle mapping. They are left out, never guessed. */
  unmappedExercises: number
  /** Personal adjustment applied to every recovery time (1 = standard), and the plain-language reasons. */
  personalFactor: number
  personalReasons: string[]
}

/**
 * Adjusts recovery time to the person. Newer lifters and older lifters usually need longer; experienced and younger
 * ones a little less. The effect is deliberately small and bounded, because these are rules of thumb, not measurements.
 */
export function recoveryFactor(p: Pick<Profile, 'age' | 'trainingLevel'> | null | undefined): { factor: number; reasons: string[] } {
  if (!p) return { factor: 1, reasons: [] }
  let f = 1
  const reasons: string[] = []
  if (p.trainingLevel === 'beginner') { f *= 1.15; reasons.push('you are newer to lifting, so muscles take longer to bounce back') }
  else if (p.trainingLevel === 'regular') { f *= 0.9; reasons.push('you train regularly, so your body is used to the load') }
  if (p.age !== undefined) {
    if (p.age >= 50) { f *= 1.2; reasons.push('recovery slows a little from age 50') }
    else if (p.age >= 40) { f *= 1.1; reasons.push('recovery slows a little from age 40') }
    else if (p.age < 25) { f *= 0.95; reasons.push('younger lifters tend to recover a little faster') }
  }
  return { factor: Math.min(1.4, Math.max(0.8, Math.round(f * 100) / 100)), reasons }
}

const when = (s: WorkoutSession) => new Date(s.finishedAt ?? s.startedAt).getTime()

export function needHoursFor(muscle: FineMuscle, effectiveSets: number, avgRpe: number | undefined, priorSessions7d: number): number {
  const base = LARGE_MUSCLES.has(muscle) ? BASE_HOURS_LARGE : BASE_HOURS_SMALL
  const volume = Math.min(1.6, Math.max(0.7, 0.6 + 0.12 * effectiveSets))
  const effort = avgRpe !== undefined && avgRpe >= 9 ? 1.15 : 1
  const frequency = 1 + 0.1 * Math.min(3, priorSessions7d)
  return Math.round(base * volume * effort * frequency)
}

export function recoveryReport(sessions: WorkoutSession[], logs: SetLog[], now: Date, personal: { factor: number; reasons: string[] } = { factor: 1, reasons: [] }): RecoveryReport {
  const nowMs = now.getTime()
  const done = sessions.filter((s) => (s.status === 'completed' || s.status === 'partial') && when(s) <= nowMs + HOUR)
  const bySession = new Map<string, SetLog[]>()
  for (const l of logs) {
    if (!l.completed || l.actualReps === undefined || l.actualMinutes !== undefined) continue
    const arr = bySession.get(l.sessionId)
    if (arr) arr.push(l)
    else bySession.set(l.sessionId, [l])
  }
  type Acc = { sets: number; rpe: number[]; names: Set<string> }
  const perMuscle: Record<FineMuscle, MuscleSession[]> = Object.fromEntries(ALL_FINE.map((m) => [m, [] as MuscleSession[]])) as never
  const unmapped = new Set<string>()
  const times = done.map(when)

  for (const s of done) {
    const sTime = when(s)
    const acc = new Map<FineMuscle, Acc>()
    for (const l of bySession.get(s.id) ?? []) {
      const ex = exerciseById(l.exerciseId)
      const u = musclesOf(ex)
      if (u.unmapped) { unmapped.add(l.exerciseId); continue }
      const add = (m: FineMuscle, w: number) => {
        const a = acc.get(m) ?? { sets: 0, rpe: [], names: new Set<string>() }
        a.sets += w
        if (l.effortRating !== undefined) a.rpe.push(l.effortRating)
        a.names.add(ex!.name)
        acc.set(m, a)
      }
      u.primary.forEach((m) => add(m, 1))
      u.secondary.forEach((m) => add(m, 0.5))
    }
    const prior7 = times.filter((t) => t < sTime && sTime - t <= 7 * 24 * HOUR).length
    for (const [m, a] of acc) {
      const avgRpe = a.rpe.length ? a.rpe.reduce((x, y) => x + y, 0) / a.rpe.length : undefined
      perMuscle[m].push({
        sessionId: s.id, date: s.date, title: s.title, exercises: [...a.names], effectiveSets: a.sets, avgRpe,
        needHours: Math.round(needHoursFor(m, a.sets, avgRpe, prior7) * personal.factor), hoursSince: Math.max(0, (nowMs - sTime) / HOUR),
      })
    }
  }

  const muscles = {} as Record<FineMuscle, MuscleRecovery>
  for (const m of ALL_FINE) {
    const list = perMuscle[m].sort((a, b) => a.hoursSince - b.hoursSince)
    if (list.length === 0) { muscles[m] = { muscle: m, status: 'no_data', remainingHours: 0, recent: [] }; continue }
    const rem = list.map((x) => Math.max(0, x.needHours - x.hoursSince))
    const biggest = Math.max(...rem)
    // Overlapping sessions add a quarter of their leftover time on top of the longest one.
    const remaining = Math.round(biggest + 0.25 * (rem.reduce((x, y) => x + y, 0) - biggest))
    const latest = list[0]
    const stale = latest.hoursSince > WINDOW_DAYS * 24
    let status: RecoveryStatus = 'recovered'
    const worst = list[rem.indexOf(biggest)]
    if (!stale && remaining > 0) status = remaining > 0.6 * worst.needHours ? 'recent' : 'recovering'
    const readiness = stale || remaining <= 0 ? 100 : Math.max(0, Math.min(99, Math.round(100 * (1 - remaining / Math.max(1, worst.needHours)))))
    muscles[m] = {
      muscle: m, status, readiness, remainingHours: stale ? 0 : remaining, lastTrained: latest.date, hoursSinceLast: latest.hoursSince, recent: list.slice(0, 3),
    }
  }
  const finishedTimes = times.length ? Math.max(...times) : null
  const hasHistory = done.length > 0
  const fresh = ALL_FINE.filter((m) => muscles[m].status === 'recovered').length
  return {
    hasHistory,
    daysSinceLast: finishedTimes === null ? null : Math.max(0, Math.floor((nowMs - finishedTimes) / (24 * HOUR))),
    muscles, fresh, total: ALL_FINE.length, unmappedExercises: unmapped.size, personalFactor: personal.factor, personalReasons: personal.reasons,
  }
}

export interface Overlap { muscle: FineMuscle; status: RecoveryStatus; remainingHours: number; lastTrained?: string; exercises: string[] }

/** Planned muscles that are recently trained or still recovering. Never blocks a workout; only explains. */
export function overlapWithPlan(planned: FineMuscle[], report: RecoveryReport, byMuscle: Partial<Record<FineMuscle, string[]>> = {}): Overlap[] {
  return planned
    .filter((m) => report.muscles[m].status === 'recent' || report.muscles[m].status === 'recovering')
    .map((m) => ({ muscle: m, status: report.muscles[m].status, remainingHours: report.muscles[m].remainingHours, lastTrained: report.muscles[m].lastTrained, exercises: byMuscle[m] ?? [] }))
    .sort((a, b) => b.remainingHours - a.remainingHours)
}
