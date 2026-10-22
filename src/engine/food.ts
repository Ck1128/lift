// Food logging types and pure calculations. No React and no database in this file.

export const MEAL_CATEGORIES = ['breakfast', 'lunch', 'dinner', 'evening_snacks', 'other'] as const
export type MealCategory = (typeof MEAL_CATEGORIES)[number]
export const MEAL_LABEL: Record<MealCategory, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', evening_snacks: 'Evening snacks', other: 'Other snacks & extras',
}

export type PrepState = 'raw' | 'cooked' | 'ready'
export const PREP_LABEL: Record<PrepState, string> = { raw: 'Raw (dry / uncooked)', cooked: 'Cooked', ready: 'As packaged / ready to eat' }
export const PREP_SHORT: Record<PrepState, string> = { raw: 'raw', cooked: 'cooked', ready: 'ready to eat' }

export const PORTION_UNITS = ['g', 'oz', 'ml', 'cup', 'tbsp', 'tsp', 'piece', 'serving'] as const
export type PortionUnit = (typeof PORTION_UNITS)[number]
export const PORTION_LABEL: Record<PortionUnit, string> = {
  g: 'grams', oz: 'ounces', ml: 'millilitres', cup: 'cups', tbsp: 'tablespoons', tsp: 'teaspoons', piece: 'pieces', serving: 'servings',
}

export const GRAMS_PER_OZ = 28.3495

export type SizedUnit = 'cup' | 'tbsp' | 'tsp' | 'piece' | 'serving'

/** Nutrition and portion sizes for one preparation state of a food. */
export interface FoodState {
  state: PrepState
  /** What "per 100" refers to. 'serving' means the calories are per serving (user-entered). */
  basis: 'g' | 'ml' | 'serving'
  kcalPer100: number
  proteinPer100?: number
  carbsPer100?: number
  fatPer100?: number
  /** Size of one cup / tbsp / tsp / piece / serving, in the basis unit (grams or ml). A missing unit is not supported. */
  unitSize: Partial<Record<SizedUnit, number>>
  /** Grams per millilitre, for liquids. Without it, ml and g cannot be converted. */
  gramsPerMl?: number
  /** Human wording that shows the state, for example "rice, white, dry". */
  label?: string
}

export type FoodKind = 'generic' | 'packaged' | 'user'

export interface FoodItem {
  provider: string
  providerId: string
  name: string
  brand?: string
  aliases?: string[]
  /** The Telugu name (script and letters), shown under the English name. */
  nameTe?: string
  states: FoodState[]
  kind: FoodKind
  source: string
  attribution?: string
  /** Typical values rather than a lab-measured record. */
  approximate?: boolean
  retrievedAt?: string
}

/** One search result row: a food in one preparation state, so the state is always visible. */
export interface FoodChoice {
  item: FoodItem
  state: FoodState
}

export interface FoodBasisSnapshot {
  basis: FoodState['basis']
  kcalPer100: number
  proteinPer100?: number
  carbsPer100?: number
  fatPer100?: number
  unitSize: FoodState['unitSize']
  gramsPerMl?: number
}

export interface FoodLogEntry {
  id: string
  /** Local calendar date, YYYY-MM-DD. */
  date: string
  mealCategory: MealCategory
  name: string
  brand?: string
  provider: string
  providerId: string
  source: string
  userEntered?: boolean
  approximate?: boolean
  state: PrepState
  stateLabel?: string
  portionValue: number
  portionUnit: PortionUnit
  /** The amount in grams or millilitres, when known. */
  baseAmount?: number
  baseUnit?: 'g' | 'ml' | 'serving'
  kcal: number
  protein?: number
  carbs?: number
  fat?: number
  /** The exact numbers used, so a later provider change never alters a past log. */
  basis: FoodBasisSnapshot
  note?: string
  createdAt: string
  updatedAt: string
}

