import { useEffect, useState } from 'react'

/** The opening screen: LIFT, the tagline, and what it stands for. Shown once each time the app is opened. */
let shown = false

export function Splash() {
  const [phase, setPhase] = useState<'show' | 'out' | 'gone'>(() => (shown || import.meta.env.MODE === 'test' ? 'gone' : 'show'))
  useEffect(() => {
    if (phase === 'gone') return
    shown = true
    const a = setTimeout(() => setPhase('out'), 2900)
    const b = setTimeout(() => setPhase('gone'), 3450)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [phase])
  if (phase === 'gone') return null
  return (
    <div className={`splash${phase === 'out' ? ' out' : ''}`} role="presentation" onClick={() => setPhase('out')}>
      <span className="splash-ring" /><span className="splash-ring r2" /><span className="splash-ring r3" />
      <div>
        <div className="splash-word" aria-label="Lift"><span>L</span><span>I</span><span>F</span><span>T</span></div>
        <p className="splash-tag">Train. Restore. Nourish. Repeat.</p>
        <p className="splash-sub">All the pieces of a healthier body, connected in one place.</p>
      </div>
    </div>
  )
}
