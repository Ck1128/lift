import type { FoodItem, FoodState, SizedUnit } from '../engine/food'
import { classifyFood } from '../engine/foodGroups'

/**
 * The USDA Standard Reference foods (about 8,000, public domain) are bundled with the app and load the first time
 * you search, so every search after that works with no network. Values are per 100 g, copied from USDA unchanged.
 */
const SOURCE = 'USDA National Nutrient Database for Standard Reference, Release 28 (public domain)'
const ATTRIBUTION = 'USDA Standard Reference, Release 28. U.S. public domain. Values are per 100 g for the food as described.'

const num = (v: string | undefined): number | undefined => (v === undefined || v === '' ? undefined : Number(v))

export function parseUsdaRow(line: string): FoodItem {
  const c = line.split('|')
  const [id, grp, name, st, kcal, protein, carbs, fat, fibre, sugars, sodium, sat, cup, tbsp, tsp, piece, pieceDesc, density] = c
  const unitSize: Partial<Record<SizedUnit, number>> = {}
  if (cup) unitSize.cup = Number(cup)
  if (tbsp) unitSize.tbsp = Number(tbsp)
  if (tsp) unitSize.tsp = Number(tsp)
  if (piece) unitSize.piece = Number(piece)
  const state: FoodState = {
    state: st === 'c' ? 'cooked' : st === 'r' ? 'raw' : 'ready', basis: 'g', kcalPer100: Number(kcal),
    proteinPer100: num(protein), carbsPer100: num(carbs), fatPer100: num(fat),
    fiberPer100: num(fibre), sugarsPer100: num(sugars), sodiumMgPer100: num(sodium), satFatPer100: num(sat),
    unitSize, gramsPerMl: num(density), pieceNote: piece && pieceDesc ? `1 ${pieceDesc} (${piece} g)` : undefined,
  }
  return { provider: 'usda', providerId: id, name, states: [state], kind: 'generic', source: SOURCE, attribution: ATTRIBUTION, group: classifyFood(grp, name) }
}

let cache: Promise<FoodItem[]> | null = null
/** Loads and parses the bundled table once. The data is its own file, so the app starts without it. */
export function loadUsda(): Promise<FoodItem[]> {
  cache ??= import('../data/usdaFoods').then((m) => m.USDA_ROWS.split('\n').filter(Boolean).map(parseUsdaRow))
  return cache
}
