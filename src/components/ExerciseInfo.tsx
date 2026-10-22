import { useState } from 'react'
import { exerciseById } from '../data/catalog'
import { musclesOf, FINE_LABEL } from '../engine/muscleMap'
import { EQUIPMENT_LABEL } from '../engine/types'
import { Dialog } from './ui'
import { ExerciseMedia } from './ExerciseMedia'

/** The small "i" button. Descriptions stay hidden until it is tapped (US-03). Same look and behaviour everywhere. */
export function InfoButton({ label, onClick, expanded }: { label: string; onClick: () => void; expanded?: boolean }) {
  return (
    <button type="button" className="icon-btn" aria-label={label} aria-haspopup="dialog" aria-expanded={expanded} onClick={onClick}>
      <span aria-hidden="true">i</span>
    </button>
  )
}

export interface ExerciseInfoProps {
  exerciseId: string
  name: string
  cues?: string[]
  note?: string
  why?: string
}

/** Info icon plus the dialog it opens. Opening or closing it only changes local display state; no workout data is touched. */
export function ExerciseInfo(props: ExerciseInfoProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <InfoButton label={`About ${props.name}`} expanded={open} onClick={() => setOpen(true)} />
      {open && <ExerciseInfoDialog {...props} onClose={() => setOpen(false)} />}
    </>
  )
}

function ExerciseInfoDialog({ exerciseId, name, cues, note, why, onClose }: ExerciseInfoProps & { onClose: () => void }) {
  const ex = exerciseById(exerciseId)
  const use = musclesOf(ex)
  return (
    <Dialog title={name} onClose={onClose}>
      {ex && !use.unmapped && (
        <p><strong>Muscles:</strong> {use.primary.map((m) => FINE_LABEL[m]).join(', ')}{use.secondary.length ? ` (also ${use.secondary.map((m) => FINE_LABEL[m]).join(', ')})` : ''}</p>
      )}
      {ex && <p><strong>Equipment:</strong> {ex.equipmentIds.map((e) => EQUIPMENT_LABEL[e] ?? e).join(', ') || 'None'}</p>}
      {why && <p className="muted">{why}</p>}
      {/* The numbered steps below already contain these tips, so they are only shown when they say something else. */}
      {cues && cues.length > 0 && !cues.every((c) => ex?.instructions.includes(c)) && (
        <>
          <p className="label-like">Form tips</p>
          <ul className="plain cues">{cues.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </>
      )}
      {note && <p className="hint">{note}</p>}
      <ExerciseMedia exerciseId={exerciseId} />
      <div className="notice" role="note">
        <strong>Safety:</strong> choose a weight you can control through the whole movement. Stop if you feel sharp pain, dizziness or numbness. This is general guidance, not personal medical advice.
      </div>
      <div className="dialog-actions"><button type="button" className="btn" onClick={onClose}>Close</button></div>
    </Dialog>
  )
}
