/**
 * Things an exercise needs that the catalog does not list as equipment. The catalog says "dumbbell" for a lying
 * triceps extension, but you cannot do it without a bench. Machines and cables bring their own seat, so they are skipped.
 */
import type { Exercise } from './types'

const BENCH_TYPES = new Set(['dumbbell', 'barbell', 'ez_bar', 'smith', 'bands', 'bodyweight', 'kettlebell'])
const BENCH_WORD = /\b(bench|incline|decline)\b/i

export function needsBench(ex: Pick<Exercise, 'name' | 'exerciseType' | 'instructions' | 'equipmentIds'>): boolean {
  if (ex.equipmentIds.includes('bench')) return false // already required through the equipment list
  if (!BENCH_TYPES.has(ex.exerciseType)) return false
  return BENCH_WORD.test(ex.name) || BENCH_WORD.test(ex.instructions.slice(0, 2).join(' '))
}
