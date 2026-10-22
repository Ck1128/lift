import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { exerciseById } from '../data/catalog'
import { activeMinutes } from '../engine/history'
import { estimateCalories } from '../engine/calories'
import { formatDay } from '../engine/dates'
import type { Profile, SetLog, WorkoutSession } from '../engine/types'
import { addSet, getActiveSession, markComplete, reopenSession, setExerciseDone, updateSet } from '../db/repo'
import { useRouter } from '../router'
import { ResetDay } from '../components/ResetDay'
import { SendToHealthButton, workoutKcal } from '../components/HealthPanel'
import { workoutItem } from '../engine/health'
import { Button, Card, ScreenHeader } from '../components/ui'

const STATUS: Record<WorkoutSession['status'], string> = {
  completed: 'Completed', partial: 'Partly completed', abandoned: 'Abandoned', in_progress: 'In progress',
}

function calorieLine(s: WorkoutSession, logs: SetLog[], profile: Profile): string {
  const efforts = logs.filter((l) => l.completed && l.effortRating).map((l) => l.effortRating!)
  const est = estimateCalories({
    weightKg: profile.weightKg, activeMinutes: activeMinutes(s),
    averageEffort: efforts.length ? efforts.reduce((a, b) => a + b, 0) / efforts.length : undefined,
  })
  if (est) return est.text
  if (!profile.weightKg) return 'Add your body weight in Settings (optional) to see a rough calorie estimate.'
  return 'Too short to estimate calories.'
}

function SetLine({ l }: { l: SetLog }) {
  if (!l.completed) return <>Not done</>
  if (l.actualMinutes !== undefined && l.actualReps === undefined) return <>{l.actualMinutes} min</>
  return <>{l.actualReps ?? '?'} reps{l.actualWeight ? ` @ ${l.actualWeight} ${l.weightUnit}` : ''}{l.effortRating ? ` · RPE ${l.effortRating}` : ''}</>
}

function EditRow({ l }: { l: SetLog }) {
  const cardio = l.actualReps === undefined && l.actualMinutes !== undefined
  const [w, setW] = useState(l.actualWeight?.toString() ?? '')
  const [r, setR] = useState((cardio ? l.actualMinutes : l.actualReps)?.toString() ?? '')
  const [err, setErr] = useState('')
  const save = async (completed: boolean) => {
    const n = r.trim() === '' ? undefined : Number(r)
    const weight = w.trim() === '' ? undefined : Number(w)
    if (n !== undefined && (!Number.isFinite(n) || n < 0 || n > 999)) return setErr(cardio ? 'Minutes must be 0 to 999.' : 'Reps must be 0 to 999.')
    if (weight !== undefined && (!Number.isFinite(weight) || weight < 0 || weight > 2000)) return setErr('Weight must be 0 to 2000.')
    if (completed && n === undefined) return setErr(cardio ? 'Enter the minutes you did.' : 'Enter the reps you did.')
    setErr('')
    await updateSet(l.id, cardio ? { actualMinutes: n, completed } : { actualReps: n, actualWeight: weight, completed })
  }
  return (
    <div className="set-row-wrap">
      <div className={l.completed ? 'edit-row done' : 'edit-row'}>
        <span className="n">{l.setNumber}</span>
        {!cardio && <input aria-label={`Set ${l.setNumber} weight (${l.weightUnit})`} inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} onBlur={() => void save(l.completed)} />}
        <input aria-label={cardio ? `Minutes for set ${l.setNumber}` : `Set ${l.setNumber} reps`} inputMode="decimal" value={r} onChange={(e) => setR(e.target.value)} onBlur={() => void save(l.completed)} />
        <button type="button" className={l.completed ? 'check-btn on' : 'check-btn'} aria-pressed={l.completed} aria-label={l.completed ? `Set ${l.setNumber} done. Tap to undo` : `Mark set ${l.setNumber} done`} onClick={() => void save(!l.completed)}>✓</button>
      </div>
      {err && <p className="error" role="alert">{err}</p>}
    </div>
  )
}

