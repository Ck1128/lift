import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { addSoreness, clearSoreness, createExtraWorkout, ensureScheduled, generateFor, getActiveSession, recentSoreness, scheduledOn } from '../db/repo'
import { formatDay, startOfWeek } from '../engine/dates'
import { ALL_MUSCLES, MUSCLE_LABEL, type DayPlan, type Muscle, type Profile } from '../engine/types'
import { Button, Card, Chips, ScreenHeader } from '../components/ui'
import { useQuery } from '../hooks/app'
import type { ScreenId } from '../components/BottomNav'

const DURATIONS: readonly number[] = [20, 30, 45, 60]
const EXTRA: Record<string, DayPlan> = {
  upper: { focus: 'Upper body (extra)', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  lower: { focus: 'Lower body (extra)', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'core'] },
  full: { focus: 'Full body (extra)', muscles: ['quads', 'chest', 'back', 'shoulders', 'core'] },
}

export function Home({ profile, today, onNavigate }: { profile: Profile; today: string; onNavigate: (id: ScreenId) => void }) {
  const [minutes, setMinutes] = useState<number>(profile.preferredDurationMinutes)
  const [custom, setCustom] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pickExtra, setPickExtra] = useState(false)

  useEffect(() => { void ensureScheduled(today, 14, profile) }, [today, profile])
  const schedQ = useQuery(() => scheduledOn(today), [today])
  const activeQ = useQuery(() => getActiveSession(), [])
  const sched = schedQ.value
  const active = activeQ.value
  const loading = schedQ.loading || activeQ.loading
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const soreness = useLiveQuery(() => recentSoreness(today), [today], {} as Partial<Record<Muscle, 1 | 2 | 3>>)

  const isTraining = sched && sched.status !== 'skipped'
  const finished = sessions.filter((s) => s.status === 'completed' || s.status === 'partial')
  const thisWeek = finished.filter((s) => startOfWeek(s.date) === startOfWeek(today)).length
  const last = [...finished].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
  const greeting = profile.displayName ? `Hi, ${profile.displayName}` : 'Today'

  const effectiveMinutes = custom.trim() !== '' ? Number(custom) : minutes

  const generate = async (id: string) => {
    setBusy(true)
    setMessage(null)
    try {
      const r = await generateFor(id, effectiveMinutes, { today })
      if (r.kind === 'workout') onNavigate('workout')
      else setMessage(r.message)
    } finally {
      setBusy(false)
    }
  }

  const trainAnyway = async (key: string) => {
    const row = await createExtraWorkout(today, EXTRA[key], effectiveMinutes)
    setPickExtra(false)
    await generate(row.id)
  }

  return (
    <>
      <ScreenHeader title={greeting} subtitle={formatDay(today)} />

      {active && (
        <Card title="Workout in progress">
          <p>{active.title} started {new Date(active.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.</p>
          <Button onClick={() => onNavigate('workout')}>Resume workout</Button>
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
              <Chips label="Available minutes" options={DURATIONS} value={custom ? -1 : minutes} onChange={(v) => { setMinutes(v); setCustom('') }} format={(v) => `${v} min`} />
              <div className="field">
                <label htmlFor="custom-min">Or enter minutes</label>
                <input id="custom-min" inputMode="numeric" placeholder="e.g. 50" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))} />
              </div>
              <Button disabled={busy} onClick={() => generate(sched.id)}>
                {sched.workout ? `View / update workout (${effectiveMinutes} min)` : `Generate workout (${effectiveMinutes} min)`}
              </Button>
              {message && <p className="error" role="alert">{message}</p>}
            </Card>
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
              <p className="muted">Choose a focus for an extra session:</p>
              <div className="stack">
                <Button variant="ghost" onClick={() => trainAnyway('upper')}>Upper body</Button>
                <Button variant="ghost" onClick={() => trainAnyway('lower')}>Lower body</Button>
                <Button variant="ghost" onClick={() => trainAnyway('full')}>Full body</Button>
              </div>
              {message && <p className="error" role="alert">{message}</p>}
            </>
          )}
        </Card>
      )}

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
    </>
  )
}
