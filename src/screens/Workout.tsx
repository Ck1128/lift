import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { generateFor, getEquipment, scheduledOn, startSession } from '../db/repo'
import { useQuery } from '../hooks/app'
import { ExerciseMedia } from '../components/ExerciseMedia'
import { Button, Card, Chips, EmptyState, ScreenHeader } from '../components/ui'
import { Player } from './Player'
import { SessionSummary } from './SessionDetail'
import { MUSCLE_LABEL, type Profile } from '../engine/types'
import { formatWeight } from '../engine/units'
import type { ScreenId } from '../components/BottomNav'

const DURATIONS: readonly number[] = [20, 30, 45, 60]

export function Workout({ profile, today, onNavigate }: { profile: Profile; today: string; onNavigate: (id: ScreenId) => void }) {
  const [summaryId, setSummaryId] = useState<string | null>(null)
  const activeQ = useQuery(() => db.sessions.where('status').equals('in_progress').first(), [])
  const schedQ = useQuery(() => scheduledOn(today), [today])
  const equipQ = useQuery(() => getEquipment(profile.preferredLocation, profile.weightUnit, profile.gymType), [profile.preferredLocation, profile.weightUnit, profile.gymType])

  if (summaryId) {
    return <SessionSummary sessionId={summaryId} profile={profile} onClose={() => { setSummaryId(null); onNavigate('home') }} />
  }
  if (activeQ.loading || schedQ.loading || equipQ.loading) return <p className="muted">Loading...</p>
  const active = activeQ.value
  const sched = schedQ.value
  if (active && equipQ.value) {
    return <Player session={active} profile={profile} equipment={equipQ.value} onFinished={(id) => setSummaryId(id)} />
  }
  if (!sched?.workout || sched.status === 'completed' || sched.status === 'skipped') {
    return (
      <>
        <ScreenHeader title="Workout" subtitle="Your workout for today" />
        <EmptyState
          title={sched?.status === 'completed' ? 'Today\'s workout is done' : 'No workout ready'}
          hint={sched?.status === 'completed' ? 'Great job. Rest up.' : 'Choose how much time you have on the Home screen and the app builds one from your equipment and history.'}
        >
          <Button variant="ghost" onClick={() => onNavigate('home')}>Go to Home</Button>
        </EmptyState>
      </>
    )
  }
  return <Preview scheduledId={sched.id} profile={profile} today={today} />
}

function Preview({ scheduledId, profile, today }: { scheduledId: string; profile: Profile; today: string }) {
  const sched = useLiveQuery(() => db.scheduled.get(scheduledId), [scheduledId])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!sched?.workout) return null
  const w = sched.workout

  const regenerate = async (minutes: number, force: boolean) => {
    setBusy(true)
    setError(null)
    try {
      const r = await generateFor(scheduledId, minutes, { today, force })
      if (r.kind !== 'workout') setError(r.message)
    } finally {
      setBusy(false)
    }
  }
  const start = async () => {
    setBusy(true)
    try { await startSession(scheduledId, profile.weightUnit) } catch (e) { setError(e instanceof Error ? e.message : 'Could not start the workout.') } finally { setBusy(false) }
  }

  return (
    <>
      <ScreenHeader title={w.title} subtitle={w.targetMuscles.map((m) => MUSCLE_LABEL[m]).join(' · ')} />
      <Card>
        <p className="big">About {w.estimatedMinutes} min <span className="muted">(estimate, you chose {w.availableMinutes})</span></p>
        {!w.fits && <p className="error" role="alert">This is longer than the time you chose.</p>}
        {w.notes.map((n, i) => <p key={i} className="notice">{n}</p>)}
        <details>
          <summary className="muted">How the time is estimated</summary>
          <ul className="plain">{w.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </details>
        <Chips label="Change available minutes" options={DURATIONS} value={w.availableMinutes} onChange={(m) => regenerate(m, false)} format={(m) => `${m} min`} />
      </Card>

      {w.exercises.map((e, i) => (
        <Card key={e.slotId}>
          <p className="big">{i + 1}. {e.name}</p>
          <p className="muted">{e.sets} sets × {e.repMin}-{e.repMax} reps · rest {e.restSeconds}s</p>
          <p>{e.suggestedWeight !== undefined ? <strong>Suggested: {formatWeight(e.suggestedWeight, e.loadUnit ?? profile.weightUnit)}</strong> : <span className="muted">Pick your own starting weight</span>}</p>
          <p className="hint">{e.loadNote}</p>
          <p className="hint">{e.why}</p>
          <details>
            <summary>Show how to do it</summary>
            <ExerciseMedia exerciseId={e.exerciseId} />
          </details>
        </Card>
      ))}

      {error && <p className="error" role="alert">{error}</p>}
      <Button disabled={busy} onClick={start}>Start workout</Button>
      <Button variant="ghost" disabled={busy} onClick={() => regenerate(w.availableMinutes, true)}>Build a fresh version</Button>
    </>
  )
}
