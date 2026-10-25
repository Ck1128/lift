import { useMemo, useState } from 'react'
import { BodyMap, MapLegend, type MapState } from './BodyMap'
import { EmptyState } from './ui'
import { exerciseById } from '../data/catalog'
import { FINE_LABEL, musclesOfMany, type FineMuscle } from '../engine/muscleMap'
import { overlapWithPlan, STATUS_LABEL } from '../engine/recovery'
import { formatDay } from '../engine/dates'
import { useRecovery } from '../hooks/useRecovery'

/**
 * Which muscles a set of exercises works, next to what your recent training says about them (US-07, US-08).
 * Muscles come from the shared exercise mapping, never from this screen. It only informs; it never blocks a workout.
 */
export function WorkoutMuscles({ exerciseIds, onChangePlan }: { exerciseIds: string[]; onChangePlan?: () => void }) {
  const { report, loading } = useRecovery()
  const [picked, setPicked] = useState<FineMuscle | null>(null)
  const use = useMemo(() => musclesOfMany(exerciseIds.map((id) => exerciseById(id))), [exerciseIds])

  if (exerciseIds.length === 0) {
    return <EmptyState title="No workout selected" hint="Pick a workout and the muscles it works show up here." />
  }
  if (use.primary.length + use.secondary.length === 0) {
    return <p className="hint">No muscle information is available for these exercises, so no map is shown.</p>
  }

  const states: Partial<Record<FineMuscle, MapState>> = {}
  use.secondary.forEach((m) => { states[m] = 'secondary' })
  use.primary.forEach((m) => { states[m] = 'primary' })
  const planned = [...use.primary, ...use.secondary]
  const overlap = loading ? [] : overlapWithPlan(planned, report, use.byMuscle)

  return (
    <div className="wm">
      <BodyMap states={states} label="Muscles in this workout" selected={picked} onSelect={(m) => setPicked((p) => (p === m ? null : m))} />
      <MapLegend kind="workout" />
      <p className="hint">Main: {use.primary.map((m) => FINE_LABEL[m]).join(', ') || 'none'}. Also worked: {use.secondary.map((m) => FINE_LABEL[m]).join(', ') || 'none'}.</p>
      <div className="muscle-list" role="group" aria-label="Muscles in this workout">
        {planned.map((m) => (
          <button key={m} type="button" className={picked === m ? 'chip on' : 'chip'} aria-pressed={picked === m} onClick={() => setPicked((p) => (p === m ? null : m))}>
            {FINE_LABEL[m]} ({use.primary.includes(m) ? 'main' : 'also'})
          </button>
        ))}
      </div>
      {picked && states[picked] && (
        <div className="notice" role="status">
          <strong>{FINE_LABEL[picked]}</strong> is worked by: {(use.byMuscle[picked] ?? []).join(', ')}.
        </div>
      )}
      {use.unmappedCount > 0 && <p className="hint">{use.unmappedCount} exercise{use.unmappedCount === 1 ? '' : 's'} with no muscle information {use.unmappedCount === 1 ? 'is' : 'are'} not shown.</p>}

      {report.hasHistory && overlap.length > 0 && (
        <div className="overlap">
          <p className="label-like">Heads up: overlap with recent training</p>
          <ul className="plain">
            {overlap.map((o) => (
              <li key={o.muscle}>
                <strong>{FINE_LABEL[o.muscle]}</strong> is {STATUS_LABEL[o.status].toLowerCase()}
                {o.lastTrained ? ` (last trained ${formatDay(o.lastTrained)})` : ''}. This workout uses it in {o.exercises.slice(0, 3).join(', ') || 'a planned exercise'}.
              </li>
            ))}
          </ul>
          <p className="hint">
            You can train anyway. If you would rather ease off, swap those exercises with Replace, or pick a different focus on Home{onChangePlan ? '' : ''}.
            This is an estimate, not a medical assessment.
          </p>
          {onChangePlan && <button type="button" className="btn btn-ghost" onClick={onChangePlan}>Choose a different focus</button>}
        </div>
      )}
      {report.hasHistory && overlap.length === 0 && !loading && <p className="hint">Your recent training suggests these muscles have had time to recover. That is an estimate, not a guarantee.</p>}
      {!report.hasHistory && !loading && <p className="hint">No workouts logged yet, so there is no recovery comparison.</p>}
    </div>
  )
}
