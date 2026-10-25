import { useEffect, useState } from 'react'

/**
 * The opening screen: LIFT, the tagline, and what it stands for.
 * It shows every time the app is launched, and again every 2 hours while the app stays open.
 * Switching away and back quickly does not replay it.
 */
const EVERY_MS = 2 * 60 * 60 * 1000

export function Splash() {
  const [phase, setPhase] = useState<'show' | 'out' | 'gone'>(import.meta.env.MODE === 'test' ? 'gone' : 'show')
  const [run, setRun] = useState(0)

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return
    let lastShown = Date.now()
    const replay = () => { lastShown = Date.now(); setRun((n) => n + 1); setPhase('show') }
    // Every 2 hours, even if the phone slept in between (timers pause while asleep, so check on return too).
    const check = () => { if (document.visibilityState === 'visible' && Date.now() - lastShown >= EVERY_MS) replay() }
    const timer = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    // Coming back from the page cache is a real relaunch.
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) replay() }
    window.addEventListener('pageshow', onShow)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', check); window.removeEventListener('pageshow', onShow) }
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
