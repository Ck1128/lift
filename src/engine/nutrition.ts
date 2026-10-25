/**
 * The day's nutrition from the food log. Everything here is arithmetic on saved entries. A number is only shown when
 * the foods behind it have a value. Foods without one are counted as "not counted" and never guessed.
 *
 * The score is Lift's own simple one, not a medical measure. It uses four public guideline targets:
 * sodium under 2,300 mg a day, fibre 14 g per 1,000 kcal and saturated fat under 10% of calories
 * (U.S. Dietary Guidelines for Americans), and at least 400 g of fruit and vegetables (World Health Organization).
 */
import { GROUP_LABEL, type FoodGroup } from './foodGroups'
import type { FoodLogEntry } from './food'

/** Calories that must be logged before a score is shown, so a half-logged day is not scored. */
export const SCORE_UNLOCK_KCAL = 750
/** A measure needs values for at least this share of the day's calories to count. */
export const MIN_COVERAGE = 0.8

export const SODIUM_LIMIT_MG = 2300
export const FIBER_PER_1000_KCAL = 14
export const SAT_FAT_MAX_SHARE = 0.1
export const FRUIT_VEG_TARGET_G = 400

/** Grams of food in an entry, or undefined when it was logged by servings with no weight. */
export function gramsOf(e: FoodLogEntry): number | undefined {
  if (e.baseAmount === undefined) return undefined
  if (e.baseUnit === 'g') return e.baseAmount
  if (e.baseUnit === 'ml' && e.basis.gramsPerMl) return e.baseAmount * e.basis.gramsPerMl
  return undefined
}

export type Measure = 'sodiumMg' | 'fiber' | 'satFat' | 'sugars'
export interface MeasureTotal {
  total: number
  /** Share of the day's calories from entries that have a value for this measure (0 to 1). */
  coverage: number
}

export interface DayNutrition {
  kcal: number
  entries: number
  measures: Record<Measure, MeasureTotal>
  /** Grams eaten per group, and how many entries in the day belong to no group. */
  groups: Record<FoodGroup, number>
  ungrouped: number
  /** Entries logged by servings, so their grams are unknown. */
  noWeight: number
}

const GROUPS = Object.keys(GROUP_LABEL) as FoodGroup[]

export function dayNutrition(entries: FoodLogEntry[]): DayNutrition {
  const kcal = entries.reduce((a, e) => a + e.kcal, 0)
  const measures = {} as Record<Measure, MeasureTotal>
  for (const m of ['sodiumMg', 'fiber', 'satFat', 'sugars'] as Measure[]) {
    let total = 0
    let covered = 0
    for (const e of entries) {
      const v = e[m]
      if (v !== undefined) { total += v; covered += e.kcal }
    }
    measures[m] = { total, coverage: kcal > 0 ? covered / kcal : 0 }
  }
  const groups = Object.fromEntries(GROUPS.map((g) => [g, 0])) as Record<FoodGroup, number>
  let ungrouped = 0
  let noWeight = 0
  for (const e of entries) {
    const g = gramsOf(e)
    if (g === undefined) noWeight += 1
    if (!e.group) { ungrouped += 1; continue }
    if (g !== undefined) groups[e.group] += g
  }
  return { kcal, entries: entries.length, measures, groups, ungrouped, noWeight }
}

export interface Part { id: 'sodium' | 'fiber' | 'satFat' | 'fruitVeg'; label: string; score: number | null; detail: string }
export type NutritionScore =
  | { locked: true; kcal: number; needed: number }
  | { locked: false; score: number | null; parts: Part[] }

const clamp = (n: number) => Math.max(0, Math.min(100, n))

export function scoreDay(n: DayNutrition): NutritionScore {
  if (n.kcal < SCORE_UNLOCK_KCAL) return { locked: true, kcal: Math.round(n.kcal), needed: SCORE_UNLOCK_KCAL }
  const have = (m: Measure) => n.measures[m].coverage >= MIN_COVERAGE
  const na = n.measures.sodiumMg.total
  // Ratios are measured against the calories of the foods that have a value, so a missing food does not skew them.
  const fiberGoal = (FIBER_PER_1000_KCAL * n.kcal * n.measures.fiber.coverage) / 1000
  const satShare = n.measures.satFat.coverage > 0 ? (n.measures.satFat.total * 9) / (n.kcal * n.measures.satFat.coverage) : 0
  const fv = n.groups.fruit + n.groups.vegetables
  const parts: Part[] = [
    { id: 'sodium', label: 'Sodium', score: have('sodiumMg') ? clamp(100 - ((na - SODIUM_LIMIT_MG) / SODIUM_LIMIT_MG) * 100) : null, detail: `${Math.round(na)} mg of ${SODIUM_LIMIT_MG} mg` },
    { id: 'fiber', label: 'Fibre', score: have('fiber') ? clamp((n.measures.fiber.total / fiberGoal) * 100) : null, detail: `${Math.round(n.measures.fiber.total)} g of ${Math.round(fiberGoal)} g` },
    { id: 'satFat', label: 'Saturated fat', score: have('satFat') ? clamp(100 - ((satShare - SAT_FAT_MAX_SHARE) / SAT_FAT_MAX_SHARE) * 100) : null, detail: `${Math.round(satShare * 100)}% of calories (limit 10%)` },
    { id: 'fruitVeg', label: 'Fruit and vegetables', score: n.noWeight + n.ungrouped < n.entries ? clamp((fv / FRUIT_VEG_TARGET_G) * 100) : null, detail: `${Math.round(fv)} g of ${FRUIT_VEG_TARGET_G} g` },
  ]
  const scored = parts.filter((p) => p.score !== null) as (Part & { score: number })[]
  // Two measures at least, or the number would say more than the data does.
  if (scored.length < 2) return { locked: false, score: null, parts }
  return { locked: false, score: Math.round(scored.reduce((a, p) => a + p.score, 0) / scored.length), parts }
}
