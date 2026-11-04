/**
 * Approximate calories burned, from what you told the app: height, weight, age, sex and the workouts you logged.
 *
 *  - Resting burn uses the Mifflin-St Jeor equation (kcal a day at rest).
 *  - A workout or yoga session burns  MET x (resting kcal per hour) x hours, where MET is how hard the activity is
 *    compared with rest (Compendium of Physical Activities). Using your own resting burn, not just body weight,
 *    is how height, age and sex change the answer.
 * It is an estimate for people, not a measurement. Weight lifted is not used because it does not give a reliable figure.
 */
import type { Profile, SetLog, WorkoutSession } from './types'
import type { YogaSession } from './yoga'
import { activeMinutes } from './history'
import { MET_LIGHT, MET_VIGOROUS } from './calories'
import { addDays } from './dates'

export const YOGA_MET = 2.5
export const CARDIO_MET = 6

/** Resting kcal per day, or null when height, weight or age is missing. Sex is optional (the average of both is used). */
export function restingKcal(p: Pick<Profile, 'weightKg' | 'heightCm' | 'age' | 'sex'>): number | null {
  if (!p.weightKg || !p.heightCm || p.age === undefined) return null
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age
  const adj = p.sex === 'male' ? 5 : p.sex === 'female' ? -161 : -78
  return Math.max(900, Math.round(base + adj))
}

/** kcal burned in `minutes` at `met`. Falls back to 1 kcal per kg per hour when resting burn is unknown. */
export function kcalFor(met: number, minutes: number, p: Pick<Profile, 'weightKg' | 'heightCm' | 'age' | 'sex'>): number {
  if (minutes <= 0) return 0
  const rest = restingKcal(p)
  const perHour = rest ? rest / 24 : (p.weightKg ?? 0)
  return Math.round(met * perHour * (minutes / 60))
}

export function workoutBurn(s: WorkoutSession, logs: SetLog[], p: Profile): number {
  const minutes = activeMinutes(s)
  if (minutes < 5) return 0
  const cardioOnly = s.plannedExercises.length > 0 && s.plannedExercises.every((e) => e.kind === 'cardio')
  let met = cardioOnly ? CARDIO_MET : (MET_LIGHT + MET_VIGOROUS) / 2
  if (!cardioOnly) {
    const efforts = logs.filter((l) => l.sessionId === s.id && l.completed && l.effortRating).map((l) => l.effortRating!)
    if (efforts.length) {
      const avg = efforts.reduce((a, b) => a + b, 0) / efforts.length
      met = avg >= 8 ? 5.2 : avg <= 6 ? 4 : 4.75
    }
  }
  return kcalFor(met, minutes, p)
}

export function yogaBurn(y: YogaSession, p: Profile): number {
  return kcalFor(YOGA_MET, Math.round(y.durationSeconds / 60), p)
}

export interface DayBurn { date: string; workout: number; yoga: number; active: number }

const counted = (status: string) => status === 'completed' || status === 'partial'

/** Active burn for each of the last `days` days, oldest first. */
export function burnByDay(sessions: WorkoutSession[], logs: SetLog[], yoga: YogaSession[], p: Profile, today: string, days = 7): DayBurn[] {
  const rows: DayBurn[] = Array.from({ length: days }, (_, i) => ({ date: addDays(today, -(days - 1 - i)), workout: 0, yoga: 0, active: 0 }))
  const byDate = new Map(rows.map((r) => [r.date, r]))
  for (const s of sessions) {
    const r = byDate.get(s.date)
    if (r && counted(s.status)) r.workout += workoutBurn(s, logs, p)
  }
  for (const y of yoga) {
    const r = byDate.get(y.date)
    if (r && counted(y.status)) r.yoga += yogaBurn(y, p)
  }
  for (const r of rows) r.active = r.workout + r.yoga
  return rows
}
