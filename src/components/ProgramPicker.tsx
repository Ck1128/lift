import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getProgramState, programHistory, setProgram } from '../db/programRepo'
import { PROGRAMS, programById } from '../data/programs'
import { nextProgramDay } from '../engine/program'
import { ConfirmDialog } from './ui'

const STANDARD = ''
const label = (id: string) => (id === STANDARD ? 'Standard' : `${programById(id)?.name ?? id}`)

/**
 * The workout profile menu on Home. Standard is the usual plan Lift designs on your training days. A program (for
 * example Home) only takes over once it is chosen here, and choosing Standard again brings everything back.
 */
export function ProgramPicker({ today }: { today: string }) {
  const state = useLiveQuery(() => getProgramState(), [], undefined)
  const [pending, setPending] = useState<string | null>(null)
  if (state === undefined) return null
  const current = state?.programId ?? STANDARD

  const apply = async (id: string) => {
    setPending(null)
    if (id === STANDARD) { await setProgram(null, 0, today); return }
    // Coming back to a program picks up after the last day you finished in it.
    const program = programById(id)!
    const day = nextProgramDay(program, { programId: id, day: 0, setAt: '' }, await programHistory(id))
    await setProgram(id, day, today)
  }
  const p = pending && pending !== STANDARD ? programById(pending) : undefined

  return (
    <div className="profile-pick">
      <label htmlFor="workout-profile">Workout profile</label>
      <select id="workout-profile" value={current} onChange={(e) => { if (e.target.value !== current) setPending(e.target.value) }}>
        <option value={STANDARD}>Standard · Lift plans for you</option>
        {PROGRAMS.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.days.length}-day program</option>)}
      </select>
      {pending !== null && (
        <ConfirmDialog
          title={`Switch to ${label(pending)}?`}
          message={p
            ? `${p.days.length} days in order, not tied to weekdays, with ${p.equipment.toLowerCase()}. Your settings, equipment and history stay as they are, and you can switch back any time.`
            : 'Lift plans your workouts on your training days again, as before. Your Home program progress is kept.'}
          confirmLabel="OK"
          onCancel={() => setPending(null)}
          onConfirm={() => void apply(pending)}
        />
      )}
    </div>
  )
}
