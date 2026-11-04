import type { LastPerformance, WeightUnit } from './types'
import { convertWeight, tidy } from './units'

export interface LoadSpec {
  min: number
  max: number
  increment: number
  unit: WeightUnit
  /** If set, only these exact weights exist (for example one pair of 12 lb dumbbells). */
  weights?: number[]
}

export interface LoadSuggestion {
  weight?: number
  note: string
}

/** Snap to the nearest weight the equipment can actually make. */
export function snapToSpec(weight: number, spec: LoadSpec): number {
  if (spec.weights?.length) return spec.weights.reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best), spec.weights[0])
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
  effortCeiling: number = HIGH_EFFORT,
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
  const tooHard = weighted.some((s) => (s.effort ?? 0) >= effortCeiling)
  const hitBottom = weighted.every((s) => s.reps >= last.repMin)

  const efforts = weighted.map((s) => s.effort).filter((e): e is number => e !== undefined)
  const avgEffort = efforts.length ? efforts.reduce((a, b) => a + b, 0) / efforts.length : undefined
  const easy = efforts.length === weighted.length && avgEffort !== undefined && avgEffort <= 6
  if (hitTop && !tooHard) {
    const step = spec?.increment ?? (unit === 'lb' ? 5 : 2.5)
    const inc = easy ? step * 2 : step // it felt easy (effort 6 or less): jump two steps
    const up = spec?.weights ? (easy ? spec.weights.filter((w) => w > same + 1e-9)[1] : undefined) ?? spec.weights.find((w) => w > same + 1e-9) : undefined
    const next = up ?? (spec ? snapToSpec(same + inc, spec) : tidy(same + inc))
    if (spec && same >= spec.max) {
      return { weight: same, note: `Every set hit the top of the range (${didText}), but ${same} ${unit} is the heaviest you listed. Try slower reps or add a set.` }
    }
    return { weight: next, note: `Every set hit the top of the range (${didText}), so +${tidy(next - same)} ${unit}.` }
  }
  if (!hitBottom && avgEffort !== undefined && avgEffort >= 9.5) {
    const step = spec?.increment ?? (unit === 'lb' ? 5 : 2.5)
    const down = spec?.weights ? [...spec.weights].reverse().find((w) => w < same - 1e-9) ?? same : spec ? snapToSpec(same - step, spec) : tidy(same - step)
    return { weight: down, note: `Last time was very hard (effort ${tidy(avgEffort)}) and some sets fell short (${didText}), so the weight comes down to ${down} ${unit}.` }
  }
  if (hitBottom) {
    return { weight: same, note: `Same weight as last time (${didText}). Aim for one more rep on each set before going heavier.` }
  }
  return { weight: same, note: `Last session fell short of ${repMin} reps on some sets (${didText}), so the weight stays. Drop one step if it felt too heavy.` }
}

const TYPE_FRACTION: Record<string, [number, number]> = {
  // [compound, isolation] as a fraction of body weight, per dumbbell / per stack setting, for an intermediate man.
  machine: [0.4, 0.15], cable: [0.25, 0.1], dumbbell: [0.15, 0.06], kettlebell: [0.15, 0.1], smith: [0.3, 0.15], barbell: [0.4, 0.2],
}
const LEVEL_FACTOR = { beginner: 0.6, intermediate: 1, regular: 1.15 } as const
const LOWER = new Set(['quads', 'hamstrings', 'glutes', 'calves'])

export interface StartInput {
  exerciseType: string
  compound: boolean
  primaryMuscles: string[]
  level: keyof typeof LEVEL_FACTOR
  weightKg?: number
  sex?: 'female' | 'male'
}

/**
 * A cautious first-session guess for an exercise with no history. It is deliberately light (the load is rounded
 * down to what the equipment can make) and the note says so. Body weight and sex are rough proxies, so this is a
 * place to start, never a safe-load prescription. Returns undefined when there is not enough information.
 */
export function idealWeight(i: StartInput, unit: WeightUnit): number | undefined {
  const frac = TYPE_FRACTION[i.exerciseType]
  if (!frac || !i.weightKg) return undefined
  const sexFactor = i.sex === 'male' ? 1 : i.sex === 'female' ? 0.7 : 0.8
  const lower = i.primaryMuscles.some((m) => LOWER.has(m)) ? 1.5 : 1
  const kg = i.weightKg * (i.compound ? frac[0] : frac[1]) * LEVEL_FACTOR[i.level] * sexFactor * lower * 0.8
  return convertWeight(kg, 'kg', unit)
}

export function startingWeight(i: StartInput, spec: LoadSpec | null, unit: WeightUnit): number | undefined {
  const w = idealWeight(i, unit)
  if (w === undefined || !spec) return undefined
  if (spec.weights?.length) return [...spec.weights].reverse().find((x) => x <= w) ?? spec.weights[0]
  const steps = Math.floor((w - spec.min) / spec.increment)
  return tidy(Math.min(spec.max, Math.max(spec.min, spec.min + Math.max(0, steps) * spec.increment)))
}
