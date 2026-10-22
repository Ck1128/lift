import { useState } from 'react'
import { BodyMap, MapLegend, type MapState } from './BodyMap'
import { Card, EmptyState, Loading } from './ui'
import { ALL_FINE, FINE_LABEL, type FineMuscle } from '../engine/muscleMap'
import { STATUS_LABEL } from '../engine/recovery'
import { formatDay } from '../engine/dates'
import { MUSCLE_CATEGORIES } from '../engine/feedback'
import { useRecovery } from '../hooks/useRecovery'

const etaShort = (h: number) => (h < 1 ? 'ready now' : h < 36 ? `~${Math.round(h)} h left` : `~${Math.round(h / 24)} d left`)
const readyIn = (h: number) => (h < 1 ? 'less than an hour' : h < 36 ? `about ${Math.round(h)} hours` : `about ${Math.round(h / 24)} days`)

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
  const ranked = ALL_FINE.map((m) => report.muscles[m]).filter((r) => r.status !== 'no_data').sort((a, b) => (a.readiness ?? 100) - (b.readiness ?? 100))
  const ready = ranked.filter((r) => r.status === 'recovered').map((r) => FINE_LABEL[r.muscle])
  const resting = ranked.filter((r) => r.status !== 'recovered')
  const pct = Math.round((report.fresh / report.total) * 100)
  const R = 38, C = 2 * Math.PI * R
  return (
    <>
      <Card className="hero recovery-hero">
        <div className="rec-top">
          <svg className="ring" viewBox="0 0 100 100" role="img" aria-label={`${report.fresh} of ${report.total} muscle groups recovered`}>
            <circle cx="50" cy="50" r={R} className="ring-bg" />
            <circle cx="50" cy="50" r={R} className="ring-fg" strokeDasharray={`${(C * pct) / 100} ${C}`} transform="rotate(-90 50 50)" />
            <text x="50" y="48" textAnchor="middle" className="ring-num">{report.fresh}</text>
            <text x="50" y="63" textAnchor="middle" className="ring-sub">of {report.total}</text>
          </svg>
          <div>
            <p className="eyebrow">Recovery</p>
            <p className="hero-title">{pct >= 70 ? 'Mostly fresh' : pct >= 40 ? 'Partly recovered' : 'Still recovering'}</p>
            <p className="muted">{report.daysSinceLast === 0 ? 'Last workout: today' : `${report.daysSinceLast} day${report.daysSinceLast === 1 ? '' : 's'} since your last workout`}</p>
          </div>
        </div>
        {ready.length > 0 && (
          <p className="rec-ready"><strong>Ready to train:</strong> {ready.join(', ')}</p>
        )}
        {resting.length > 0 && (
          <p className="rec-rest"><strong>Needs more rest:</strong> {resting.map((r) => FINE_LABEL[r.muscle]).join(', ')}</p>
        )}
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

      {resting.length > 0 && (
        <Card title="Recovering now">
          <ul className="rec-list">
            {resting.map((r) => (
              <li key={r.muscle}>
                <button type="button" className="rec-row" onClick={() => setPicked(r.muscle)} aria-label={`${FINE_LABEL[r.muscle]}, ${STATUS_LABEL[r.status]}, ${r.readiness}% recovered`}>
                  <span className="rec-name">{FINE_LABEL[r.muscle]}</span>
                  <span className={`pill m-${r.status}`}>{STATUS_LABEL[r.status]}</span>
                  <span className="rec-bar" aria-hidden="true"><span className={`rec-fill f-${r.status}`} style={{ width: `${r.readiness ?? 0}%` }} /></span>
                  <span className="rec-eta">{etaShort(r.remainingHours)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {sel && picked && (
        <Card title={FINE_LABEL[picked]}>
          <p className="big">{STATUS_LABEL[sel.status]}</p>
          {sel.status === 'no_data' && <p className="muted">No logged sets have used this muscle yet.</p>}
          {sel.status !== 'no_data' && sel.lastTrained && <p className="muted">Last trained {formatDay(sel.lastTrained)}.</p>}
          {(sel.status === 'recovering' || sel.status === 'recent') && <p className="muted">Estimated to be ready in {readyIn(sel.remainingHours)}.</p>}
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
        {report.personalReasons.length > 0 ? `Your recovery times are adjusted (x${report.personalFactor}) because ${report.personalReasons.join(' and ')}. ` : ''}
        This is an estimate from your own workouts (sets, effort, muscle size and how often you trained). It is not a medical assessment and cannot tell you if you are ready or injured.
        A "recovering" muscle does not stop you from training.
        {report.unmappedExercises > 0 ? ` ${report.unmappedExercises} logged exercise${report.unmappedExercises === 1 ? ' has' : 's have'} no muscle information and ${report.unmappedExercises === 1 ? 'is' : 'are'} left out.` : ''}
      </p>
    </>
  )
}
