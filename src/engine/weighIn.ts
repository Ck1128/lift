import { startOfWeek } from './dates'
import type { BodyWeightEntry } from './types'

/** Weeks run Monday to Sunday, like the rest of the app. */
export const weekHasWeight = (weights: Pick<BodyWeightEntry, 'date'>[], today: string): boolean => {
  const wk = startOfWeek(today)
  return weights.some((w) => startOfWeek(w.date) === wk)
}

export interface WeighInState { today: string; weights: Pick<BodyWeightEntry, 'date'>[]; dismissedOn?: string; startedOn?: string }

/**
 * The weekly weigh-in prompt is due from Monday, and again every day, until this week has a weight.
 * Closing it hides it for the rest of that day only. It never shows on the day the app was first set up.
 */
export function weighInDue(s: WeighInState): boolean {
  if (s.startedOn && s.startedOn >= s.today) return false
  if (s.dismissedOn === s.today) return false
  return !weekHasWeight(s.weights, s.today)
}
