import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toDateKey } from '../engine/dates'
import { getProfile } from '../db/repo'
import type { Profile } from '../engine/types'

/** Today's local date key. Re-checked every minute so the app rolls over at midnight. */
export function useToday(): string {
  const [d, setD] = useState(() => toDateKey(new Date()))
  useEffect(() => {
    const t = setInterval(() => setD(toDateKey(new Date())), 60_000)
    return () => clearInterval(t)
  }, [])
  return d
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

/** undefined = still loading, null = no profile yet. */
export function useProfile(): Profile | null | undefined {
  return useLiveQuery(async () => (await getProfile()) ?? null, [], undefined)
}

export function useNow(intervalMs = 1000, active = true): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs, active])
  return now
}

/** Like useLiveQuery, but tells "still loading" apart from "loaded, and the answer is undefined". */
export function useQuery<T>(fn: () => Promise<T> | T, deps: unknown[]): { loading: boolean; value: T | undefined } {
  const r = useLiveQuery(async () => ({ v: await fn() }), deps)
  return { loading: r === undefined, value: r?.v }
}
