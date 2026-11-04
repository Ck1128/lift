import { addDays } from './dates'
import type { Muscle } from './types'

export interface ScheduledLite {
  date: string
  muscles: Muscle[]
  status: 'planned' | 'completed' | 'partial' | 'skipped'
}

/**
 * Suggest a new day for a skipped workout. It is only a suggestion. The user decides.
 * Rules: look ahead up to `horizon` days from `today`; the day must be free; and the
 * day before and after must not already train any of the same muscles.
 * Returns null when nothing fits (the right answer is often "skip it this week").
 */
export function suggestReschedule(
  skippedMuscles: Muscle[],
  scheduled: ScheduledLite[],
  today: string,
  horizon = 7,
): string | null {
  const active = scheduled.filter((s) => s.status !== 'skipped')
  const busy = new Set(active.map((s) => s.date))
  const overlaps = (date: string) => {
    const w = active.find((s) => s.date === date)
    return !!w && w.muscles.some((m) => skippedMuscles.includes(m))
  }
  for (let i = 1; i <= horizon; i++) {
    const d = addDays(today, i)
    if (busy.has(d)) continue
    if (overlaps(addDays(d, -1)) || overlaps(addDays(d, 1))) continue
    return d
  }
  return null
}
