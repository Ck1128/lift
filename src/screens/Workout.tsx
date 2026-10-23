import { useLayoutEffect, useState } from 'react'
import { PainCheck } from '../components/PainCheck'
import { ConfirmButton } from '../components/confirm'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { generateFor, getEquipment, getPain, scheduledOn, setCardioChoice, startSession } from '../db/repo'
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

/** The route stays /workout while the preview becomes the player, so the page must be sent back to the top by hand. */
function useScrollTopOn(key: string) {
  useLayoutEffect(() => {
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [key])
}

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

  const view = summaryId ? `summary:${summaryId}` : activeQ.value ? `play:${activeQ.value.id}` : 'preview'
  useScrollTopOn(view)
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
  const pain = useLiveQuery(() => getPain(today), [today])
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
  const resuming = sched.status === 'partial'
  // The pain check comes before every fresh workout. Continuing a workout you already began does not need it again.
  const painAnswered = pain !== undefined && pain !== null
  const startNew = async () => {
    setBusy(true)
    setError(null)
    try {
      const r = await generateFor(scheduledId, w.availableMinutes, { today, force: true })
      if (r.kind !== 'workout') { setError(r.message); return }
      await startSession(scheduledId, profile.weightUnit)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start the workout.') } finally { setBusy(false) }
  }
  const start = async () => {
    setBusy(true)
    try { await startSession(scheduledId, profile.weightUnit) } catch (e) { setError(e instanceof Error ? e.message : 'Could not start the workout.') } finally { setBusy(false) }
  }

  return (
    <div className="preview">
      <ScreenHeader title={w.title} subtitle={w.targetMuscles.map((m) => MUSCLE_LABEL[m]).join(' · ') || 'Cardio'} />
      {!resuming && <PainCheck today={today} profile={profile} onSaved={() => regenerate(w.availableMinutes, false)} />}
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
        <details><summary>Show the muscles this works</summary>
        <WorkoutMuscles exerciseIds={w.exercises.filter((e) => e.kind !== 'cardio').map((e) => e.exerciseId)} onChangePlan={() => navigate('/home')} />
        </details>
      </Card>

      <Card title="Your exercises">
        <ol className="ex-list">
          {w.exercises.map((e, i) => {
            const isCardio = e.kind === 'cardio'
            const act = isCardio ? cardioById(e.exerciseId) : undefined
            const kcal = isCardio && act ? cardioCalories(act, e.durationMinutes ?? 0, profile.weightKg) : null
            return (
              <li key={e.slotId} className="ex-row">
                <div className="title-row">
                  <p className="big"><span className="ex-n">{i + 1}</span> {e.name}</p>
                  {!isCardio && <ExerciseInfo exerciseId={e.exerciseId} name={e.name} cues={e.cues} note={e.loadNote} why={e.why} />}
                  {isCardio && act && <CardioInfo name={e.name} steps={act.instructions} />}
                </div>
                {isCardio ? (
                  <p className="muted">{e.durationMinutes} min{e.intensityCue ? ` · ${e.intensityCue}` : ''}{kcal ? ` · roughly ${kcal.low} to ${kcal.high} calories (an estimate)` : ''}</p>
                ) : (
                  <>
                    <p className="muted">{e.sets} × {e.repMin}-{e.repMax} · rest {e.restSeconds}s · {e.suggestedWeight !== undefined ? <strong>Suggested: {formatWeight(e.suggestedWeight, e.loadUnit ?? profile.weightUnit)}</strong> : 'Pick your own starting weight'}</p>
                    {e.loadNote && <details className="ex-more"><summary>Why this weight</summary><p className="hint">{e.loadNote}</p></details>}
                  </>
                )}
              </li>
            )
          })}
        </ol>
      </Card>

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
      {resuming ? (
        <div className="start-bar" role="region" aria-label="Start">
          <ConfirmButton disabled={busy} confirm={{ title: 'Continue your workout?', message: 'It reopens with the sets you already did.' }} onConfirm={start}>Continue my workout</ConfirmButton>
          <ConfirmButton variant="ghost" disabled={busy} confirm={{ title: 'Start a new workout?', message: 'Every set starts blank. The workout you did stays in your history.' }} onConfirm={startNew}>New</ConfirmButton>
        </div>
      ) : (
        <>
          <ConfirmButton variant="ghost" disabled={busy} confirm={{ title: 'Build a fresh version?', message: 'The exercises shown here are replaced with a new set.' }} onConfirm={() => regenerate(w.availableMinutes, true)}>Build a fresh version</ConfirmButton>
          <div className="start-bar" role="region" aria-label="Start">
            {painAnswered
              ? <ConfirmButton disabled={busy} confirm={{ title: 'Start this workout?', message: 'The timer starts now.' }} onConfirm={start}>Start workout</ConfirmButton>
              : <Button onClick={() => document.querySelector('.pain-check')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Start workout</Button>}
            {!painAnswered && <p className="start-hint" role="status">Answer the pain check first</p>}
          </div>
        </>
      )}
    </div>
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