export interface FoodCacheEntry {
  key: string
  provider: string
  query: string
  results: FoodItem[]
  retrievedAt: string
  expiresAt: string
}

export type PortionResult =
  | { ok: true; baseAmount: number; baseUnit: 'g' | 'ml' | 'serving'; kcal: number; protein?: number; carbs?: number; fat?: number; basisText: string }
  | { ok: false; reason: string }

export const basisOf = (s: FoodState): FoodBasisSnapshot => ({
  basis: s.basis, kcalPer100: s.kcalPer100, proteinPer100: s.proteinPer100, carbsPer100: s.carbsPer100, fatPer100: s.fatPer100,
  unitSize: s.unitSize, gramsPerMl: s.gramsPerMl,
})

const r1 = (n: number) => Math.round(n * 10) / 10

/** Which units this basis can convert to. Used to show only choices that will work. */
export function supportedUnits(b: FoodBasisSnapshot): PortionUnit[] {
  if (b.basis === 'serving') return ['serving']
  const out: PortionUnit[] = ['g', 'oz']
  if (b.basis === 'ml' || b.gramsPerMl) out.push('ml')
  for (const u of ['cup', 'tbsp', 'tsp', 'piece', 'serving'] as SizedUnit[]) if (b.unitSize[u]) out.push(u)
  return out
}

export function basisText(b: FoodBasisSnapshot): string {
  if (b.basis === 'serving') return `${Math.round(b.kcalPer100)} calories per serving (entered by you)`
  return `${Math.round(b.kcalPer100)} calories per 100 ${b.basis}`
}

const MAX_BASE = 5000

/**
 * Calories for a portion. Pure. A unit is only converted when the food record has a real conversion for it:
 * cups, spoons and pieces use that food's own sizes, and ml <-> g needs a density. Nothing is assumed.
 */
export function calcPortion(b: FoodBasisSnapshot, value: number, unit: PortionUnit): PortionResult {
  if (!Number.isFinite(value) || value <= 0) return { ok: false, reason: 'Enter an amount greater than zero.' }
  let base: number
  let baseUnit: 'g' | 'ml' | 'serving'
  if (b.basis === 'serving') {
    if (unit !== 'serving') return { ok: false, reason: 'This food only has calories per serving. Enter the number of servings.' }
    base = value
    baseUnit = 'serving'
    if (value > 50) return { ok: false, reason: 'That is more than 50 servings. Please check the amount.' }
  } else {
    baseUnit = b.basis
    const toBase = (grams: number): number | null => {
      if (b.basis === 'g') return grams
      return b.gramsPerMl ? grams / b.gramsPerMl : null
    }
    if (unit === 'g') {
      const v = toBase(value)
      if (v === null) return { ok: false, reason: 'This food is measured by volume and has no density, so grams cannot be converted. Use millilitres, cups or servings.' }
      base = v
    } else if (unit === 'oz') {
      const v = toBase(value * GRAMS_PER_OZ)
      if (v === null) return { ok: false, reason: 'This food is measured by volume and has no density, so ounces cannot be converted. Use millilitres, cups or servings.' }
      base = v
    } else if (unit === 'ml') {
      if (b.basis === 'ml') base = value
      else if (b.gramsPerMl) base = value * b.gramsPerMl
      else return { ok: false, reason: 'Millilitres cannot be converted to weight for this food because its density is not known. Use grams, cups or pieces.' }
    } else {
      const size = b.unitSize[unit]
      if (!size) {
        return { ok: false, reason: `This food has no size for one ${PORTION_LABEL[unit].replace(/s$/, '')}. Use ${supportedUnits(b).map((u) => PORTION_LABEL[u]).slice(0, 3).join(', ')} instead.` }
      }
      base = value * size
    }
    if (base > MAX_BASE) return { ok: false, reason: `That is more than ${MAX_BASE} ${b.basis}. Please check the amount.` }
    if (base < 1) return { ok: false, reason: 'That amount is too small to be meaningful. Check the unit.' }
  }
  const f = baseUnit === 'serving' ? base : base / 100
  const kcal = Math.round(b.kcalPer100 * f)
  return {
    ok: true, baseAmount: r1(base), baseUnit, kcal,
    protein: b.proteinPer100 === undefined ? undefined : r1(b.proteinPer100 * f),
    carbs: b.carbsPer100 === undefined ? undefined : r1(b.carbsPer100 * f),
    fat: b.fatPer100 === undefined ? undefined : r1(b.fatPer100 * f),
    basisText: basisText(b),
  }
}

