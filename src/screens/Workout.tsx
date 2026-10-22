import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { generateFor, getEquipment, scheduledOn, setCardioChoice, startSession } from '../db/repo'
import { useQuery } from '../hooks/app'
import { ExerciseInfo, InfoButton } from '../components/ExerciseInfo'
import { MUSCLE_CATEGORIES } from '../engine/feedback'
import { WorkoutMuscles } from '../components/WorkoutMuscles'
import { DurationPicker } from '../components/HomeParts'
import { Button, Card, Dialog, EmptyState, ScreenHeader } from '../components/ui'
import { Player } from './Player'
import { SessionSummary } from './SessionDetail'
import { MUSCLE_LABEL, type Profile } from '../engine/types'
import { availableIds } from '../engine/equipment'
import { cardioOptions, cardioCalories } from '../engine/cardio'
import { cardioById } from '../data/cardio'
import { formatWeight } from '../engine/units'
import { useRouter } from '../router'

export function Workout({ profile, today }: { profile: Profile; today: string }) {
  const { navigate } = useRouter()
  const [summaryId, setSummaryId] = useState<string | null>(null)
  const activeQ = useQuery(() => db.sessions.where('status').equals('in_progress').first(), [])
  const schedQ = useQuery(() => scheduledOn(today), [today])
  const equipQ = useQuery(() => getEquipment(profile.preferredLocation, profile.weightUnit, profile.gymType), [profile.preferredLocation, profile.weightUnit, profile.gymType])
  const savedQ = useQuery(async () => {
    const s = await scheduledOn(today)
    return s ? (await db.sessions.where('scheduledWorkoutId').equals(s.id).toArray()).filter((x) => x.status !== 'abandoned' && x.status !== 'in_progress')[0] : undefined
  }, [today])

  if (summaryId) {
    return <SessionSummary sessionId={summaryId} profile={profile} onClose={() => { setSummaryId(null); navigate('/home') }} />
  }
  if (activeQ.loading || schedQ.loading || equipQ.loading || savedQ.loading) return <p className="muted">Loading...</p>
  const active = activeQ.value
  const sched = schedQ.value
  if (active && equipQ.value) {
    return <Player session={active} profile={profile} equipment={equipQ.value} onFinished={(id) => setSummaryId(id)} />
  }
  if (!sched?.workout || sched.status === 'completed' || sched.status === 'skipped') {
    const saved = savedQ.value
    return (
      <>
        <ScreenHeader title="Workout" subtitle="Your workout for today" />
        <EmptyState
          title={sched?.status === 'completed' ? 'Today\'s workout is done' : 'No workout ready'}
          hint={sched?.status === 'completed' ? 'Great job. Rest up.' : 'Choose how much time you have on the Home screen and the app builds one from your equipment and history.'}
        >
          {saved && <Button onClick={() => navigate(`/session/${saved.id}`)}>Review, edit or resume today's workout</Button>}
          <Button variant="ghost" onClick={() => navigate('/home')}>Go to Home</Button>
        </EmptyState>
      </>
    )
  }
  return <Preview scheduledId={sched.id} profile={profile} today={today} />
}

function Preview({ scheduledId, profile, today }: { scheduledId: string; profile: Profile; today: string }) {
  const { navigate } = useRouter()
  const sched = useLiveQuery(() => db.scheduled.get(scheduledId), [scheduledId])
  const equipment = useLiveQuery(() => getEquipment(profile.preferredLocation, profile.weightUnit, profile.gymType), [profile.preferredLocation, profile.weightUnit, profile.gymType])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!sched?.workout) return null
  const w = sched.workout
  const cardio = w.exercises.find((e) => e.kind === 'cardio')
  const options = equipment ? cardioOptions({ level: profile.trainingLevel, available: availableIds(equipment), excludedIds: [] }) : []

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
  const chooseCardio = async (choice: string | undefined) => {
    await setCardioChoice(scheduledId, choice)
    await regenerate(w.availableMinutes, true)
  }
  const start = async () => {
    setBusy(true)
    try { await startSession(scheduledId, profile.weightUnit) } catch (e) { setError(e instanceof Error ? e.message : 'Could not start the workout.') } finally { setBusy(false) }
  }

  return (
    <>
      <ScreenHeader title={w.title} subtitle={w.targetMuscles.map((m) => MUSCLE_LABEL[m]).join(' · ') || 'Cardio'} />
      <Card>
        <p className="big">About {w.estimatedMinutes} min</p>
        <p className="hint">(estimate, you chose {w.availableMinutes})</p>
        {!w.fits && <p className="error" role="alert">This is longer than the time you chose.</p>}
        {w.notes[0] && <p className="lede">{w.notes[0]}</p>}
        {w.notes.length > 1 && (
          <details className="why">
            <summary>Why this workout</summary>
            {w.notes.slice(1).map((n, i) => <p key={i} className="why-note">{n}</p>)}
          </details>
        )}
        <details>
          <summary className="muted">How the time is estimated</summary>
          <ul className="plain">{w.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </details>
        <p className="label-like">Change available minutes</p>
        <DurationPicker value={w.availableMinutes} onChange={(m) => { if (m !== null && m !== w.availableMinutes) void regenerate(m, false) }} />
      </Card>

      <Card title="Muscles" feedback={{ categories: MUSCLE_CATEGORIES, attach: { label: 'The names of the exercises in this workout', data: { exercises: w.exercises.map((e) => e.name) } } }}>
        <WorkoutMuscles exerciseIds={w.exercises.filter((e) => e.kind !== 'cardio').map((e) => e.exerciseId)} onChangePlan={() => navigate('/home')} />
      </Card>

      {w.exercises.map((e, i) => {
        const isCardio = e.kind === 'cardio'
        const act = isCardio ? cardioById(e.exerciseId) : undefined
        const kcal = isCardio && act ? cardioCalories(act, e.durationMinutes ?? 0, profile.weightKg) : null
        return (
          <Card key={e.slotId}>
            <div className="title-row">
              <p className="big">{i + 1}. {e.name}</p>
              {!isCardio && <ExerciseInfo exerciseId={e.exerciseId} name={e.name} cues={e.cues} note={e.loadNote} why={e.why} />}
              {isCardio && act && <CardioInfo name={e.name} steps={act.instructions} />}
            </div>
            {isCardio ? (
              <>
                <p className="muted">{e.durationMinutes} min{e.intensityCue ? ` · ${e.intensityCue}` : ''}</p>
                {kcal && <p className="hint">Roughly {kcal.low} to {kcal.high} calories (an estimate, not a measurement).</p>}
              </>
            ) : (
              <>
                <p className="muted">{e.sets} sets × {e.repMin}-{e.repMax} reps · rest {e.restSeconds}s</p>
                <p>{e.suggestedWeight !== undefined ? <strong>Suggested: {formatWeight(e.suggestedWeight, e.loadUnit ?? profile.weightUnit)}</strong> : <span className="muted">Pick your own starting weight</span>}</p>
                <p className="hint">{e.loadNote}</p>
              </>
            )}
          </Card>
        )
      })}

      {!sched.cardioOnly && (
        <Card title="Cardio">
          {cardio ? (
            <>
              <p className="hint">Cardio is part of this workout. Skip it or swap it for something else.</p>
              <div className="inline">
                <Button variant="small" disabled={busy} onClick={() => void chooseCardio('none')}>Skip cardio</Button>
              </div>
              <div className="field">
                <label htmlFor="cardio-swap">Swap cardio</label>
                <select id="cardio-swap" value={cardio.exerciseId} disabled={busy} onChange={(e) => void chooseCardio(e.target.value)}>
                  {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <p className="hint">{sched.cardioChoice === 'none' ? 'Cardio is skipped for this workout.' : 'No cardio fits this workout.'}</p>
              {sched.cardioChoice === 'none' && <Button variant="small" disabled={busy} onClick={() => void chooseCardio(undefined)}>Add cardio back</Button>}
            </>
          )}
        </Card>
      )}

      {error && <p className="error" role="alert">{error}</p>}
      <Button disabled={busy} onClick={start}>Start workout</Button>
      <Button variant="ghost" disabled={busy} onClick={() => regenerate(w.availableMinutes, true)}>Build a fresh version</Button>
    </>
  )
}

/** Cardio has instructions but no muscle map, so it gets a simple version of the info dialog. */
function CardioInfo({ name, steps }: { name: string; steps: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <InfoButton label={`About ${name}`} expanded={open} onClick={() => setOpen(true)} />
      {open && (
        <Dialog title={name} onClose={() => setOpen(false)}>
          <ol className="steps">{steps.map((t, k) => <li key={k}>{t}</li>)}</ol>
          <div className="notice" role="note"><strong>Safety:</strong> keep a pace where you can still talk. Stop if you feel chest pain, dizziness or unusual shortness of breath.</div>
          <div className="dialog-actions"><button type="button" className="btn" onClick={() => setOpen(false)}>Close</button></div>
        </Dialog>
      )}
    </>
  )
}
