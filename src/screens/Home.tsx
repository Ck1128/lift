import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import {
  addSoreness, changeTrainingLevel, clearSoreness, createExtraWorkout, ensureScheduled, generateFor, getActiveSession, profileGaps,
  recentSoreness, scheduledOn, setTrack,
} from '../db/repo'
import { formatDay, startOfWeek } from '../engine/dates'
import { ALL_MUSCLES, LEVEL_LABEL, MUSCLE_LABEL, type DayPlan, type Muscle, type Profile } from '../engine/types'
import { tracksOf } from '../engine/tracks'
import { Button, Card, Loading, ProgressBar, ScreenHeader } from '../components/ui'
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
  const tracks = tracksOf(profile)
  const [minutes, setMinutes] = useState<number | null>(profile.preferredDurationMinutes)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pickExtra, setPickExtra] = useState(false)
  const [levelOpen, setLevelOpen] = useState(false)

  useEffect(() => { if (tracks.workout) void ensureScheduled(today, 14, profile) }, [today, profile, tracks.workout])
  const schedQ = useQuery(() => scheduledOn(today), [today])
  const activeQ = useQuery(() => getActiveSession(), [])
  const sched = tracks.workout ? schedQ.value : null
  const active = tracks.workout ? activeQ.value : null
  const loading = tracks.workout && (schedQ.loading || activeQ.loading)
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const yogaSessions = useLiveQuery(() => db.yogaSessions.toArray(), [], [])
  const weekRows = useLiveQuery(() => db.scheduled.toArray(), [], [])
  const soreness = useLiveQuery(() => recentSoreness(today), [today], {} as Partial<Record<Muscle, 1 | 2 | 3>>)
  const gaps = profileGaps(profile)

  const isTraining = sched && sched.status !== 'skipped'
  const week = startOfWeek(today)
  const finished = sessions.filter((s) => s.status === 'completed' || s.status === 'partial')
  const thisWeek = finished.filter((s) => startOfWeek(s.date) === week).length
  const last = [...finished].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
  const plannedThisWeek = weekRows.filter((r) => startOfWeek(r.date) === week && r.status !== 'skipped').length
  const yogaDone = yogaSessions.filter((y) => (y.status === 'completed' || y.status === 'partial') && startOfWeek(y.date) === week)
  const yogaMinutes = Math.round(yogaDone.reduce((a, y) => a + y.durationSeconds, 0) / 60)
  const yogaActive = yogaSessions.find((y) => y.status === 'in_progress')
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

  const yogaCard = (primary: boolean) => (
    <Card title="Yoga" className={primary ? 'hero' : ''}>
      {yogaActive ? (
        <>
          <p className="muted">{yogaActive.styleName} is in progress.</p>
          <Button onClick={() => navigate(`/yoga/session/${yogaActive.id}`)}>Resume yoga session</Button>
        </>
      ) : (
        <>
          <p className="muted">{primary ? 'A guided session in 13 styles, for any level. No equipment needed.' : 'A guided session, any level, no equipment needed.'}</p>
          <Button variant={primary ? 'primary' : 'ghost'} onClick={() => navigate('/yoga')}>Plan a yoga session</Button>
        </>
      )}
    </Card>
  )

  return (
    <>
      <ScreenHeader title={greeting} subtitle={formatDay(today)} />

      {gaps.length > 0 && <BodyBasicsCard profile={profile} />}

      {loading && <Loading label="Loading today" />}

      {/* ---- the one main thing for today ---- */}
      {!tracks.workout && yogaCard(true)}

      {tracks.workout && !loading && active && (
        <Card title="Workout in progress" className="hero">
          <p className="big">{active.title}</p>
          <p className="muted">Started {new Date(active.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.</p>
          <Button onClick={() => navigate('/workout')}>Resume workout</Button>
        </Card>
      )}

      {tracks.workout && !loading && !active && isTraining && sched && (
        <Card className="hero">
          <p className="eyebrow">Today's focus</p>
          <p className="hero-title">{sched.focus}</p>
          <p className="muted">{sched.targetMuscles.map((m) => MUSCLE_LABEL[m]).join(' · ')}</p>
          {sched.status === 'completed' && <p className="ok">Done today. Nice work.</p>}
          {sched.status === 'partial' && <p className="muted">You did part of this workout today.</p>}
          {(sched.status === 'planned' || sched.status === 'partial') && (
            <>
              <p className="label-like">How much time do you have?</p>
              <DurationPicker value={minutes ?? profile.preferredDurationMinutes} onChange={setMinutes} />
              <Button disabled={busy || minutes === null || gaps.length > 0} onClick={() => generate(sched.id)}>
                {sched.workout ? `View / update workout (${minutes ?? '?'} min)` : `Generate workout (${minutes ?? '?'} min)`}
              </Button>
              {message && <p className="error" role="alert">{message}</p>}
            </>
          )}
          {sched.status === 'completed' && <Button variant="ghost" onClick={() => navigate('/workout')}>View today's workout</Button>}
        </Card>
      )}

      {tracks.workout && !loading && !active && !isTraining && (
        <Card title="Rest day" className="hero">
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

      {tracks.workout && tracks.yoga && yogaCard(false)}

      {!tracks.yoga && (
        <p className="quiet-row">Yoga is off. Your history is kept. <button type="button" className="link-btn" aria-label="Turn on Yoga" onClick={() => void setTrack('yoga', true)}>Turn on</button></p>
      )}
      {!tracks.workout && (
        <p className="quiet-row">Workouts are off. Your history is kept. <button type="button" className="link-btn" aria-label="Turn on Workouts" onClick={() => void setTrack('workout', true)}>Turn on</button></p>
      )}

      {/* ---- progress ---- */}
      <Card title="This week">
        {tracks.workout && (
          <div className="stat">
            <div className="row"><span><strong>{thisWeek}</strong>{plannedThisWeek > 0 ? ` of ${Math.max(plannedThisWeek, thisWeek)}` : ''} workout{thisWeek === 1 ? '' : 's'}</span></div>
            {plannedThisWeek > 0 && <ProgressBar value={thisWeek} max={Math.max(plannedThisWeek, thisWeek)} label="Workouts this week" />}
            {last ? <p className="hint">Last: {last.title} on {formatDay(last.date)}</p> : <p className="hint">No workouts saved yet. Finish one and your progress shows up here.</p>}
          </div>
        )}
        {tracks.yoga && (
          <div className="stat">
            <div className="row"><span><strong>{yogaDone.length}</strong> yoga session{yogaDone.length === 1 ? '' : 's'}{yogaMinutes > 0 ? ` · ${yogaMinutes} min` : ''}</span></div>
            {yogaDone.length === 0 && <p className="hint">Your yoga sessions show up here.</p>}
          </div>
        )}
      </Card>

      {/* ---- adjust (kept small and out of the way) ---- */}
      <Card title="Adjust">
        {tracks.workout && (
          <div className="row">
            <span>Training level: <strong>{LEVEL_LABEL[profile.trainingLevel]}</strong></span>
            <Button variant="small" onClick={() => setLevelOpen(true)}>Change</Button>
          </div>
        )}
        {tracks.workout && (
          <details>
            <summary>Feeling sore? (optional)</summary>
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
        )}
        <div className="row">
          <span className="muted">Food log (optional)</span>
          <Button variant="small" onClick={() => navigate('/food')}>Open</Button>
        </div>
      </Card>

      {levelOpen && (
        <LevelDialog current={profile.trainingLevel} onClose={() => setLevelOpen(false)} onApply={(level, mode) => changeTrainingLevel(level, mode)} />
      )}
    </>
  )
}
