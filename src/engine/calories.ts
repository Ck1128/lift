import type { WeightUnit } from './types'
import { toKg } from './units'

/**
 * Approximate energy use: kcal = MET x body weight (kg) x hours.
 * MET values are from the Compendium of Physical Activities (resistance training):
 * 3.5 for light to moderate effort, 6.0 for vigorous effort.
 * Weight lifted is NOT used: it does not give a reliable calorie figure.
 */
export const MET_LIGHT = 3.5
export const MET_VIGOROUS = 6

export interface CalorieEstimate {
  low: number
  high: number
  text: string
}

const round10 = (n: number) => Math.round(n / 10) * 10

export function estimateCalories(opts: {
  weightValue?: number
  weightUnit: WeightUnit
  activeMinutes: number
  averageEffort?: number
}): CalorieEstimate | null {
  const { weightValue, weightUnit, activeMinutes, averageEffort } = opts
  if (!weightValue || weightValue <= 0 || activeMinutes < 5) return null
  const kg = toKg(weightValue, weightUnit)
  const hours = activeMinutes / 60
  let lowMet = MET_LIGHT
  let highMet = MET_VIGOROUS
  const mid = (MET_LIGHT + MET_VIGOROUS) / 2
  if (averageEffort !== undefined) {
    if (averageEffort >= 8) lowMet = mid
    else if (averageEffort <= 6) highMet = mid
  }
  const low = round10(lowMet * kg * hours)
  const high = round10(highMet * kg * hours)
  return { low, high, text: `Roughly ${low} to ${high} calories (a rough estimate, not a measurement)` }
}
