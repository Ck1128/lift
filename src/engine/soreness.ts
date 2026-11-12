// The daily soreness meter: one 1-10 rating, optionally for chosen areas. It is turned into the per-muscle levels
// (1 mild, 2 moderate, 3 very sore) the workout engine already uses. A rule of thumb, not a diagnosis.
import { ALL_MUSCLES, type Muscle } from './types'

export interface SorenessRating {
  /** 1 = not sore at all, 10 = extremely sore. */
  level: number
  /** Where it is sore. Empty means all over. */
  areas: Muscle[]
}

export type SoreMap = Partial<Record<Muscle, 1 | 2 | 3>>

/** 1-2 none, 3-4 mild, 5-7 moderate, 8-10 very sore. 5 and up is where a plan should change. */
export function levelToSore(level: number): 0 | 1 | 2 | 3 {
  if (level >= 8) return 3
  if (level >= 5) return 2
  if (level >= 3) return 1
  return 0
}

export function sorenessFromRating(r: SorenessRating | null | undefined): SoreMap {
  if (!r) return {}
  const s = levelToSore(r.level)
  if (s === 0) return {}
  const out: SoreMap = {}
  for (const m of r.areas.length > 0 ? r.areas : ALL_MUSCLES) out[m] = s
  return out
}

export function levelWord(level: number): string {
  if (level <= 2) return 'Fresh'
  if (level <= 4) return 'A little sore'
  if (level <= 6) return 'Sore'
  if (level <= 8) return 'Very sore'
  return 'Extremely sore'
}

/** What the rating means for today's training, in one line. */
export function levelAdvice(level: number): string {
  if (level <= 2) return 'Train as planned.'
  if (level <= 4) return 'Train as planned. Stay at the easier end of your reps in reserve.'
  if (level <= 7) return 'Sore areas get one fewer set. If they are the main muscles today, a recovery day is the better choice.'
  return 'Very sore areas are left out. Consider a recovery day: an easy walk and gentle stretching.'
}

export const sorenessKey = (date: string) => `soreness.day.${date}`
