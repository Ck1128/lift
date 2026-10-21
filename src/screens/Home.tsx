import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import {
  addSoreness, changeTrainingLevel, clearSoreness, createExtraWorkout, ensureScheduled, generateFor, getActiveSession, profileGaps,
  recentSoreness, scheduledOn,
} from '../db/repo'
import { formatDay, startOfWeek } from '../engine/dates'
import { ALL_MUSCLES, LEVEL_LABEL, MUSCLE_LABEL, type DayPlan, type Muscle, type Profile } from '../engine/types'
import { Button, Card, ScreenHeader } from '../components/ui'
import { BodyBasicsCard, DurationPicker, LevelDialog } from '../components/HomeParts'
import { useQuery } from '../hooks/app'
import { useRouter } from '../router'

const EXTRA: Record<string, DayPlan> = {
  upper: { focus: 'Upper body (extra)', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  lower: { focus: 'Lower body (extra)', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'core'] },
  full: { focus: 'Full body (extra)', muscles: ['quads', 'chest', 'back', 'shoulders', 'core'] },
  cardio: { focus: 'Cardio', muscles: [], cardioOnly: true },
}

export function Home({ profile, today }: { profile: Profile; today: string }) {
  const { navigate } = useRouter()
  const [minutes, setMinutes] = useState<number | null>(profile.preferredDurationMinutes)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pickExtra, setPickExtra] = useState(false)
  const [levelOpen, setLevelOpen] = useState(false)

  useEffect(() => { void ensureScheduled(today, 14, profile) }, [today, profile])
  const schedQ = useQuery(() => scheduledOn(today), [today])
  const activeQ = useQuery(() => getActiveSession(), [])
  const sched = schedQ.value
  const active = activeQ.value
  const loading = schedQ.loading || activeQ.loading
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const soreness = useLiveQuery(() => recentSoreness(today), [today], {} as Partial<Record<Muscle, 1 | 2 | 3>>)
  const gaps = profileGaps(profile)

  const isTraining = sched && sched.status !== 'skipped'
  const finished = sessions.filter((s) => s.status === 'completed' || s.status === 'partial')
  const thisWeek = finished.filter((s) => startOfWeek(s.date) === startOfWeek(today)).length
  const last = [...finished].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
  const greeting = profile.displayName ? `Hi, ${profile.displayName}` : 'Today'

  const generate = async (id: string) => {
    if (minutes === null) { setMessage('Choose a workout length first.'); return }
    setBusy(true)
    setMessage(null)
    try {
      const r = await generateFor(id, minutes, { today })
      if (r.kind === 'workout') navigate('/workout')
      else setMessage(r.message)
    } finally {
      setBusy(false)
    }
  }

  const trainAnyway = async (key: string) => {
    if (minutes === null) { setMessage('Choose a workout length first.'); return }
    const row = await createExtraWorkout(today, EXTRA[key], minutes)
    setPickExtra(false)
    await generate(row.id)
  }

  return (
    <>
      <ScreenHeader title={greeting} subtitle={formatDay(today)} />

      <Card title="Training level">
        <div className="row">
          <strong>{LEVEL_LABEL[profile.trainingLevel]}</strong>
          <Button variant="small" onClick={() => setLevelOpen(true)}>Change</Button>
        </div>
      </Card>

      {gaps.length > 0 && <BodyBasicsCard profile={profile} />}

      {active && (
        <Card title="Workout in progress">
          <p>{active.title} started {new Date(active.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.</p>
          <Button onClick={() => navigate('/workout')}>Resume workout</Button>
        </Card>
      )}

      {loading && <p className="muted">Loading...</p>}

      {!loading && !active && isTraining && sched && (
        <>
          <Card title="Today's focus">
            <p className="big">{sched.focus}</p>
            <p className="muted">{sched.targetMuscles.map((m) => MUSCLE_LABEL[m]).join(' · ')}</p>
            {sched.status === 'completed' && <p className="ok">Done today. Nice work.</p>}
            {sched.status === 'partial' && <p className="muted">You did part of this workout today.</p>}
          </Card>
          {(sched.status === 'planned' || sched.status === 'partial') && (
            <Card title="How much time do you have?">
              <DurationPicker value={minutes ?? profile.preferredDurationMinutes} onChange={setMinutes} />
              <Button disabled={busy || minutes === null || gaps.length > 0} onClick={() => generate(sched.id)}>
                {sched.workout ? `View / update workout (${minutes ?? '?'} min)` : `Generate workout (${minutes ?? '?'} min)`}
              </Button>
              {message && <p className="error" role="alert">{message}</p>}
            </Card>
          )}
          {sched.status === 'completed' && (
            <Card><Button variant="ghost" onClick={() => navigate('/workout')}>View today's workout</Button></Card>
          )}
        </>
      )}

      {!loading && !active && !isTraining && (
        <Card title="Rest day">
          <p>{sched?.status === 'skipped' ? 'You skipped today\'s workout. That is fine.' : 'Today is a rest day. Recovery is part of training.'}</p>
          {!pickExtra ? (
            <Button variant="ghost" onClick={() => setPickExtra(true)}>I want to train anyway</Button>
          ) : (
            <>
              <p className="muted">How long, and what focus, for an extra session?</p>
              <DurationPicker value={minutes ?? profile.preferredDurationMinutes} onChange={setMinutes} />
              <div className="stack">
                <Button variant="ghost" disabled={gaps.length > 0 || busy} onClick={() => trainAnyway('upper')}>Upper body</Button>
                <Button variant="ghost" disabled={gaps.length > 0 || busy} onClick={() => trainAnyway('lower')}>Lower body</Button>
                <Button variant="ghost" disabled={gaps.length > 0 || busy} onClick={() => trainAnyway('full')}>Full body</Button>
                <Button variant="ghost" disabled={gaps.length > 0 || busy} onClick={() => trainAnyway('cardio')}>Cardio only</Button>
              </div>
              {message && <p className="error" role="alert">{message}</p>}
            </>
          )}
        </Card>
      )}

      <Card title="Yoga">
        <p className="muted">A guided session in 13 styles, for any level. No equipment needed.</p>
        <Button variant="ghost" onClick={() => navigate('/yoga')}>Plan a yoga session</Button>
      </Card>

      <Card title="Feeling sore? (optional)">
        <details>
          <summary>Tell the planner which muscles are sore</summary>
          <p className="hint">Soreness is only used to trim sets for those muscles. It is not a diagnosis. If something hurts or feels wrong, rest and consider asking a qualified professional.</p>
          {ALL_MUSCLES.map((m: Muscle) => (
            <div className="row" key={m}>
              <label htmlFor={`sore-${m}`}>{MUSCLE_LABEL[m]}</label>
              <select
                id={`sore-${m}`}
                value={soreness[m] ?? 0}
                onChange={(e) => { const v = Number(e.target.value); void (v === 0 ? clearSoreness(m, today) : addSoreness(m, v as 1 | 2 | 3, today)) }}
              >
                <option value={0}>Not sore</option>
                <option value={1}>Mild</option>
                <option value={2}>Moderate</option>
                <option value={3}>Very sore</option>
              </select>
            </div>
          ))}
        </details>
      </Card>

      <Card title="Recent progress">
        {finished.length === 0 ? (
          <p className="muted">No workouts saved yet. Finish one and your progress shows up here.</p>
        ) : (
          <>
            <p><strong>{thisWeek}</strong> workout{thisWeek === 1 ? '' : 's'} this week</p>
            {last && <p className="muted">Last: {last.title} on {formatDay(last.date)}</p>}
          </>
        )}
      </Card>

      {levelOpen && (
        <LevelDialog current={profile.trainingLevel} onClose={() => setLevelOpen(false)} onApply={(level, mode) => changeTrainingLevel(level, mode)} />
      )}
    </>
  )
}
