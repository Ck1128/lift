import { useState } from 'react'
import { BodyMap, MapLegend, type MapState } from './BodyMap'
import { Card, EmptyState, Loading } from './ui'
import { ALL_FINE, FINE_LABEL, type FineMuscle } from '../engine/muscleMap'
import { STATUS_LABEL } from '../engine/recovery'
import { formatDay } from '../engine/dates'
import { MUSCLE_CATEGORIES } from '../engine/feedback'
import { useRecovery } from '../hooks/useRecovery'

const ready = (h: number) => (h < 1 ? 'less than an hour' : h < 36 ? `about ${Math.round(h)} hours` : `about ${Math.round(h / 24)} days`)

/** The Recovery side of Progress (US-06). Everything here is an estimate from your own log, kept on this device. */
export function RecoveryView({ onGoToWorkouts }: { onGoToWorkouts?: () => void }) {
  const { report, loading } = useRecovery()
  const [picked, setPicked] = useState<FineMuscle | null>(null)
  if (loading) return <Loading label="Loading recovery" />

  if (!report.hasHistory) {
    return (
      <EmptyState title="No recovery data yet" hint="Finish a workout and your muscle map fills in. Until then, nothing is assumed to be recovered.">
        {onGoToWorkouts && <button type="button" className="btn btn-ghost" onClick={onGoToWorkouts}>Go to Home</button>}
      </EmptyState>
    )
  }

  const states = Object.fromEntries(ALL_FINE.map((m) => [m, report.muscles[m].status as MapState])) as Partial<Record<FineMuscle, MapState>>
  const sel = picked ? report.muscles[picked] : null
  return (
    <>
      <Card>
        <div className="kpis">
          <div className="kpi"><strong>{report.daysSinceLast === 0 ? 'Today' : report.daysSinceLast}</strong><span>{report.daysSinceLast === 0 ? 'last workout' : report.daysSinceLast === 1 ? 'day since last workout' : 'days since last workout'}</span></div>
          <div className="kpi"><strong>{report.fresh}<span> / {report.total}</span></strong><span>muscle groups recovered</span></div>
        </div>
      </Card>

      <Card title="Muscle recovery" feedback={{ categories: MUSCLE_CATEGORIES, attach: { label: 'The recovery status of each muscle group (no workout details)', data: Object.fromEntries(ALL_FINE.map((m) => [m, report.muscles[m].status])) } }}>
        <BodyMap states={states} label="Muscle recovery" selected={picked} onSelect={(m) => setPicked((p) => (p === m ? null : m))} />
        <MapLegend kind="recovery" />
        <p className="hint">Tap a muscle for details. The list below does the same.</p>
        <div className="muscle-list" role="group" aria-label="Muscle groups">
          {ALL_FINE.map((m) => (
            <button key={m} type="button" className={picked === m ? 'chip on' : 'chip'} aria-pressed={picked === m} onClick={() => setPicked((p) => (p === m ? null : m))}>
              {FINE_LABEL[m]}: {STATUS_LABEL[report.muscles[m].status]}
            </button>
          ))}
        </div>
      </Card>

      {sel && picked && (
        <Card title={FINE_LABEL[picked]}>
          <p className="big">{STATUS_LABEL[sel.status]}</p>
          {sel.status === 'no_data' && <p className="muted">No logged sets have used this muscle yet.</p>}
          {sel.status !== 'no_data' && sel.lastTrained && <p className="muted">Last trained {formatDay(sel.lastTrained)}.</p>}
          {(sel.status === 'recovering' || sel.status === 'recent') && <p className="muted">Estimated to be ready in {ready(sel.remainingHours)}.</p>}
          {sel.status === 'recovered' && <p className="muted">Enough time has passed for this muscle based on your recent sets.</p>}
          {sel.recent.length > 0 && (
            <>
              <p className="label-like">Recent training</p>
              <ul className="plain">
                {sel.recent.map((r) => (
                  <li key={r.sessionId}>{formatDay(r.date)}: {r.title}, {Math.round(r.effectiveSets * 10) / 10} effective set{r.effectiveSets === 1 ? '' : 's'} ({r.exercises.slice(0, 3).join(', ')}{r.exercises.length > 3 ? '…' : ''})</li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}

      <p className="hint">
        This is an estimate from your own workouts (sets, effort, muscle size and how often you trained). It is not a medical assessment and cannot tell you if you are ready or injured.
        A "recovering" muscle does not stop you from training.
        {report.unmappedExercises > 0 ? ` ${report.unmappedExercises} logged exercise${report.unmappedExercises === 1 ? ' has' : 's have'} no muscle information and ${report.unmappedExercises === 1 ? 'is' : 'are'} left out.` : ''}
      </p>
    </>
  )
}
