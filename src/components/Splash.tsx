import { useEffect, useState } from 'react'

/**
 * The opening screen: LIFT, the tagline, and what it stands for.
 * It shows every time the app starts. An iPhone often keeps a closed web app asleep instead of restarting it, so it also
 * shows again whenever the app comes back after being away for 30 seconds or more.
 */
const AWAY_MS = 30_000

export function Splash() {
  const [phase, setPhase] = useState<'show' | 'out' | 'gone'>(import.meta.env.MODE === 'test' ? 'gone' : 'show')
  const [run, setRun] = useState(0)

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return
    let hiddenAt = 0
    const onVis = () => {
      if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return }
      if (hiddenAt && Date.now() - hiddenAt >= AWAY_MS) { setRun((n) => n + 1); setPhase('show') }
      hiddenAt = 0
    }
    // Coming back from the page cache (back-forward cache) counts as a reopen too.
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) { setRun((n) => n + 1); setPhase('show') } }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pageshow', onShow)
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pageshow', onShow) }
  }, [])

  useEffect(() => {
    if (phase !== 'show') return
    const a = setTimeout(() => setPhase('out'), 2900)
    const b = setTimeout(() => setPhase('gone'), 3450)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [phase, run])

  if (phase === 'gone') return null
  return (
    <div key={run} className={`splash${phase === 'out' ? ' out' : ''}`} role="presentation" onClick={() => setPhase('out')}>
      <span className="splash-ring" /><span className="splash-ring r2" /><span className="splash-ring r3" />
      <div>
        <div className="splash-word" aria-label="Lift"><span>L</span><span>I</span><span>F</span><span>T</span></div>
        <p className="splash-tag">Train. Restore. Nourish. Repeat.</p>
        <p className="splash-sub">All the pieces of a healthier body, connected in one place.</p>
      </div>
    </div>
  )
}
