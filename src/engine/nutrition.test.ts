import { dayNutrition, scoreDay, SCORE_UNLOCK_KCAL } from './nutrition'
import { classifyFood } from './foodGroups'
import { basisOf, calcPortion, entryFromChoice, type FoodItem, type FoodLogEntry } from './food'
import { loadUsda } from '../food/usda'
import { ALL_LOCAL_FOODS } from '../food/providers'
import { LOCAL_MICROS } from '../data/localMicros'
import { LOCAL_FOODS } from '../data/foods'
import { INDIAN_GROUPS } from '../data/indianGroups'
import { INDIAN_FOODS } from '../data/indianFoods'
import { searchFoods } from '../food/search'
import type { FoodDataProvider } from '../food/providers'

const entry = (item: FoodItem, grams: number, id = 'e'): FoodLogEntry => {
  const e = entryFromChoice({ id, date: '2026-10-21', meal: 'lunch', choice: { item, state: item.states[0] }, value: grams, unit: 'g', now: '2026-10-21T12:00:00Z' })
  if ('error' in e) throw new Error(e.error)
  return e
}

describe('USDA data bundled in the app', () => {
  it('loads about 8,000 foods and copies the USDA numbers unchanged', async () => {
    const all = await loadUsda()
    expect(all.length).toBeGreaterThan(7500)
    const spinach = all.find((f) => f.name === 'Spinach, raw')!
    const s = spinach.states[0]
    expect([s.kcalPer100, s.sodiumMgPer100, s.fiberPer100]).toEqual([23, 79, 2.2])
    expect(spinach.group).toBe('vegetables')
    expect(spinach.provider).toBe('usda')
  })
  it('scales by quantity: 200 g of spinach has twice the sodium of 100 g', async () => {
    const spinach = (await loadUsda()).find((f) => f.name === 'Spinach, raw')!
    const r = calcPortion(basisOf(spinach.states[0]), 200, 'g')
    expect(r.ok && r.sodiumMg).toBe(158)
    expect(r.ok && r.fiber).toBe(4.4)
  })
  it('is found by a normal search, after the hand-picked foods', async () => {
    const out = await searchFoods({ query: 'salmon', online: [], allowNetwork: false, networkOffline: false, cache: { get: async () => undefined, put: async () => {} } })
    expect(out.choices.some((c) => c.item.provider === 'usda' && /salmon/i.test(c.item.name))).toBe(true)
  })
})

describe('bundled foods match the USDA record they take their extra numbers from', () => {
  it('every extra-number entry refers to a real bundled food and its macros agree within rounding', async () => {
    const usda = await loadUsda()
    const byId = new Map(usda.map((f) => [f.providerId, f.states[0]]))
    for (const [key, m] of Object.entries(LOCAL_MICROS)) {
      const [id, st] = key.split('|')
      const food = LOCAL_FOODS.find((f) => f.providerId === id)!
      const s = food.states.find((x) => x.state === st)!
      const u = byId.get(m[0])!
      expect(u, key).toBeDefined()
      expect(Math.abs(u.kcalPer100 - s.kcalPer100), key).toBeLessThanOrEqual(2)
      expect(Math.abs((u.proteinPer100 ?? 0) - (s.proteinPer100 ?? 0)), key).toBeLessThanOrEqual(0.25)
      expect(Math.abs((u.carbsPer100 ?? 0) - (s.carbsPer100 ?? 0)), key).toBeLessThanOrEqual(0.5)
      expect(Math.abs((u.fatPer100 ?? 0) - (s.fatPer100 ?? 0)), key).toBeLessThanOrEqual(0.25)
      expect(String(u.sodiumMgPer100 ?? ''), key).toBe(m[5] === '' ? '' : String(Number(m[5])))
    }
  })
  it('gives the bundled foods their sodium, fibre and group', () => {
    const rice = ALL_LOCAL_FOODS.find((f) => f.providerId === 'rice-brown')!
    expect(rice.states.find((s) => s.state === 'cooked')!.sodiumMgPer100).toBe(4)
    expect(rice.group).toBe('whole_grains')
    expect(ALL_LOCAL_FOODS.find((f) => f.providerId === 'spinach')!.group).toBe('vegetables')
  })
  it('every Indian food id in the group table exists', () => {
    const ids = new Set(INDIAN_FOODS.map((f) => f.providerId.replace(/^in-/, '')))
    for (const id of Object.keys(INDIAN_GROUPS)) expect(ids.has(id), id).toBe(true)
  })
})

