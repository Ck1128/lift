import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { exerciseById } from '../data/catalog'
import { exerciseTrend, personalRecords, setsPerMuscle, workoutsPerWeek, activeMinutes } from '../engine/history'
import { formatDay } from '../engine/dates'
import {
  bodyWeightSeries, buildExport, CATEGORY_LABEL, exportFilename, foodKcalByDay, inRange, rangeFor, RANGE_LABEL, toCsv, yogaMinutesByDay,
  type Category, type RangeKey,
} from '../engine/progress'
import { MUSCLE_LABEL, type Profile, type SetLog, type WorkoutSession } from '../engine/types'
import type { YogaSession } from '../engine/yoga'
import type { FoodLogEntry } from '../engine/food'
import { BarChart, ChartBlock, HBars, LineChart } from '../components/Charts'
import { Button, Card, EmptyState, ScreenHeader } from '../components/ui'
import { RecoveryView } from '../components/RecoveryView'
import { deliverFile } from '../export/deliver'
import { useRouter } from '../router'

const exName = (id: string) => exerciseById(id)?.name ?? 'Unknown exercise'
const ALL_CATEGORIES: Category[] = ['workouts', 'yoga', 'food', 'bodyweight']
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`

/** Results (charts and history) and Recovery (muscle map) share one tab. */
export function Progress({ profile, today }: { profile: Profile; today: string }) {
  const [tab, setTab] = useState<'results' | 'recovery'>('results')
  const { navigate } = useRouter()
  return (
    <>
      <ScreenHeader title="Health & Fitness Progress" subtitle={tab === 'results' ? 'History, charts and exports' : 'Which muscles are ready to train'} />
      <div className="seg" role="group" aria-label="Progress view">
        <button type="button" aria-pressed={tab === 'results'} onClick={() => setTab('results')}>Results</button>
        <button type="button" aria-pressed={tab === 'recovery'} onClick={() => setTab('recovery')}>Recovery</button>
      </div>
      {tab === 'results' ? <ProgressResults profile={profile} today={today} /> : <RecoveryView onGoToWorkouts={() => navigate('/home')} />}
    </>
  )
}

function ProgressResults({ profile, today }: { profile: Profile; today: string }) {
  const { navigate } = useRouter()
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [] as WorkoutSession[])
  const logs = useLiveQuery(() => db.setLogs.toArray(), [], [] as SetLog[])
  const weights = useLiveQuery(() => db.bodyWeights.toArray(), [], [])
  const yoga = useLiveQuery(() => db.yogaSessions.toArray(), [], [] as YogaSession[])
  const food = useLiveQuery(() => db.foodLog.toArray(), [], [] as FoodLogEntry[])
  const [rangeKey, setRangeKey] = useState<RangeKey>('30')
  const [shown, setShown] = useState<Category[]>(ALL_CATEGORIES)
  const [exFilter, setExFilter] = useState('')
  const [month, setMonth] = useState('')
  const [trendEx, setTrendEx] = useState('')
  const [exportCats, setExportCats] = useState<Category[]>(['workouts', 'yoga', 'bodyweight'])
  const [exportMsg, setExportMsg] = useState('')

  const range = rangeFor(today, rangeKey)
  const unit = profile.weightUnit
  const finished = useMemo(() => sessions.filter((s) => s.status === 'completed' || s.status === 'partial'), [sessions])
  const loggedExercises = useMemo(
    () => [...new Set(logs.filter((l) => l.completed && l.actualReps !== undefined).map((l) => l.exerciseId))].sort((a, b) => exName(a).localeCompare(exName(b))),
    [logs],
  )
  const toggle = (c: Category, list: Category[], set: (l: Category[]) => void) => set(list.includes(c) ? list.filter((x) => x !== c) : [...list, c])

  const hasAnything = finished.length > 0 || yoga.some((y) => y.status !== 'abandoned') || food.length > 0 || weights.length > 0
  if (!hasAnything) {
    return (
      <>
          <EmptyState title="Nothing to show yet" hint="Finish a workout or a yoga session, log some food, or add your body weight, and your history and charts appear here. Everything is calculated from what you log." />
      </>
    )
  }

  const days = rangeKey === 'all' ? 3650 : Number(rangeKey)
  const weekly = workoutsPerWeek(sessions, today, 8)
  const perMuscle = setsPerMuscle(sessions, logs, today, days, (id) => exerciseById(id)?.primaryMuscles ?? [])
  const muscleRows = Object.entries(perMuscle).map(([m, v]) => ({ label: MUSCLE_LABEL[m as keyof typeof MUSCLE_LABEL], value: v ?? 0 })).sort((a, b) => b.value - a.value)
  const chosen = trendEx || loggedExercises[0]
  const trend = chosen ? exerciseTrend(chosen, finished.filter((s) => inRange(s.date, range)), logs, unit) : []
  const records = personalRecords(finished.filter((s) => inRange(s.date, range)), logs, unit).sort((a, b) => b.weight - a.weight).slice(0, 8)
  const yogaPts = yogaMinutesByDay(yoga, range)
  const foodPts = foodKcalByDay(food, range)
  const bwPts = bodyWeightSeries(weights, range, unit)
  const on = (c: Category) => shown.includes(c)

  type Row = { id: string; kind: 'workout' | 'yoga'; title: string; date: string; label: string; startedAt: string }
  const historyRows: Row[] = [
    ...(on('workouts') ? sessions.filter((s) => s.status !== 'in_progress').map((s): Row => ({
      id: s.id, kind: 'workout', title: s.title, date: s.date, startedAt: s.startedAt,
      label: `${s.status === 'completed' ? 'Completed' : s.status === 'partial' ? 'Partly done' : 'Abandoned'} · ${activeMinutes(s)} min`,
    })) : []),
    ...(on('yoga') ? yoga.filter((s) => s.status !== 'in_progress').map((s): Row => ({
      id: s.id, kind: 'yoga', title: `Yoga: ${s.styleName}`, date: s.date, startedAt: s.startedAt,
      label: `${s.status === 'completed' ? 'Completed' : s.status === 'partial' ? 'Partly done' : 'Discarded'} · ${Math.round(s.durationSeconds / 60)} min`,
    })) : []),
  ]
    .filter((r) => inRange(r.date, range))
    .filter((r) => !month || r.date.startsWith(month))
    .filter((r) => !exFilter || (r.kind === 'workout' && logs.some((l) => l.sessionId === r.id && l.exerciseId === exFilter && l.completed)))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))

  const data = () => buildExport({ range, categories: exportCats, unit, sessions, logs, yoga, food, weights, exerciseName: exName, now: new Date().toISOString() })
  const doExport = async (kind: 'csv' | 'json') => {
    setExportMsg('')
    if (exportCats.length === 0) return setExportMsg('Choose at least one thing to export.')
    const d = data()
    const text = kind === 'csv' ? toCsv(d) : JSON.stringify(d, null, 2)
    const r = await deliverFile(exportFilename(kind, today), text, kind === 'csv' ? 'text/csv' : 'application/json')
    setExportMsg(r === 'cancelled' ? 'Cancelled. Nothing was changed.' : r === 'shared' ? 'Shared.' : 'Saved to your downloads.')
  }

  return (
    <>

      <Card title="Show">
        <div role="group" aria-label="Date range" className="chips">
          {(Object.keys(RANGE_LABEL) as RangeKey[]).map((k) => (
            <button key={k} type="button" className={rangeKey === k ? 'chip on' : 'chip'} aria-pressed={rangeKey === k} onClick={() => setRangeKey(k)}>{RANGE_LABEL[k]}</button>
          ))}
        </div>
        <div role="group" aria-label="Categories" className="chips">
          {ALL_CATEGORIES.map((c) => (
            <button key={c} type="button" className={on(c) ? 'chip on' : 'chip'} aria-pressed={on(c)} onClick={() => toggle(c, shown, setShown)}>{CATEGORY_LABEL[c]}</button>
          ))}
        </div>
        <p className="hint">Days with nothing logged are left out of the charts. They are not counted as zero.</p>
      </Card>

      {on('workouts') && (
        <>
          <Card title="Workouts per week">
            <p className="hint">Completed or partly completed workouts, last 8 weeks.</p>
            <ChartBlock title="Workouts per week" columns={['Week of', 'Workouts']} rows={weekly.map((w) => [w.weekStart, w.count])}>
              <BarChart label="Workouts per week" data={weekly.map((w) => ({ label: md(w.weekStart), value: w.count }))} />
            </ChartBlock>
          </Card>
          <Card title="Sets per muscle group">
            <p className="hint">Completed sets by the main muscle each exercise works, {RANGE_LABEL[rangeKey].toLowerCase()}.</p>
            {muscleRows.length ? (
              <ChartBlock title="Sets per muscle group" columns={['Muscle', 'Sets']} rows={muscleRows.map((r) => [r.label, r.value])}>
                <HBars rows={muscleRows} />
              </ChartBlock>
            ) : <p className="muted">No completed sets in this period.</p>}
          </Card>
          <Card title="Exercise trend">
            <p className="hint">Heaviest weight you lifted each session, shown in {unit}. Sets logged in the other unit are converted.</p>
            {loggedExercises.length === 0 ? <p className="muted">No logged strength sets yet.</p> : (
              <>
                <select aria-label="Exercise" value={chosen} onChange={(e) => setTrendEx(e.target.value)}>
                  {loggedExercises.map((id) => <option key={id} value={id}>{exName(id)}</option>)}
                </select>
                {trend.length === 1 && <p className="muted">One session so far: {trend[0].topWeight} {unit} on {formatDay(trend[0].date)}. Log it again to see a trend.</p>}
                {trend.length === 0 && <p className="muted">Nothing logged for this exercise in this period.</p>}
                {trend.length >= 2 && (
                  <ChartBlock title={`Top weight: ${exName(chosen)}`} columns={['Date', `Top weight (${unit})`]} rows={trend.map((t) => [t.date, t.topWeight])}>
                    <LineChart label={`Top weight trend for ${exName(chosen)}`} unit={unit} points={trend.map((t) => ({ x: md(t.date), y: t.topWeight }))} />
                  </ChartBlock>
                )}
              </>
            )}
          </Card>
          <Card title="Personal records">
            <p className="hint">Heaviest completed set for each exercise, in {unit}. A record only means you lifted that weight, nothing more.</p>
            {records.length === 0 ? <p className="muted">Add weights to your sets to see records.</p> : (
              <ul className="plain">{records.map((r) => <li key={r.exerciseId + r.unit}>{exName(r.exerciseId)}: {r.weight} {r.unit} × {r.reps} ({r.date})</li>)}</ul>
            )}
          </Card>
        </>
      )}

      {on('yoga') && (
        <Card title="Yoga minutes">
          <p className="hint">Minutes of poses you marked done, on days you practised.</p>
          {yogaPts.length === 0 ? <p className="muted">No yoga sessions in this period.</p> : (
            <ChartBlock title="Yoga minutes" columns={['Date', 'Minutes']} rows={yogaPts.map((p) => [p.date, p.value])}>
              <BarChart label="Yoga minutes per practice day" data={yogaPts.slice(-12).map((p) => ({ label: md(p.date), value: p.value }))} />
            </ChartBlock>
          )}
        </Card>
      )}

      {on('food') && (
        <Card title="Calories logged">
          <p className="hint">Total calories you logged on days you logged food. A day without entries is not shown, because it is not a zero-calorie day.</p>
          {foodPts.length === 0 ? <p className="muted">No food logged in this period.</p> : (
            <ChartBlock title="Calories logged per day" columns={['Date', 'kcal logged']} rows={foodPts.map((p) => [p.date, p.value])}>
              <BarChart label="Calories logged per day" data={foodPts.slice(-12).map((p) => ({ label: md(p.date), value: p.value }))} />
            </ChartBlock>
          )}
        </Card>
      )}

      {on('bodyweight') && (
        <Card title="Body weight">
          <p className="hint">Entries are added when you change your weight in Settings. Shown in {unit}.</p>
          {bwPts.length === 0 && <p className="muted">No body weight entries in this period.</p>}
          {bwPts.length === 1 && <p className="muted">One entry: {bwPts[0].value} {unit} on {formatDay(bwPts[0].date)}.</p>}
          {bwPts.length >= 2 && (
            <ChartBlock title="Body weight" columns={['Date', `Weight (${unit})`]} rows={bwPts.map((p) => [p.date, p.value])}>
              <LineChart label="Body weight history" unit={unit} points={bwPts.map((p) => ({ x: md(p.date), y: p.value }))} />
            </ChartBlock>
          )}
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
        {historyRows.length === 0 && <p className="muted">Nothing matches.</p>}
        <ul className="history">
          {historyRows.map((r) => (
            <li key={`${r.kind}-${r.id}`}>
              <button type="button" className="alt" onClick={() => navigate(r.kind === 'workout' ? `/session/${r.id}` : `/yoga/session/${r.id}`)}>
                <strong>{r.title}</strong>
                <span className="muted">{formatDay(r.date)} · {r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Export">
        <p className="hint">Exports {RANGE_LABEL[rangeKey].toLowerCase()} in {unit}, with the date and units written in the file. Choose what to include:</p>
        {ALL_CATEGORIES.map((c) => (
          <label key={c} className="check">
            <input type="checkbox" checked={exportCats.includes(c)} onChange={() => toggle(c, exportCats, setExportCats)} />
            <span>{CATEGORY_LABEL[c]}{c === 'food' ? ' (personal, off unless you choose it)' : ''}</span>
          </label>
        ))}
        <div className="inline">
          <Button variant="small" onClick={() => void doExport('csv')}>Export CSV</Button>
          <Button variant="small" onClick={() => void doExport('json')}>Export JSON</Button>
        </div>
        <p className="hint">To save a single chart as a picture, use "Save chart as image" under it. A file you export contains personal health information, so keep it somewhere private.</p>
        {exportMsg && <p className="ok" role="status">{exportMsg}</p>}
      </Card>
    </>
  )
}
