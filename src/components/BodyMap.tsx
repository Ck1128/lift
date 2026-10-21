import { useState } from 'react'
import { FINE_LABEL, VIEW_OF, type FineMuscle } from '../engine/muscleMap'

/** What a region can look like. Workout previews use primary/secondary; the recovery map uses the four status values. */
export type MapState = 'primary' | 'secondary' | 'recovered' | 'recovering' | 'recent' | 'no_data' | 'none'

type View = 'front' | 'back'
type Region = { muscle: FineMuscle; d: string; mirror?: boolean }

const ELLIPSE = (cx: number, cy: number, rx: number, ry: number, rot = 0) => {
  // path form of a rotated ellipse so every region is a single <path>
  const r = (rot * Math.PI) / 180
  const c = Math.cos(r), s = Math.sin(r)
  const p = (x: number, y: number) => `${(cx + x * c - y * s).toFixed(1)} ${(cy + x * s + y * c).toFixed(1)}`
  return `M${p(-rx, 0)} A${rx} ${ry} ${rot} 1 1 ${p(rx, 0)} A${rx} ${ry} ${rot} 1 1 ${p(-rx, 0)}Z`
}

// Drawn for the viewer's left half; `mirror` repeats it on the right. Original, simplified figure, not an anatomical atlas.
const FRONT: Region[] = [
  { muscle: 'shoulders', d: ELLIPSE(62, 90, 17, 15), mirror: true },
  { muscle: 'chest', d: 'M97 84 L97 120 Q80 126 64 114 Q60 100 68 91 Q82 82 97 84Z', mirror: true },
  { muscle: 'biceps', d: ELLIPSE(46, 130, 9.5, 22, 8), mirror: true },
  { muscle: 'forearms', d: ELLIPSE(38, 184, 8.5, 26, 6), mirror: true },
  { muscle: 'abs', d: 'M86 124 L114 124 L112 186 Q100 192 88 186Z' },
  { muscle: 'obliques', d: 'M84 126 Q71 142 73 184 L85 188 L86 128Z', mirror: true },
  { muscle: 'quads', d: 'M98 196 Q72 198 68 240 Q68 282 80 302 L97 302 Q101 250 98 196Z', mirror: true },
  { muscle: 'calves', d: 'M81 316 Q72 346 78 382 L90 382 Q96 346 93 316Z', mirror: true },
]
const BACK: Region[] = [
  { muscle: 'shoulders', d: ELLIPSE(62, 90, 17, 15), mirror: true },
  { muscle: 'upper_back', d: 'M100 76 Q76 82 68 100 L74 128 Q88 126 100 132 Q112 126 126 128 L132 100 Q124 82 100 76Z' },
  { muscle: 'lats', d: 'M71 132 Q62 156 76 184 L98 184 L98 140 Q84 140 71 132Z', mirror: true },
  { muscle: 'triceps', d: ELLIPSE(46, 130, 9.5, 22, 8), mirror: true },
  { muscle: 'forearms', d: ELLIPSE(38, 184, 8.5, 26, 6), mirror: true },
  { muscle: 'lower_back', d: 'M83 188 L117 188 L115 216 L85 216Z' },
  { muscle: 'glutes', d: 'M98 220 Q70 214 68 240 Q76 260 98 254Z', mirror: true },
  { muscle: 'hamstrings', d: 'M98 258 Q72 260 68 292 Q70 314 82 320 L96 320 Q101 292 98 258Z', mirror: true },
  { muscle: 'calves', d: 'M81 328 Q72 354 78 384 L90 384 Q96 354 93 328Z', mirror: true },
]

const STATE_TEXT: Record<MapState, string> = {
  primary: 'main target', secondary: 'also worked', recovered: 'recovered', recovering: 'recovering', recent: 'recently trained', no_data: 'no data', none: '',
}

export interface BodyMapProps {
  states: Partial<Record<FineMuscle, MapState>>
  onSelect?: (m: FineMuscle) => void
  selected?: FineMuscle | null
  /** A name for the picture, for screen readers. */
  label: string
  defaultView?: View
}

