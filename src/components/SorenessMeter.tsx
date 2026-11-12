import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSorenessRating, saveSorenessRating } from '../db/repo'
import { levelAdvice, levelWord, type SorenessRating } from '../engine/soreness'
import type { Muscle } from '../engine/types'
import { Card } from './ui'

/** Areas offered on the meter, each covering one or more muscles. */
const AREAS: { label: string; muscles: Muscle[] }[] = [
  { label: 'Chest', muscles: ['chest'] },
  { label: 'Back', muscles: ['back'] },
  { label: 'Shoulders', muscles: ['shoulders'] },
  { label: 'Arms', muscles: ['biceps', 'triceps'] },
  { label: 'Core', muscles: ['core'] },
  { label: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
]

const tone = (level: number) => (level <= 2 ? 'fresh' : level <= 4 ? 'mild' : level <= 7 ? 'sore' : 'very')

/**
 * The daily soreness meter on Home: drag (or tap, or use the arrow keys) from 1 to 10, and optionally say where.
 * It saves on its own a moment after you let go, and today's workout is shaped by it.
 */
export function SorenessMeter({ today }: { today: string }) {
  const saved = useLiveQuery(() => getSorenessRating(today), [today], undefined)
  const [draft, setDraft] = useState<SorenessRating | null>(null)
  const [status, setStatus] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  if (saved === undefined) return null

  const cur: SorenessRating | null = draft ?? saved
  const level = cur?.level ?? 1
  const areas = cur?.areas ?? []
  const rated = cur !== null

  const commit = (next: SorenessRating, delay: number) => {
    setDraft(next)
    setStatus('')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void saveSorenessRating(today, next).then(() => { setDraft(null); setStatus('Saved. Today\'s workout uses it.') })
    }, delay)
  }
  const toggleArea = (ms: Muscle[]) => {
    const on = ms.every((m) => areas.includes(m))
    commit({ level, areas: on ? areas.filter((m) => !ms.includes(m)) : [...areas, ...ms.filter((m) => !areas.includes(m))] }, 0)
  }

  return (
    <Card className={`soreness-card s-${tone(level)}`} title="Soreness today">
      <div className="sore-read" aria-hidden="true">
        <span className="sore-num">{rated ? level : '–'}</span><span className="sore-of">/10</span>
        <span className="sore-word">{rated ? levelWord(level) : 'Not rated yet'}</span>
      </div>
      <input
        type="range" min={1} max={10} step={1} value={level}
        className="sore-range"
        aria-label="Soreness from 1 (fresh) to 10 (extremely sore)" aria-valuetext={`${level} out of 10, ${levelWord(level)}`}
        onChange={(e) => commit({ level: Number(e.target.value), areas }, 600)}
      />
      <div className="sore-scale" aria-hidden="true"><span>1 Fresh</span><span>5</span><span>10 Very sore</span></div>
      {!rated && (
        <button type="button" className="pill" onClick={() => commit({ level: 1, areas: [] }, 0)}>Not sore today</button>
      )}
      {rated && level >= 3 && (
        <>
          <p className="label-like">Where? <span className="muted">(none chosen means all over)</span></p>
          <div className="chips" role="group" aria-label="Sore areas">
            {AREAS.map((a) => {
              const on = a.muscles.every((m) => areas.includes(m))
              return <button key={a.label} type="button" className={on ? 'chip on' : 'chip'} aria-pressed={on} onClick={() => toggleArea(a.muscles)}>{a.label}</button>
            })}
          </div>
        </>
      )}
      {rated && <p className="hint">{levelAdvice(level)}</p>}
      {status && <p className="hint" role="status">{status}</p>}
    </Card>
  )
}
