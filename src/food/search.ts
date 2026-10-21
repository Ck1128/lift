import type { FoodCacheEntry, FoodChoice, FoodItem } from '../engine/food'
import { choicesOf } from '../engine/food'
import { localProvider, ProviderError, type FoodDataProvider } from './providers'

export interface FoodCacheStore {
  get(key: string): Promise<FoodCacheEntry | undefined>
  put(entry: FoodCacheEntry): Promise<void>
}

export type ProviderStatus =
  | 'ok' | 'cached' | 'stale-cache' | 'offline' | 'timeout' | 'rate_limited' | 'error' | 'disabled'

export interface ProviderReport { provider: string; name: string; status: ProviderStatus; message: string }

export interface SearchOutcome {
  /** Each result is a food in one preparation state. Local results come first. */
  choices: FoodChoice[]
  reports: ProviderReport[]
}

export interface SearchOptions {
  query: string
  /** Providers that may use the network. The local provider is always used. */
  online: FoodDataProvider[]
  /** False when the user has not turned on online search, or the phone is offline. */
  allowNetwork: boolean
  networkOffline: boolean
  cache: FoodCacheStore
  now?: () => Date
  timeoutMs?: number
  /** Cached results younger than this are used without asking the network again. */
  freshMs?: number
}

const DAY = 86_400_000

const dedupeKey = (i: FoodItem) => `${i.name.toLowerCase()}|${(i.brand ?? '').toLowerCase()}`

export async function searchFoods(opts: SearchOptions): Promise<SearchOutcome> {
  const q = opts.query.trim()
  const reports: ProviderReport[] = []
  if (q.length < 2) return { choices: [], reports }
  const now = opts.now ?? (() => new Date())
  const items: FoodItem[] = await localProvider.search(q)
  reports.push({ provider: 'local', name: localProvider.name, status: 'ok', message: `${items.length} common food${items.length === 1 ? '' : 's'} found on this phone.` })
  const seen = new Set(items.map(dedupeKey))

  for (const p of opts.online) {
    const key = `${p.id}|${q.toLowerCase()}`
    const add = (list: FoodItem[]) => {
      for (const f of list) {
        const k = dedupeKey(f)
        if (!seen.has(k)) { seen.add(k); items.push(f) }
      }
    }
    if (!opts.allowNetwork) {
      reports.push({ provider: p.id, name: p.name, status: 'disabled', message: 'Online search is off. Turn it on to search packaged foods.' })
      continue
    }
    const cached = await opts.cache.get(key)
    const age = cached ? now().getTime() - new Date(cached.retrievedAt).getTime() : Infinity
    if (cached && age < (opts.freshMs ?? DAY)) {
      add(cached.results)
      reports.push({ provider: p.id, name: p.name, status: 'cached', message: `Saved results from ${new Date(cached.retrievedAt).toLocaleDateString()}.` })
      continue
    }
    if (opts.networkOffline) {
      if (cached) {
        add(cached.results)
        reports.push({ provider: p.id, name: p.name, status: 'stale-cache', message: `You are offline. Showing results saved on ${new Date(cached.retrievedAt).toLocaleDateString()}, which may be out of date.` })
      } else {
        reports.push({ provider: p.id, name: p.name, status: 'offline', message: 'You are offline. Only common foods and your recent foods are available.' })
      }
      continue
    }
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 8000)
    try {
      const results = await p.search(q, { signal: ctl.signal })
      const retrievedAt = now().toISOString()
      await opts.cache.put({ key, provider: p.id, query: q, results, retrievedAt, expiresAt: new Date(now().getTime() + 7 * DAY).toISOString() })
      add(results)
      reports.push({ provider: p.id, name: p.name, status: 'ok', message: `${results.length} packaged product${results.length === 1 ? '' : 's'} found online.` })
    } catch (e) {
      const stale = cached?.results
      if (stale) add(stale)
      if (e instanceof ProviderError && e.kind === 'rate_limited') {
        reports.push({ provider: p.id, name: p.name, status: 'rate_limited', message: 'The online food database asked us to slow down. Try again in a minute. Common foods still work.' })
      } else if (ctl.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) {
        reports.push({ provider: p.id, name: p.name, status: 'timeout', message: 'The online search took too long. Common foods still work.' })
      } else {
        reports.push({ provider: p.id, name: p.name, status: 'error', message: `The online search failed${e instanceof Error ? ` (${e.message})` : ''}. Common foods still work.` })
      }
    } finally {
      clearTimeout(timer)
    }
  }
  return { choices: items.flatMap(choicesOf), reports }
}
