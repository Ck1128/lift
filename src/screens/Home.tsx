import { useEffect, useState } from 'react'
import { useT } from '../i18n'
import { TrackSwitch } from '../components/TrackSwitch'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import {
  changeTrainingLevel, ensureScheduled, getActiveSession, profileGaps, scheduledOn,
} from '../db/repo'
import { addDays, formatDay, startOfWeek, WEEKDAY_NAMES } from '../engine/dates'
import { activeMinutes, weekStreak } from '../engine/history'
import { LEVEL_LABEL, type Profile } from '../engine/types'
import { tracksOf } from '../engine/tracks'
import { Button, Card, Loading, ScreenHeader } from '../components/ui'
import { BodyBasicsCard, LevelDialog } from '../components/HomeParts'
import { TodaysCall } from '../components/TodaysCall'
import { ProgramPicker } from '../components/ProgramPicker'
import { SorenessMeter } from '../components/SorenessMeter'
import { InjuredAreas } from '../components/InjuredAreas'
import { useQuery } from '../hooks/app'
import { useRouter } from '../router'
import { ensureStories, getSeen, listStories } from '../db/storyRepo'

export function Home({ profile, today }: { profile: Profile; today: string }) {
  const { navigate } = useRouter()
  const t = useT()
  const tracks = tracksOf(profile)
  const [minutes, setMinutes] = useState<number | null>(profile.preferredDurationMinutes)
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
  const gaps = profileGaps(profile)
  // A finished weekly or monthly Body Story is saved the first time the app opens after Sunday or month-end.
  useEffect(() => { void ensureStories(today) }, [today])
  const stories = useLiveQuery(() => listStories(), [], [])
  const seen = useLiveQuery(() => getSeen(), [], [] as string[])
  const unseen = stories.filter((s) => !seen.includes(s.id))

  const week = startOfWeek(today)
  const finished = sessions.filter((s) => s.status === 'completed' || s.status === 'partial')
  const thisWeek = finished.filter((s) => startOfWeek(s.date) === week).length
  const last = [...finished].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
  const plannedThisWeek = weekRows.filter((r) => startOfWeek(r.date) === week && r.status !== 'skipped').length
  const minutesThisWeek = finished.filter((s) => startOfWeek(s.date) === week).reduce((a, s) => a + activeMinutes(s), 0)
  const streak = weekStreak(sessions, today)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(week, i)
    const done = finished.some((s) => s.date === date)
    const planned = weekRows.some((r) => r.date === date && r.status === 'planned')
    const state = done ? 'done' : planned ? (date < today ? 'missed' : 'planned') : 'rest'
    return { date, name: WEEKDAY_NAMES[i], state, label: done ? 'workout done' : planned ? (date < today ? 'planned, not done' : 'workout planned') : 'no workout' }
  })
  const yogaDone = yogaSessions.filter((y) => (y.status === 'completed' || y.status === 'partial') && startOfWeek(y.date) === week)
  const yogaMinutes = Math.round(yogaDone.reduce((a, y) => a + y.durationSeconds, 0) / 60)
  const yogaActive = yogaSessions.find((y) => y.status === 'in_progress')
  const greeting = profile.displayName ? `${t('Hi')}, ${profile.displayName}` : 'Today'

  const yogaCard = (primary: boolean) => (
    <Card title="Yoga" className={primary ? 'hero' : ''}>
      <TrackSwitch track="yoga" on label="Yoga" offNote="" />
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
      {tracks.workout && <ProgramPicker today={today} />}

      {gaps.length > 0 && <BodyBasicsCard profile={profile} />}

      {/* ---- Today's call: the first thing you see ---- */}
      {!loading && <TodaysCall profile={profile} today={today} sched={sched} minutes={minutes} setMinutes={setMinutes} blocked={gaps.length > 0} />}

      {loading && <Loading label="Loading today" />}

      {/* ---- soreness: shapes the card above as soon as it is saved ---- */}
      {tracks.workout && !loading && <SorenessMeter today={today} />}

      {/* ---- the one main thing for today ---- */}
      {!tracks.workout && yogaCard(true)}

      {tracks.workout && !loading && active && (
        <Card title="Workout in progress" className="hero">
          <p className="big">{active.title}</p>
          <p className="muted">Started {new Date(active.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.</p>
          <Button onClick={() => navigate('/workout')}>Resume workout</Button>
        </Card>
      )}

      {tracks.workout && !loading && !active && sched?.status === 'completed' && (
        <Card className="hero">
          <p className="eyebrow">{t("Today's focus")}</p>
          <p className="hero-title">{sched.focus}</p>
          <p className="ok">{t('Done today. Nice work.')}</p>
          <Button variant="ghost" onClick={() => navigate('/workout')}>View today's workout</Button>
        </Card>
      )}

      {tracks.workout && tracks.yoga && yogaCard(false)}

      {!tracks.yoga && (
        <TrackSwitch track="yoga" on={false} label="Yoga" offNote="Off. Your history is kept." />
      )}
      {!tracks.workout && (
        <TrackSwitch track="workout" on={false} label="Workouts" offNote="Off. Your history is kept." />
      )}

      {/* ---- progress ---- */}
      <Card title="This week">
        {tracks.workout && (
          <div className="stat">
            <ol className="week-strip" aria-label="This week, day by day">
              {weekDays.map((d) => (
                <li key={d.date} className={`wd ${d.state}${d.date === today ? ' now' : ''}`} aria-label={`${d.name}: ${d.label}${d.date === today ? ' (today)' : ''}`}>
                  <span className="wd-l" aria-hidden="true">{d.name.slice(0, 1)}</span>
                  <span className="wd-dot" aria-hidden="true">{d.state === 'done' ? '✓' : ''}</span>
                </li>
              ))}
            </ol>
            <div className="kpis">
              <div className="kpi"><strong className="kpi-num">{thisWeek}</strong><span>{plannedThisWeek > 0 ? `of ${Math.max(plannedThisWeek, thisWeek)} ` : ''}workout{thisWeek === 1 && plannedThisWeek === 0 ? '' : 's'}</span></div>
              <div className="kpi"><strong className="kpi-num">{minutesThisWeek}</strong><span>min trained</span></div>
              <div className="kpi"><strong className="kpi-num">{streak}</strong><span>week streak</span></div>
            </div>
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

      <Card title="Body Story">
        {unseen.length > 0 ? (
          <p><strong>Your {unseen[0].kind === 'week' ? 'weekly' : 'monthly'} story is ready:</strong> {unseen[0].title}.</p>
        ) : (
          <p className="muted">Your week and month in plain words. A new one is saved each Sunday and on the last day of the month.</p>
        )}
        <Button variant={unseen.length > 0 ? 'primary' : 'ghost'} onClick={() => navigate('/story')}>{unseen.length > 0 ? 'View my Body Story' : 'Open Body Story'}</Button>
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
          <details className="optional">
            <summary>Injured or recovering? {(profile.injuredMuscles ?? []).length > 0 ? `(${(profile.injuredMuscles ?? []).length})` : '(optional)'}</summary>
            <InjuredAreas profile={profile} />
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