/**
 * A food whose preparation state changes calories a lot (more than 10 percent) needs the user to choose the state.
 * The app never picks raw or cooked for them.
 */
export function stateMatters(item: FoodItem): boolean {
  if (item.states.length < 2) return false
  const k = item.states.map((s) => s.kcalPer100)
  return Math.max(...k) / Math.max(1, Math.min(...k)) > 1.1
}

export function choicesOf(item: FoodItem): FoodChoice[] {
  return item.states.map((state) => ({ item, state }))
}

export function choiceTitle(c: FoodChoice): string {
  const stateText = c.item.states.length > 1 || c.state.state !== 'ready' ? ` (${c.state.label ?? PREP_SHORT[c.state.state]})` : ''
  return `${c.item.name}${stateText}`
}

export interface DaySummary {
  count: number
  kcal: number
  byMeal: Record<MealCategory, { count: number; kcal: number }>
}

/** Totals come only from saved entries. count 0 means nothing was logged, which is not the same as 0 calories. */
export function summarizeDay(entries: FoodLogEntry[]): DaySummary {
  const byMeal = Object.fromEntries(MEAL_CATEGORIES.map((m) => [m, { count: 0, kcal: 0 }])) as DaySummary['byMeal']
  let kcal = 0
  for (const e of entries) {
    byMeal[e.mealCategory].count += 1
    byMeal[e.mealCategory].kcal += e.kcal
    kcal += e.kcal
  }
  return { count: entries.length, kcal, byMeal }
}

export function entryFromChoice(args: {
  id: string
  date: string
  meal: MealCategory
  choice: FoodChoice
  value: number
  unit: PortionUnit
  note?: string
  now: string
}): FoodLogEntry | { error: string } {
  const b = basisOf(args.choice.state)
  const r = calcPortion(b, args.value, args.unit)
  if (!r.ok) return { error: r.reason }
  const { item, state } = args.choice
  return {
    id: args.id, date: args.date, mealCategory: args.meal, name: item.name, brand: item.brand,
    provider: item.provider, providerId: item.providerId, source: item.source,
    userEntered: item.kind === 'user' || undefined, approximate: item.approximate,
    state: state.state, stateLabel: state.label, portionValue: args.value, portionUnit: args.unit,
    baseAmount: r.baseAmount, baseUnit: r.baseUnit, kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat,
    basis: b, note: args.note, createdAt: args.now, updatedAt: args.now,
  }
}

/** Re-calculates an existing entry after the portion or unit changes. Uses the numbers saved with the entry. */
export function recalcEntry(e: FoodLogEntry, value: number, unit: PortionUnit, now: string): FoodLogEntry | { error: string } {
  const r = calcPortion(e.basis, value, unit)
  if (!r.ok) return { error: r.reason }
  return { ...e, portionValue: value, portionUnit: unit, baseAmount: r.baseAmount, baseUnit: r.baseUnit, kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat, updatedAt: now }
}

/** A calories-per-serving food the user typed in. Clearly marked as user-entered. */
export function manualFood(name: string, kcalPerServing: number): FoodItem {
  return {
    provider: 'user', providerId: `user-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name, kind: 'user', source: 'Entered by you',
    states: [{ state: 'ready', basis: 'serving', kcalPer100: kcalPerServing, unitSize: { serving: 1 }, label: 'per serving' }],
  }
}