/**
 * Front/back muscle map. Every group is also reachable as a button, so it works with a keyboard and a screen reader,
 * and colour is never the only signal: the status is in each button's name.
 */
export function BodyMap({ states, onSelect, selected, label, defaultView = 'front' }: BodyMapProps) {
  const [view, setView] = useState<View>(defaultView)
  const regions = view === 'front' ? FRONT : BACK
  const interactive = !!onSelect
  const shown = (m: FineMuscle) => VIEW_OF[m].includes(view)

  const region = (r: Region, side: 'l' | 'r') => {
    const st = states[r.muscle] ?? 'none'
    const cls = `muscle m-${st}${selected === r.muscle ? ' sel' : ''}`
    const name = `${FINE_LABEL[r.muscle]}${STATE_TEXT[st] ? `, ${STATE_TEXT[st]}` : ''}`
    const props = interactive && side === 'l'
      ? { role: 'button', tabIndex: 0, 'aria-label': name, 'aria-pressed': selected === r.muscle,
          onClick: () => onSelect?.(r.muscle),
          onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(r.muscle) } } }
      : { 'aria-hidden': true as const }
    return (
      <g key={`${view}-${r.muscle}-${side}`} className={cls} {...props}
         onClick={interactive ? () => onSelect?.(r.muscle) : undefined}
         transform={side === 'r' ? 'translate(200 0) scale(-1 1)' : undefined}>
        <path d={r.d} />
      </g>
    )
  }

  return (
    <div className="bodymap">
      <div className="bodymap-toggle" role="group" aria-label="Body view">
        {(['front', 'back'] as const).map((v) => (
          <button key={v} type="button" className={view === v ? 'chip on' : 'chip'} aria-pressed={view === v} onClick={() => setView(v)}>{v === 'front' ? 'Front' : 'Back'}</button>
        ))}
      </div>
      <svg viewBox="0 0 200 400" role="group" aria-label={`${label}, ${view} view`} className="bodymap-svg">
        <defs>
          <pattern id="bm-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--bm-base)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--bm-hatch)" strokeWidth="2" />
          </pattern>
        </defs>
        {/* neutral silhouette: head, neck, torso, hips, hands, feet */}
        <g className="bm-body" aria-hidden="true">
          <circle cx="100" cy="42" r="21" />
          <rect x="91" y="60" width="18" height="20" rx="6" />
          <path d="M66 84 Q100 72 134 84 L128 196 Q100 206 72 196Z" />
          <path d="M72 190 Q100 200 128 190 L130 224 Q100 232 70 224Z" />
          <ellipse cx="36" cy="222" rx="7" ry="11" /><ellipse cx="164" cy="222" rx="7" ry="11" />
          <ellipse cx="82" cy="392" rx="11" ry="5" /><ellipse cx="118" cy="392" rx="11" ry="5" />
          <rect x="68" y="296" width="28" height="22" rx="8" /><rect x="104" y="296" width="28" height="22" rx="8" />
        </g>
        {regions.filter((r) => shown(r.muscle)).map((r) => (
          <g key={`${r.muscle}-grp`}>
            {region(r, 'l')}
            {r.mirror && region(r, 'r')}
          </g>
        ))}
      </svg>
    </div>
  )
}

/** The colour key. Pair it with every map. */
export function MapLegend({ kind }: { kind: 'recovery' | 'workout' }) {
  const items: { s: MapState; t: string }[] = kind === 'recovery'
    ? [{ s: 'recovered', t: 'Recovered' }, { s: 'recovering', t: 'Recovering' }, { s: 'recent', t: 'Recently trained' }, { s: 'no_data', t: 'No data' }]
    : [{ s: 'primary', t: 'Main target' }, { s: 'secondary', t: 'Also worked' }]
  return (
    <ul className="legend" aria-label="Colour key">
      {items.map((i) => (
        <li key={i.s}><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className={`m-${i.s}`}><rect className="swatch" x="1" y="1" width="16" height="16" rx="4" /></svg>{i.t}</li>
      ))}
    </ul>
  )
}
