import { LOCAL_FOODS } from '../data/foods'
import { INDIAN_FOODS } from '../data/indianFoods'
import type { FoodItem, FoodState } from '../engine/food'

/**
 * Food data providers. The food screens only know this interface, so a source can be replaced
 * without touching the UI.
 * No provider needs a paid key and no secret is shipped in the app.
 */
export interface FoodDataProvider {
  id: string
  name: string
  /** Shown wherever results from this provider appear. */
  attribution: string
  requiresNetwork: boolean
  search(query: string, opts?: { signal?: AbortSignal }): Promise<FoodItem[]>
}

export class ProviderError extends Error {
  kind: 'rate_limited' | 'http' | 'bad_data'
  constructor(kind: ProviderError['kind'], message: string) {
    super(message)
    this.kind = kind
  }
}

// Letters in any script are kept (Telugu included). Accents on Latin letters are dropped so "cafe" finds "café".
/** Every food bundled with the app: common foods plus Indian foods with Telugu names. */
export const ALL_LOCAL_FOODS: FoodItem[] = [...LOCAL_FOODS, ...INDIAN_FOODS]

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{M}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim()

/** Matches when every word of the query appears in the name or an alias. */
export function matchLocal(query: string, foods: FoodItem[] = ALL_LOCAL_FOODS): FoodItem[] {
  const words = norm(query).split(' ').filter(Boolean)
  if (words.length === 0) return []
  const scored: [number, FoodItem][] = []
  for (const f of foods) {
    const name = norm(f.name)
    const hay = `${name} ${(f.aliases ?? []).map(norm).join(' ')}`
    if (!words.every((w) => hay.includes(w))) continue
    let score = 0
    if (name.startsWith(words[0])) score -= 2
    if (name === words.join(' ')) score -= 3
    scored.push([score, f])
  }
  return scored.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name)).map(([, f]) => f)
}

export const localProvider: FoodDataProvider = {
  id: 'local',
  name: 'Common foods (on this phone)',
  attribution: 'Bundled common foods. USDA FoodData Central reference values (public domain), rounded, plus typical Indian home-style values. Estimates.',
  requiresNetwork: false,
  async search(query) {
    return matchLocal(query)
  },
}

interface OffProduct {
  code?: string
  product_name?: string
  brands?: string
  nutriments?: Record<string, unknown>
  serving_size?: string
  serving_quantity?: number | string
}

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : undefined
}

/** Turns one Open Food Facts product into a food record, or null when it lacks usable calories. */
export function offToFood(p: OffProduct, now: string): FoodItem | null {
  const n = p.nutriments ?? {}
  const kcal = num(n['energy-kcal_100g'])
  const name = (p.product_name ?? '').trim()
  if (kcal === undefined || !name || !p.code) return null
  const servingText = (p.serving_size ?? '').toLowerCase()
  const liquid = /\bml\b|millil/.test(servingText)
  const sq = num(p.serving_quantity)
  const state: FoodState = {
    state: 'ready', basis: liquid ? 'ml' : 'g', kcalPer100: kcal,
    proteinPer100: num(n['proteins_100g']), carbsPer100: num(n['carbohydrates_100g']), fatPer100: num(n['fat_100g']),
    unitSize: sq && sq > 0 ? { serving: sq } : {}, label: 'as packaged',
  }
  return {
    provider: 'openfoodfacts', providerId: p.code, name, brand: (p.brands ?? '').split(',')[0]?.trim() || undefined,
    states: [state], kind: 'packaged', source: 'Open Food Facts (packaged product data)',
    attribution: 'Open Food Facts contributors (ODbL)', retrievedAt: now,
  }
}

const OFF_URL = 'https://world.openfoodfacts.org/cgi/search.pl'

/**
 * Open Food Facts: free, open packaged-food data, no key. Product values are entered by volunteers,
 * so they can be wrong. It covers packaged items (barcode data), not plain ingredients.
 * Search words are sent to openfoodfacts.org, so this provider is only used when the user turns it on.
 */
export function openFoodFactsProvider(fetchImpl: typeof fetch = (...a) => fetch(...a)): FoodDataProvider {
  return {
    id: 'openfoodfacts',
    name: 'Open Food Facts (packaged foods, online)',
    attribution: 'Packaged-food data from Open Food Facts contributors, licensed ODbL. Values are entered by volunteers and may be wrong.',
    requiresNetwork: true,
    async search(query, opts) {
      const url = `${OFF_URL}?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,brands,nutriments,serving_size,serving_quantity`
      const res = await fetchImpl(url, { signal: opts?.signal, headers: { Accept: 'application/json' } })
      if (res.status === 429) throw new ProviderError('rate_limited', 'Open Food Facts asked us to slow down.')
      if (!res.ok) throw new ProviderError('http', `Open Food Facts answered with an error (${res.status}).`)
      let data: unknown
      try { data = await res.json() } catch { throw new ProviderError('bad_data', 'Open Food Facts sent data this app could not read.') }
      const products = (data as { products?: OffProduct[] })?.products
      if (!Array.isArray(products)) throw new ProviderError('bad_data', 'Open Food Facts sent data this app could not read.')
      const now = new Date().toISOString()
      return products.map((p) => offToFood(p, now)).filter((f): f is FoodItem => f !== null)
    },
  }
}