function SessionBody({ session, logs, profile, editing }: { session: WorkoutSession; logs: SetLog[]; profile: Profile; editing?: boolean }) {
  const sorted = [...logs].sort((a, b) => a.slotId.localeCompare(b.slotId, undefined, { numeric: true }) || a.setNumber - b.setNumber)
  return (
    <>
      <Card>
        <p><strong>{STATUS[session.status]}</strong> · {formatDay(session.date)}</p>
        <p className="muted">
          {activeMinutes(session)} min active · {logs.filter((l) => l.completed).length} of {logs.length} sets done
        </p>
        {session.status !== 'abandoned' && <p className="hint">{calorieLine(session, logs, profile)}</p>}
        {!editing && <div className="inline"><SendToHealthButton build={(k) => workoutItem(session, k, k ? workoutKcal(session, logs, profile) : undefined)} /></div>}
        {session.reopenedAt && <p className="hint">Reopened and edited {new Date(session.updatedAt ?? session.reopenedAt).toLocaleString()}</p>}
        <p className="hint">Plan v{session.planVersion} · generator {session.generatorVersion}</p>
      </Card>
      {session.plannedExercises.map((slot) => {
        const actual = session.actualExercises.find((a) => a.slotId === slot.slotId)
        const mine = sorted.filter((l) => l.slotId === slot.slotId)
        const names = new Set(mine.filter((l) => l.completed).map((l) => l.exerciseId))
        const cardio = slot.kind === 'cardio'
        return (
          <Card key={slot.slotId}>
            <p className="big">{cardio ? slot.name : (actual ? exerciseById(actual.exerciseId)?.name ?? slot.name : slot.name)}</p>
            {actual?.replacedFromId && <p className="hint">Planned: {exerciseById(actual.replacedFromId)?.name ?? slot.name}</p>}
            {actual?.skipped && <p className="muted">Skipped</p>}
            {actual?.painReported && <p className="notice">Pain was noted on this exercise.</p>}
            {editing ? (
              <>
                {mine.map((l) => <EditRow key={l.id} l={l} />)}
                <div className="inline">
                  {!cardio && <Button variant="small" onClick={() => void addSet(session.id, slot.slotId)}>Add set</Button>}
                  <Button variant="small" onClick={() => void setExerciseDone(session.id, slot.slotId, false)}>Mark all not done</Button>
                </div>
              </>
            ) : (
              <table className="sets">
                <thead><tr><th>Set</th><th>Planned</th><th>Done</th></tr></thead>
                <tbody>
                  {mine.map((l) => (
                    <tr key={l.id}>
                      <td>{l.setNumber}</td>
                      <td>{cardio ? `${slot.durationMinutes} min` : `${l.plannedRepMin}-${l.plannedRepMax} reps${l.plannedWeight !== undefined ? ` @ ${l.plannedWeight} ${l.weightUnit}` : ''}`}</td>
                      <td><SetLine l={l} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {names.size > 1 && <p className="hint">Sets were done with more than one exercise (replaced mid-workout).</p>}
          </Card>
        )
      })}
    </>
  )
}

/** A saved workout: read it, edit it, resume it (same day), or start that day over. */
export function SessionPage({ sessionId, profile, today }: { sessionId: string; profile: Profile; today: string }) {
  const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId])
  const logs = useLiveQuery(() => db.setLogs.where('sessionId').equals(sessionId).toArray(), [sessionId], [] as SetLog[])
  const active = useLiveQuery(() => getActiveSession(), [], undefined)
  const { navigate, back } = useRouter()
  const [editing, setEditing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  if (session === undefined) return <p className="muted">Loading...</p>
  if (!session) {
    return (
      <>
        <ScreenHeader title="Workout not found" />
        <p className="muted">This workout is no longer saved, for example because the day was reset.</p>
        <Button variant="ghost" onClick={back}>Back</Button>
      </>
    )
  }
  const inProgress = session.status === 'in_progress'
  const canResume = !inProgress && session.date === today
  const resume = async () => {
    const r = await reopenSession(session.id, today)
    if (r.ok) navigate('/workout')
    else setMsg(r.reason)
  }
  const saveEdits = async () => {
    await markComplete(session.id)
    setEditing(false)
    setMsg('Saved. The status was recalculated from your sets.')
  }
  return (
    <>
      <ScreenHeader title={session.title} subtitle={editing ? 'Editing a saved workout' : 'Saved workout'} />
      {inProgress ? (
        <Button onClick={() => navigate('/workout')}>Continue this workout</Button>
      ) : editing ? (
        <div className="inline">
          <Button onClick={() => void saveEdits()}>Save changes</Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>Stop editing</Button>
        </div>
      ) : (
        <div className="inline">
          <Button variant="small" onClick={() => { setMsg(null); setEditing(true) }}>Edit sets</Button>
          {canResume && <Button variant="small" onClick={() => void resume()} disabled={!!active}>Resume workout</Button>}
        </div>
      )}
      {!inProgress && canResume && active && <p className="hint">Another workout is open. Finish it before resuming this one.</p>}
      {!inProgress && !canResume && !editing && <p className="hint">You can resume a workout on the day you did it. You can still edit it any time.</p>}
      {msg && <p className="notice" role="status">{msg}</p>}
      <SessionBody session={session} logs={logs} profile={profile} editing={editing} />
      <ResetDay date={session.date} today={today} onDone={() => navigate('/progress')} />
    </>
  )
}

/** Shown right after finishing. */
export function SessionSummary({ sessionId, profile, onClose }: { sessionId: string; profile: Profile; onClose: () => void }) {
  const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId])
  const logs = useLiveQuery(() => db.setLogs.where('sessionId').equals(sessionId).toArray(), [sessionId], [] as SetLog[])
  const { navigate } = useRouter()
  if (!session) return <p className="muted">Loading...</p>
  return (
    <>
      <ScreenHeader title={session.status === 'abandoned' ? 'Workout discarded' : 'Workout saved'} subtitle={session.title} back={false} />
      <SessionBody session={session} logs={logs} profile={profile} />
      <Button onClick={onClose}>Done</Button>
      <Button variant="ghost" onClick={() => navigate(`/session/${session.id}`)}>Review or edit this workout</Button>
    </>
  )
}
