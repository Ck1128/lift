import { useState, type ReactNode } from 'react'
import { setTrack } from '../db/repo'
import { ConfirmDialog } from './ui'

const ICON: Record<'yoga' | 'workout', ReactNode> = {
  yoga: <><circle cx="12" cy="5" r="2.2" /><path d="M12 8v5m0 0-4 5m4-5 4 5M5 12c2.500 0 4-1 7-1s4.500 1 7 1" /></>,
  workout: <><path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" /></>,
}

/**
 * A full-width bar: icon, name and a sliding switch. Turning a track off asks first; history is always kept.
 */
export function TrackSwitch({ track, on, label, offNote }: { track: 'yoga' | 'workout'; on: boolean; label: string; offNote: string }) {
  const [asking, setAsking] = useState(false)
  const flip = () => { if (on) setAsking(true); else void setTrack(track, true) }
  return (
    <>
      <div className={`track-bar${on ? ' on' : ''}`}>
        <span className="track-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICON[track]}</svg>
        </span>
        <span className="track-text">
          <strong>{label}</strong>
          <small>{on ? 'On' : offNote}</small>
        </span>
        <button type="button" role="switch" aria-checked={on} aria-label={`${label} ${on ? 'on' : 'off'}`} className="switch" onClick={flip}><span className="knob" /></button>
      </div>
      {asking && (
        <ConfirmDialog
          title={`Turn ${label} off?`} confirmLabel="Turn off"
          message={<p>{label} will be hidden. Everything you did is kept, and you can switch it back on at any time.</p>}
          onCancel={() => setAsking(false)} onConfirm={() => { setAsking(false); void setTrack(track, false) }}
        />
      )}
    </>
  )
}
