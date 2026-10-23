import { db, nowIso, uid } from './schema'
import { getSetting, setSetting, SETTING } from './settings'
import { recalcEntry, type FoodCacheEntry, type FoodItem, type FoodLogEntry, type MealCategory, type PortionUnit } from '../engine/food'
import type { FoodCacheStore } from '../food/search'
import { addDays } from '../engine/dates'

export const foodCacheStore: FoodCacheStore = {
  get: (key) => db.foodCache.get(key) as Promise<FoodCacheEntry | undefined>,
  put: async (e) => { await db.foodCache.put(e) },
}

export async function foodOnDate(date: string): Promise<FoodLogEntry[]> {
  return (await db.foodLog.where('date').equals(date).toArray()).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function getFoodEntry(id: string): Promise<FoodLogEntry | undefined> {
  return db.foodLog.get(id)
}

export async function addFoodEntry(e: FoodLogEntry): Promise<void> {
  await db.foodLog.put(e)
}

export async function changeFoodPortion(id: string, value: number, unit: PortionUnit, meal?: MealCategory, note?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const e = await db.foodLog.get(id)
  if (!e) return { ok: false, error: 'That entry was not found.' }
  const next = recalcEntry(e, value, unit, nowIso())
  if ('error' in next) return { ok: false, error: next.error }
  await db.foodLog.put({ ...next, mealCategory: meal ?? e.mealCategory, note: note ?? e.note })
  return { ok: true }
}

export async function deleteFoodEntry(id: string): Promise<void> {
  await db.foodLog.delete(id)
}

/** Copies an entry to another day or meal. The nutrition numbers saved with it are copied too. */
export async function duplicateFoodEntry(id: string, date: string, meal?: MealCategory): Promise<string | undefined> {
  const e = await db.foodLog.get(id)
  if (!e) return undefined
  const now = nowIso()
  const copy: FoodLogEntry = { ...e, id: uid(), date, mealCategory: meal ?? e.mealCategory, createdAt: now, updatedAt: now }
  await db.foodLog.add(copy)
  return copy.id
}

/** Foods you logged lately, newest first, one row per food and preparation state. */
export async function recentFoods(limit = 12): Promise<FoodLogEntry[]> {
  const all = (await db.foodLog.toArray()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const seen = new Set<string>()
  const out: FoodLogEntry[] = []
  for (const e of all) {
    const k = `${e.provider}|${e.providerId}|${e.state}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(e)
    if (out.length >= limit) break
  }
  return out
}

export async function foodRange(from: string, to: string): Promise<FoodLogEntry[]> {
  return db.foodLog.where('date').between(from, to, true, true).toArray()
}

/** Dates (newest first) that have food logged, for the date switcher. */
export async function foodDates(): Promise<string[]> {
  return [...new Set((await db.foodLog.toArray()).map((e) => e.date))].sort().reverse()
}

export const foodOnlineEnabled = () => getSetting<boolean>(SETTING.foodOnlineSearch, false)
export const setFoodOnline = (on: boolean) => setSetting(SETTING.foodOnlineSearch, on)

/** Remove saved online results (the cache), without touching anything you logged. */
export async function clearFoodCache(): Promise<void> {
  await db.foodCache.clear()
}

export const yesterdayOf = (date: string) => addDays(date, -1)
export type { FoodItem }
