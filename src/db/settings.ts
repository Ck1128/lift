import { db } from './schema'

/** Small key/value settings kept on the phone. Values must be plain data. */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const rec = await db.settings.get(key)
  return rec === undefined ? fallback : (rec.value as T)
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}

export const SETTING = {
  foodEnabled: 'food.enabled',
  foodOnlineSearch: 'food.onlineSearch',
  yogaPrefs: 'yoga.prefs',
  pageUnit: (page: string) => `unit.${page}`,
} as const