describe('food groups', () => {
  it('uses the USDA group and a few plain words', () => {
    expect(classifyFood('1300', 'Beef, ground, 85% lean meat, raw')).toBe('red_meat')
    expect(classifyFood('1000', 'Pork, cured, bacon, cooked')).toBe('processed_meat')
    expect(classifyFood('1000', 'Pork, fresh, leg (ham), rump half, raw')).toBe('red_meat')
    expect(classifyFood('1400', 'Alcoholic beverage, beer, regular, all')).toBe('alcohol')
    expect(classifyFood('0900', 'Cranberry juice cocktail, bottled')).toBeUndefined()
    expect(classifyFood('2000', 'Rice, brown, long-grain, cooked')).toBe('whole_grains')
    expect(classifyFood('2000', 'Rice, white, long-grain, regular, raw, enriched')).toBeUndefined()
    expect(classifyFood('0400', 'Oil, olive, salad or cooking')).toBe('healthy_oils')
    expect(classifyFood('0400', 'Oil, coconut')).toBeUndefined()
    expect(classifyFood('1100', 'Potatoes, boiled, cooked in skin')).toBeUndefined()
  })
})

describe('day nutrition and the score', () => {
  const veg: FoodItem = { provider: 'usda', providerId: 'v', name: 'Veg', kind: 'generic', source: 's', group: 'vegetables', states: [{ state: 'raw', basis: 'g', kcalPer100: 30, sodiumMgPer100: 50, fiberPer100: 3, satFatPer100: 0.1, sugarsPer100: 2, unitSize: {} }] }
  const mystery: FoodItem = { provider: 'local', providerId: 'm', name: 'Dish', kind: 'generic', source: 's', states: [{ state: 'ready', basis: 'g', kcalPer100: 200, unitSize: {} }] }

  it('is locked until 750 kcal are logged', () => {
    const s = scoreDay(dayNutrition([entry(mystery, 100)]))
    expect(s).toEqual({ locked: true, kcal: 200, needed: SCORE_UNLOCK_KCAL })
  })
  it('does not score from foods that have no values, instead of guessing', () => {
    const s = scoreDay(dayNutrition([entry(mystery, 500)]))
    expect(s.locked).toBe(false)
    expect(s.locked === false && s.score).toBeNull()
  })
  it('scores from foods that have values, and adds up groups in grams', () => {
    const entries = [entry(veg, 2500, 'a'), entry(mystery, 10, 'b')]
    const n = dayNutrition(entries)
    expect(n.groups.vegetables).toBe(2500)
    expect(n.measures.sodiumMg.total).toBe(1250)
    const s = scoreDay(n)
    expect(s.locked).toBe(false)
    if (!s.locked) {
      expect(s.score).not.toBeNull()
      expect(s.parts.find((p) => p.id === 'sodium')!.score).toBe(100)
      expect(s.parts.find((p) => p.id === 'fruitVeg')!.score).toBe(100)
    }
  })
  it('sodium over the limit lowers the score', () => {
    const salty: FoodItem = { ...veg, states: [{ ...veg.states[0], sodiumMgPer100: 400 }] }
    const s = scoreDay(dayNutrition([entry(salty, 2500)]))
    const sodium = !s.locked ? s.parts.find((p) => p.id === 'sodium')!.score : null
    expect(sodium).toBe(0)
  })
})

describe('online search is the last resort', () => {
  const cache = { get: async () => undefined, put: async () => {} }
  const mk = () => {
    let calls = 0
    const p: FoodDataProvider = { id: 'openfoodfacts', name: 'OFF', attribution: '', requiresNetwork: true, async search() { calls += 1; return [] } }
    return { p, calls: () => calls }
  }
  it('does not go online when the phone has the food', async () => {
    const { p, calls } = mk()
    const out = await searchFoods({ query: 'banana', online: [p], allowNetwork: true, networkOffline: false, cache })
    expect(out.choices.length).toBeGreaterThan(0)
    expect(calls()).toBe(0)
  })
  it('goes online, and says so first, when nothing on the phone matches', async () => {
    const { p, calls } = mk()
    let announced = 0
    const out = await searchFoods({ query: 'zzqxkv', online: [p], allowNetwork: true, networkOffline: false, cache, onGoingOnline: () => { announced += 1 } })
    expect(calls()).toBe(1)
    expect(announced).toBe(1)
    expect(out.reports.some((r) => /internet/i.test(r.message))).toBe(true)
  })
  it('stays off the internet when online search is switched off, and says how to turn it on', async () => {
    const { p, calls } = mk()
    const out = await searchFoods({ query: 'zzqxkv', online: [p], allowNetwork: false, networkOffline: false, cache })
    expect(calls()).toBe(0)
    expect(out.reports.some((r) => /turn on online search/i.test(r.message))).toBe(true)
  })
})
