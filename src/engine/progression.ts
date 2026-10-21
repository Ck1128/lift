import type { LastPerformance, WeightUnit } from './types'
import { convertWeight, tidy } from './units'

export interface LoadSpec {
  min: number
  max: number
  increment: number
  unit: WeightUnit
}

export interface LoadSuggestion {
  weight?: number
  note: string
}

/** Snap to the nearest weight the equipment can actually make. */
export function snapToSpec(weight: number, spec: LoadSpec): number {
  const steps = Math.round((weight - spec.min) / spec.increment)
  const snapped = spec.min + steps * spec.increment
  return tidy(Math.min(spec.max, Math.max(spec.min, snapped)))
}

export const HIGH_EFFORT = 9

/**
 * Simple, documented double-progression rules (see README):
 *  1. No history          -> no number. Ask the user to pick a light starting weight.
 *  2. Pain reported       -> repeat the same weight. Never increase.
 *  3. Every set reached the top of the rep range, and no set was rated 9 or 10 effort
 *                         -> add ONE equipment increment.
 *  4. Every set reached at least the bottom of the range
 *                         -> same weight, aim for one more rep per set.
 *  5. Otherwise           -> same weight (never increase after a poor session).
 */
export function suggestLoad(
  last: LastPerformance | undefined,
  spec: LoadSpec | null,
  unit: WeightUnit,
  repMin: number,
  repMax: number,
): LoadSuggestion {
  const weighted = last?.sets.filter((s) => (s.weight ?? 0) > 0 && s.reps > 0) ?? []
  if (!last || weighted.length === 0) {
    return {
      note: `No history yet. Choose a light weight you could lift for ${repMax} reps with 2 to 3 reps left in the tank, then adjust.`,
    }
  }
  const toUnit = (w: number) => convertWeight(w, last.unit, unit)
  const raw = Math.max(...weighted.map((s) => toUnit(s.weight ?? 0)))
  const same = spec ? snapToSpec(raw, spec) : tidy(raw)
  const when = `on ${last.date}`
  const didText = `${weighted.length} sets, top weight ${tidy(raw)} ${unit} ${when}`

  if (last.painReported) {
    return { weight: same, note: `You reported pain last time (${didText}), so the weight stays at ${same} ${unit}. If something hurts, stop and consider asking a qualified professional.` }
  }
  const hitTop = weighted.length >= 2 && weighted.every((s) => s.reps >= last.repMax)
  const tooHard = weighted.some((s) => (s.effort ?? 0) >= HIGH_EFFORT)
  const hitBottom = weighted.every((s) => s.reps >= last.repMin)

  if (hitTop && !tooHard) {
    const inc = spec?.increment ?? (unit === 'lb' ? 5 : 2.5)
    const next = spec ? snapToSpec(same + inc, spec) : tidy(same + inc)
    if (spec && same >= spec.max) {
      return { weight: same, note: `Every set hit the top of the range (${didText}), but ${same} ${unit} is the heaviest you listed. Try slower reps or add a set.` }
    }
    return { weight: next, note: `Every set hit the top of the range (${didText}), so +${tidy(next - same)} ${unit}.` }
  }
  if (hitBottom) {
    return { weight: same, note: `Same weight as last time (${didText}). Aim for one more rep on each set before going heavier.` }
  }
  return { weight: same, note: `Last session fell short of ${repMin} reps on some sets (${didText}), so the weight stays. Drop one step if it felt too heavy.` }
}
