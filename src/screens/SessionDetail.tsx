import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { exerciseById } from '../data/catalog'
import { activeMinutes } from '../engine/history'
import { estimateCalories } from '../engine/calories'
import { formatDay } from '../engine/dates'
import type { Profile, SetLog, WorkoutSession } from '../engine/types'
import { Button, Card, ScreenHeader } from '../components/ui'

const STATUS: Record<WorkoutSession['status'], string> = {
  completed: 'Completed', partial: 'Partly completed', abandoned: 'Abandoned', in_progress: 'In progress',
}

function calorieLine(s: WorkoutSession, logs: SetLog[], profile: Profile): string {
  const efforts = logs.filter((l) => l.completed && l.effortRating).map((l) => l.effortRating!)
  const est = estimateCalories({
    weightValue: profile.weightValue, weightUnit: profile.weightUnit, activeMinutes: activeMinutes(s),
    averageEffort: efforts.length ? efforts.reduce((a, b) => a + b, 0) / efforts.length : undefined,
  })
  if (est) return est.text
  if (!profile.weightValue) return 'Add your body weight in Settings (optional) to see a rough calorie estimate.'
  return 'Too short to estimate calories.'
}

function SessionBody({ session, logs, profile }: { session: WorkoutSession; logs: SetLog[]; profile: Profile }) {
  const sorted = [...logs].sort((a, b) => a.slotId.localeCompare(b.slotId, undefined, { numeric: true }) || a.setNumber - b.setNumber)
  return (
    <>
      <Card>
        <p><strong>{STATUS[session.status]}</strong> · {formatDay(session.date)}</p>
        <p className="muted">
          {activeMinutes(session)} min active · {logs.filter((l) => l.completed).length} of {logs.length} sets done
        </p>
        {session.status !== 'abandoned' && <p className="hint">{calorieLine(session, logs, profile)}</p>}
        <p className="hint">Plan v{session.planVersion} · generator {session.generatorVersion}</p>
      </Card>
      {session.plannedExercises.map((slot) => {
        const actual = session.actualExercises.find((a) => a.slotId === slot.slotId)
        const mine = sorted.filter((l) => l.slotId === slot.slotId)
        const names = new Set(mine.filter((l) => l.completed).map((l) => l.exerciseId))
        return (
          <Card key={slot.slotId}>
            <p className="big">{actual ? exerciseById(actual.exerciseId)?.name ?? slot.name : slot.name}</p>
            {actual?.replacedFromId && <p className="hint">Planned: {exerciseById(actual.replacedFromId)?.name ?? slot.name}</p>}
            {actual?.skipped && <p className="muted">Skipped</p>}
            {actual?.painReported && <p className="notice">Pain was noted on this exercise.</p>}
            <table className="sets">
              <thead><tr><th>Set</th><th>Planned</th><th>Done</th></tr></thead>
              <tbody>
                {mine.map((l) => (
                  <tr key={l.id}>
                    <td>{l.setNumber}</td>
                    <td>{l.plannedRepMin}-{l.plannedRepMax} reps{l.plannedWeight !== undefined ? ` @ ${l.plannedWeight} ${l.weightUnit}` : ''}</td>
                    <td>{l.completed ? `${l.actualReps ?? '?'} reps${l.actualWeight ? ` @ ${l.actualWeight} ${l.weightUnit}` : ''}${l.effortRating ? ` · RPE ${l.effortRating}` : ''}` : 'Not done'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {names.size > 1 && <p className="hint">Sets were done with more than one exercise (replaced mid-workout).</p>}
          </Card>
        )
      })}
    </>
  )
}

/** Read-only view of a saved session. */
export function SessionDetail({ sessionId, profile, onBack }: { sessionId: string; profile: Profile; onBack: () => void }) {
  const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId])
  const logs = useLiveQuery(() => db.setLogs.where('sessionId').equals(sessionId).toArray(), [sessionId], [] as SetLog[])
  if (!session) return <p className="muted">Loading...</p>
  return (
    <>
      <Button variant="small" onClick={onBack}>‹ Back</Button>
      <ScreenHeader title={session.title} subtitle="Saved workout (read only)" />
      <SessionBody session={session} logs={logs} profile={profile} />
    </>
  )
}

/** Shown right after finishing. */
export function SessionSummary({ sessionId, profile, onClose }: { sessionId: string; profile: Profile; onClose: () => void }) {
  const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId])
  const logs = useLiveQuery(() => db.setLogs.where('sessionId').equals(sessionId).toArray(), [sessionId], [] as SetLog[])
  if (!session) return <p className="muted">Loading...</p>
  return (
    <>
      <ScreenHeader title={session.status === 'abandoned' ? 'Workout discarded' : 'Workout saved'} subtitle={session.title} />
      <SessionBody session={session} logs={logs} profile={profile} />
      <Button onClick={onClose}>Done</Button>
    </>
  )
}
