import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode,
} from 'react'

/**
 * A tiny client-side router built on the browser history, using the URL hash.
 * Hash routes keep working on GitHub Pages (a refresh never asks the server for a path that does not exist),
 * and moving between pages never reloads the document.
 */

export const TAB_PATHS = ['/home', '/plan', '/workout', '/food', '/progress', '/settings'] as const
export const DEFAULT_PATH = '/home'

const EVENT = 'lift:navigate'

export function readPath(): string {
  if (typeof window === 'undefined') return DEFAULT_PATH
  const h = window.location.hash.replace(/^#/, '')
  return h.startsWith('/') ? h : DEFAULT_PATH
}

function subscribe(cb: () => void): () => void {
  window.addEventListener('popstate', cb)
  window.addEventListener('hashchange', cb)
  window.addEventListener(EVENT, cb)
  return () => {
    window.removeEventListener('popstate', cb)
    window.removeEventListener('hashchange', cb)
    window.removeEventListener(EVENT, cb)
  }
}

/** Match "/food/edit/:id" against a path. Returns the params, or null when it does not match. */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean)
  const b = path.split('?')[0].split('/').filter(Boolean)
  if (a.length !== b.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i])
    else if (a[i] !== b[i]) return null
  }
  return params
}

/** Where Back goes when there is no earlier in-app page (for example after a refresh or a shared link). */
export function parentOf(path: string): string {
  const p = path.split('?')[0]
  if (p.startsWith('/workout/')) return '/workout'
  if (p.startsWith('/session/')) return '/progress'
  if (p === '/yoga') return '/home'
  if (p.startsWith('/yoga/')) return '/yoga'
  if (p.startsWith('/food/')) return '/food'
  return DEFAULT_PATH
}

export function isRoot(path: string): boolean {
  return (TAB_PATHS as readonly string[]).includes(path.split('?')[0])
}

interface PendingNav { run: () => void }

interface RouterApi {
  path: string
  navigate: (to: string) => void
  replace: (to: string) => void
  /** Goes to the previous in-app page, or to the parent page when there is none. */
  back: () => void
  /** Set while a form has unsaved input. Leaving then asks first. */
  setDirty: (dirty: boolean) => void
}

const noop = () => undefined
const Ctx = createContext<RouterApi>({ path: DEFAULT_PATH, navigate: noop, replace: noop, back: noop, setDirty: noop })

export const useRouter = (): RouterApi => useContext(Ctx)

/** Registers that the current page has unsaved changes. Cleared when the page is left. */
export function useUnsavedGuard(dirty: boolean): void {
  const { setDirty } = useRouter()
  useEffect(() => {
    setDirty(dirty)
    return () => setDirty(false)
  }, [dirty, setDirty])
}

function stateIdx(): number {
  const s = window.history.state as { idx?: number } | null
  return typeof s?.idx === 'number' ? s.idx : 0
}

export function RouterProvider({ children, confirmLeave }: { children: ReactNode; confirmLeave?: (p: { stay: () => void; leave: () => void }) => ReactNode }) {
  const path = useSyncExternalStore(subscribe, readPath, () => DEFAULT_PATH)
  const dirty = useRef(false)
  const lastPath = useRef(path)
  const [pending, setPending] = useState<PendingNav | null>(null)

  // Make the first entry carry an index, so Back knows whether an earlier in-app page exists.
  useEffect(() => {
    if (!(window.history.state as { idx?: number } | null)?.idx && window.history.state === null) {
      window.history.replaceState({ idx: 0 }, '', `#${readPath()}`)
    }
  }, [])

  useEffect(() => { lastPath.current = path }, [path])

  const guarded = useCallback((go: () => void) => {
    if (dirty.current) setPending({ run: go })
    else go()
  }, [])

  const push = useCallback((to: string, mode: 'push' | 'replace') => {
    guarded(() => {
      const idx = stateIdx()
      if (mode === 'push') window.history.pushState({ idx: idx + 1 }, '', `#${to}`)
      else window.history.replaceState({ idx }, '', `#${to}`)
      dirty.current = false
      window.dispatchEvent(new Event(EVENT))
    })
  }, [guarded])

  // Browser Back/Forward while a form is dirty: put the page back and ask first.
  useEffect(() => {
    const onPop = () => {
      if (!dirty.current) return
      const target = readPath()
      if (target === lastPath.current) return
      const keep = lastPath.current
      window.history.pushState({ idx: stateIdx() + 1 }, '', `#${keep}`)
      window.dispatchEvent(new Event(EVENT))
      setPending({
        run: () => {
          dirty.current = false
          window.history.pushState({ idx: stateIdx() + 1 }, '', `#${target}`)
          window.dispatchEvent(new Event(EVENT))
        },
      })
    }
    window.addEventListener('popstate', onPop)
    const onUnload = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [])

  const api = useMemo<RouterApi>(() => ({
    path,
    navigate: (to) => push(to, 'push'),
    replace: (to) => push(to, 'replace'),
    back: () => {
      guarded(() => {
        if (stateIdx() > 0) {
          dirty.current = false
          window.history.back()
        } else {
          window.history.replaceState({ idx: 0 }, '', `#${parentOf(readPath())}`)
          dirty.current = false
          window.dispatchEvent(new Event(EVENT))
        }
      })
    },
    setDirty: (d) => { dirty.current = d },
  }), [path, push, guarded])

  return (
    <Ctx.Provider value={api}>
      {children}
      {pending && confirmLeave?.({
        stay: () => setPending(null),
        leave: () => { const p = pending; setPending(null); p.run() },
      })}
    </Ctx.Provider>
  )
}

/** The query part of a path, as a URLSearchParams. "/food/add?meal=lunch" gives meal=lunch. */
export function queryOf(path: string): URLSearchParams {
  const i = path.indexOf('?')
  return new URLSearchParams(i >= 0 ? path.slice(i + 1) : '')
}
