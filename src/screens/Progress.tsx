import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { exerciseById } from '../data/catalog'
import { exerciseTrend, personalRecords, setsPerMuscle, workoutsPerWeek, activeMinutes } from '../engine/history'
import { formatDay } from '../engine/dates'
import { MUSCLE_LABEL, type Profile, type SetLog, type WorkoutSession } from '../engine/types'
import { BarChart, HBars, LineChart } from '../components/Charts'
import { Card, EmptyState, ScreenHeader } from '../components/ui'
import { SessionDetail } from './SessionDetail'

const exName = (id: string) => exerciseById(id)?.name ?? 'Unknown exercise'

export function Progress({ profile, today, openSessionId, onOpenSession }: {
  profile: Profile; today: string; openSessionId: string | null; onOpenSession: (id: string | null) => void
}) {
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [] as WorkoutSession[])
  const logs = useLiveQuery(() => db.setLogs.toArray(), [], [] as SetLog[])
  const weights = useLiveQuery(() => db.bodyWeights.toArray(), [], [])
  const [days, setDays] = useState<7 | 30>(7)
  const [exFilter, setExFilter] = useState('')
  const [month, setMonth] = useState('')
  const [trendEx, setTrendEx] = useState('')

  const finished = useMemo(() => sessions.filter((s) => s.status === 'completed' || s.status === 'partial'), [sessions])
  const loggedExercises = useMemo(
    () => [...new Set(logs.filter((l) => l.completed).map((l) => l.exerciseId))].sort((a, b) => exName(a).localeCompare(exName(b))),
    [logs],
  )

  if (openSessionId) return <SessionDetail sessionId={openSessionId} profile={profile} onBack={() => onOpenSession(null)} />

  if (finished.length === 0) {
    return (
      <>
        <ScreenHeader title="Progress" subtitle="Your training history" />
        <EmptyState title="Nothing to show yet" hint="Finish a workout and your history, weekly counts and strength trends will appear here. Everything is calculated from what you log." />
        {sessions.filter((s) => s.status === 'abandoned').length > 0 && <p className="hint">Discarded workouts are not counted.</p>}
      </>
    )
  }

  const weekly = workoutsPerWeek(sessions, today, 8)
  const perMuscle = setsPerMuscle(sessions, logs, today, days, (id) => exerciseById(id)?.primaryMuscles ?? [])
  const muscleRows = Object.entries(perMuscle).map(([m, v]) => ({ label: MUSCLE_LABEL[m as keyof typeof MUSCLE_LABEL], value: v ?? 0 })).sort((a, b) => b.value - a.value)
  const chosen = trendEx || loggedExercises[0]
  const trend = chosen ? exerciseTrend(chosen, sessions, logs) : []
  const records = personalRecords(sessions, logs).sort((a, b) => b.weight - a.weight).slice(0, 8)
  const history = [...sessions]
    .filter((s) => s.status !== 'in_progress')
    .filter((s) => !month || s.date.startsWith(month))
    .filter((s) => !exFilter || logs.some((l) => l.sessionId === s.id && l.exerciseId === exFilter && l.completed))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const bw = [...weights].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <>
      <ScreenHeader title="Progress" subtitle="Calculated from the workouts you saved" />

      <Card title="Workouts per week">
        <p className="hint">Completed or partly completed workouts, last 8 weeks.</p>
        <BarChart label="Workouts per week" data={weekly.map((w) => ({ label: `${Number(w.weekStart.slice(5, 7))}/${Number(w.weekStart.slice(8))}`, value: w.count }))} />
      </Card>

      <Card title="Sets per muscle group">
        <p className="hint">Completed sets by the main muscle each exercise works.</p>
        <div className="chips" role="group" aria-label="Period">
          {([7, 30] as const).map((d) => <button key={d} type="button" className={days === d ? 'chip on' : 'chip'} aria-pressed={days === d} onClick={() => setDays(d)}>Last {d} days</button>)}
        </div>
        {muscleRows.length ? <HBars rows={muscleRows} /> : <p className="muted">No completed sets in this period.</p>}
      </Card>

      <Card title="Exercise trend">
        <p className="hint">Heaviest weight you lifted each session.</p>
        <select aria-label="Exercise" value={chosen} onChange={(e) => setTrendEx(e.target.value)}>
          {loggedExercises.map((id) => <option key={id} value={id}>{exName(id)}</option>)}
        </select>
        <LineChart label={`Top weight trend for ${chosen ? exName(chosen) : ''}`} unit={trend[0]?.unit ?? profile.weightUnit} points={trend.map((t) => ({ x: t.date.slice(5), y: t.topWeight }))} />
      </Card>

      <Card title="Personal records">
        <p className="hint">Heaviest completed set for each exercise (same unit). A record only means you lifted that weight, nothing more.</p>
        {records.length === 0 ? <p className="muted">Add weights to your sets to see records.</p> : (
          <ul className="plain">{records.map((r) => <li key={r.exerciseId + r.unit}>{exName(r.exerciseId)}: {r.weight} {r.unit} × {r.reps} ({r.date})</li>)}</ul>
        )}
      </Card>

      {bw.length > 0 && (
        <Card title="Body weight">
          <p className="hint">Entries are added when you change your weight in Settings.</p>
          <LineChart label="Body weight history" unit={bw[0].unit} points={bw.map((b) => ({ x: b.date.slice(5), y: b.value }))} />
        </Card>
      )}

      <Card title="History">
        <div className="field"><label htmlFor="f-month">Month</label><input id="f-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
        <div className="field">
          <label htmlFor="f-ex">Exercise</label>
          <select id="f-ex" value={exFilter} onChange={(e) => setExFilter(e.target.value)}>
            <option value="">All exercises</option>
            {loggedExercises.map((id) => <option key={id} value={id}>{exName(id)}</option>)}
          </select>
        </div>
        {history.length === 0 && <p className="muted">No workouts match.</p>}
        <ul className="history">
          {history.map((s) => (
            <li key={s.id}>
              <button type="button" className="alt" onClick={() => onOpenSession(s.id)}>
                <strong>{s.title}</strong>
                <span className="muted">{formatDay(s.date)} · {s.status === 'completed' ? 'Completed' : s.status === 'partial' ? 'Partly done' : 'Abandoned'} · {activeMinutes(s)} min</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
