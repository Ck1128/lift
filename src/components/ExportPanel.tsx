import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { exerciseById } from '../data/catalog'
import { buildExport, CATEGORY_LABEL, exportFilename, rangeFor, RANGE_LABEL, toCsv, type Category, type RangeKey } from '../engine/progress'
import { toDateKey } from '../engine/dates'
import type { Profile, SetLog, WorkoutSession } from '../engine/types'
import type { YogaSession } from '../engine/yoga'
import type { FoodLogEntry } from '../engine/food'
import { deliverFile } from '../export/deliver'
import { Button } from './ui'

const ALL_CATEGORIES: Category[] = ['workouts', 'yoga', 'food', 'bodyweight']
const RANGES: RangeKey[] = ['7', '30', '90', 'all']

/** Export of your history as CSV or JSON. Lives in Settings, in a collapsed section. */
export function ExportPanel({ profile }: { profile: Profile }) {
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [] as WorkoutSession[])
  const logs = useLiveQuery(() => db.setLogs.toArray(), [], [] as SetLog[])
  const weights = useLiveQuery(() => db.bodyWeights.toArray(), [], [])
  const yoga = useLiveQuery(() => db.yogaSessions.toArray(), [], [] as YogaSession[])
  const food = useLiveQuery(() => db.foodLog.toArray(), [], [] as FoodLogEntry[])
  const [rangeKey, setRangeKey] = useState<RangeKey>('30')
  const [cats, setCats] = useState<Category[]>(['workouts', 'yoga', 'bodyweight'])
  const [msg, setMsg] = useState('')
  const unit = profile.weightUnit

  const run = async (kind: 'csv' | 'json') => {
    setMsg('')
    if (cats.length === 0) return setMsg('Choose at least one thing to export.')
    const today = toDateKey(new Date())
    const d = buildExport({ range: rangeFor(today, rangeKey), categories: cats, unit, sessions, logs, yoga, food, weights, exerciseName: (id) => exerciseById(id)?.name ?? 'Unknown exercise', now: new Date().toISOString() })
    const text = kind === 'csv' ? toCsv(d) : JSON.stringify(d, null, 2)
    const r = await deliverFile(exportFilename(kind, today), text, kind === 'csv' ? 'text/csv' : 'application/json')
    setMsg(r === 'cancelled' ? 'Cancelled. Nothing was changed.' : r === 'shared' ? 'Shared.' : 'Saved to your downloads.')
  }

  return (
    <div>
      <div className="field">
        <label htmlFor="exp-range">Time range</label>
        <select id="exp-range" value={rangeKey} onChange={(e) => setRangeKey(e.target.value as RangeKey)}>
          {RANGES.map((r) => <option key={r} value={r}>{RANGE_LABEL[r]}</option>)}
        </select>
      </div>
      <p className="hint">Weights are written in {unit}, with the date and units in the file. Choose what to include:</p>
      {ALL_CATEGORIES.map((c) => (
        <label key={c} className="check">
          <input type="checkbox" checked={cats.includes(c)} onChange={() => setCats(cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c])} />
          <span>{CATEGORY_LABEL[c]}{c === 'food' ? ' (personal, off unless you choose it)' : ''}</span>
        </label>
      ))}
      <div className="inline">
        <Button variant="small" onClick={() => void run('csv')}>Export CSV</Button>
        <Button variant="small" onClick={() => void run('json')}>Export JSON</Button>
      </div>
      <p className="hint">An exported file contains personal health information, so keep it somewhere private. To back up everything so you can restore it later, use Backup and restore.</p>
      {msg && <p className="ok" role="status">{msg}</p>}
    </div>
  )
}
