import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import {
  addSet, finishSession, pauseSession, replaceExercise, resumeSession, setExerciseUnit, setPain, setSessionUnit, setSkipped, updateSet,
} from '../db/repo'
import { CATALOG, exerciseById } from '../data/catalog'
import { findAlternatives } from '../engine/generate'
import { EQUIPMENT_LABEL, type EquipmentSet, type PlannedExercise, type Profile, type SetLog, type WorkoutSession } from '../engine/types'
import { useNow } from '../hooks/app'
import { addRest, formatClock, isFinished, isPaused, pauseRest, remainingMs, resumeRest, startRest, type RestTimer } from '../engine/restTimer'
import type { WeightUnit } from '../engine/types'
import { ExerciseMedia } from '../components/ExerciseMedia'
import { Button, Card, Chips, ConfirmDialog, Dialog, ScreenHeader } from '../components/ui'

const clock = (ms: number) => formatClock(ms)

export function Player({ session, profile, equipment, onFinished }: {
  session: WorkoutSession
  profile: Profile
  equipment: EquipmentSet
  onFinished: (id: string) => void
}) {
  const logs = useLiveQuery(() => db.setLogs.where('sessionId').equals(session.id).toArray(), [session.id], [] as SetLog[])
  const [rest, setRest] = useState<RestTimer | null>(null)
  const [replacing, setReplacing] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'finish' | 'abandon' | null>(null)
  const paused = !!session.pausedAt
  const now = useNow(rest || !paused ? 250 : 1000)
  const reopened = !!session.reopenedAt

  const elapsed = (paused ? new Date(session.pausedAt!).getTime() : now) - new Date(session.startedAt).getTime() - session.pausedMs
  const sorted = useMemo(
    () => [...logs].sort((a, b) => a.slotId.localeCompare(b.slotId, undefined, { numeric: true }) || a.setNumber - b.setNumber),
    [logs],
  )
  const activeSlots = session.actualExercises.filter((a) => !a.skipped).map((a) => a.slotId)
  const relevant = sorted.filter((l) => activeSlots.includes(l.slotId))
  const done = relevant.filter((l) => l.completed).length
  const pending = relevant.length - done
  
  // The rest timer ends itself. It uses timestamps, so a locked screen or background tab cannot make it drift.
  useEffect(() => {
    if (!rest || isPaused(rest)) return
    const t = setTimeout(() => {
      try { navigator.vibrate?.(250) } catch { /* not supported on iPhone Safari */ }
      setRest(null)
    }, Math.max(0, rest.endAt - Date.now()))
    return () => clearTimeout(t)
  }, [rest])

  const finish = async (mode: 'finish' | 'abandon') => {
    setConfirm(null)
    const r = await finishSession(session.id, mode)
    if (r) onFinished(r.id)
  }

  return (
    <>
      <ScreenHeader title={session.title} subtitle={`${clock(elapsed)} elapsed${paused ? ' (paused)' : ''} · ${done} of ${relevant.length} sets done`} />
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={relevant.length} aria-valuenow={done} aria-label="Workout progress">
        <div className="progress-fill" style={{ width: `${relevant.length ? (done / relevant.length) * 100 : 0}%` }} />
      </div>
      {reopened && <p className="notice" role="status">You reopened this workout. Change anything, then finish again to save it.</p>}
      <div className="inline">
        <Button variant="small" onClick={() => (paused ? resumeSession(session.id) : pauseSession(session.id))}>{paused ? 'Resume' : 'Pause'}</Button>
        <Button variant="small" className="finish-top" onClick={() => setConfirm('finish')}>Finish workout</Button>
        {!reopened && <Button variant="small" onClick={() => setConfirm('abandon')}>Discard</Button>}
      </div>
      <div className="field">
        <p className="label-like">Weight units for this workout</p>
        <Chips label="Workout weight units" options={['lb', 'kg'] as const} value={session.weightUnit} onChange={(u) => void setSessionUnit(session.id, u)} />
        <p className="hint">Each exercise can use its own unit too. The weight itself never changes, only how it is shown.</p>
      </div>

      {session.plannedExercises.map((slot) => {
        const actual = session.actualExercises.find((a) => a.slotId === slot.slotId)
        if (!actual) return null
        return (
          <ExerciseCard
            key={slot.slotId}
            slot={slot}
            actual={actual}
            sessionId={session.id}
            logs={sorted.filter((l) => l.slotId === slot.slotId)}
            pageUnit={session.weightUnit}
            onSetDone={() => setRest(startRest(Date.now(), slot.restSeconds))}
            onReplace={() => setReplacing(slot.slotId)}
          />
        )
      })}

      <Button className="finish-bottom" onClick={() => setConfirm('finish')}>Finish workout</Button>
      {!reopened && <Button variant="ghost" onClick={() => setConfirm('abandon')}>Discard workout</Button>}

      {rest && (
        <div className="rest-bar" role="timer" aria-label="Rest timer">
          <span>{isPaused(rest) ? 'Rest paused' : 'Rest'} {clock(remainingMs(rest, now))}</span>
          <span>
            {isPaused(rest)
              ? <button type="button" onClick={() => setRest(resumeRest(rest, Date.now()))}>Resume</button>
              : <button type="button" onClick={() => setRest(pauseRest(rest, Date.now()))}>Pause</button>}
            <button type="button" onClick={() => setRest(addRest(rest, 15, Date.now()))}>+15s</button>
            <button type="button" onClick={() => setRest(null)}>Skip</button>
          </span>
        </div>
      )}
      {rest && isFinished(rest, now) && <p className="sr-only" role="status">Rest is over.</p>}

      {replacing && (
        <ReplaceDialog
          session={session}
          slotId={replacing}
          profile={profile}
          equipment={equipment}
          onClose={() => setReplacing(null)}
        />
      )}
      {confirm === 'finish' && (
        <ConfirmDialog
          title="Finish workout?"
          message={pending > 0 ? `${pending} set${pending === 1 ? '' : 's'} not marked done will be saved as not completed. You can still finish now.` : 'All sets are done. Save this workout?'}
          confirmLabel="Save and finish"
          onCancel={() => setConfirm(null)}
          onConfirm={() => finish('finish')}
        />
      )}
      {confirm === 'abandon' && (
        <ConfirmDialog
          title="Discard this workout?"
          message="It is saved in your history as abandoned, with any sets you already logged. It will not count toward your progress."
          confirmLabel="Discard"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => finish('abandon')}
        />
      )}
    </>
  )
}

function ExerciseCard({ slot, actual, sessionId, logs, pageUnit, onSetDone, onReplace }: {
  slot: PlannedExercise
  actual: WorkoutSession['actualExercises'][number]
  sessionId: string
  logs: SetLog[]
  pageUnit: WeightUnit
  onSetDone: () => void
  onReplace: () => void
}) {
  const ex = exerciseById(actual.exerciseId)
  const original = actual.replacedFromId ? exerciseById(actual.replacedFromId) : undefined
  const cardio = slot.kind === 'cardio'
  const unit: WeightUnit = logs[0]?.weightUnit ?? pageUnit
  return (
    <Card className={actual.skipped ? 'skipped' : ''}>
      <p className="big">{cardio ? slot.name : (ex?.name ?? slot.name)}</p>
      {original && <p className="hint">Replaced {original.name}</p>}
      {cardio ? (
        <p className="muted">Target {slot.durationMinutes} min{slot.intensityCue ? ` · ${slot.intensityCue}` : ''}</p>
      ) : (
        <p className="muted">Target {slot.sets} × {slot.repMin}-{slot.repMax} reps · rest {slot.restSeconds}s</p>
      )}
      {slot.cues && slot.cues.length > 0 && !actual.skipped && (
        <ul className="plain cues" aria-label="Form cues">{slot.cues.map((c, i) => <li key={i}>{c}</li>)}</ul>
      )}
      {actual.skipped ? (
        <div className="inline">
          <span className="muted">Skipped</span>
          <Button variant="small" onClick={() => setSkipped(sessionId, slot.slotId, false)}>Undo skip</Button>
        </div>
      ) : cardio ? (
        <>
          {logs.map((l) => <CardioRow key={l.id} log={l} planned={slot.durationMinutes ?? 0} onDone={onSetDone} />)}
          <div className="inline">
            <Button variant="small" onClick={() => setSkipped(sessionId, slot.slotId, true)}>Skip</Button>
          </div>
        </>
      ) : (
        <>
          <div className="inline unit-row">
            <label className="mini"><span>Unit for this exercise</span>
              <select value={unit} aria-label={`${slot.name} weight unit`} onChange={(e) => void setExerciseUnit(sessionId, slot.slotId, e.target.value as WeightUnit)}>
                <option value="lb">lb</option>
                <option value="kg">kg</option>
              </select>
            </label>
            {unit !== pageUnit && <span className="hint">Different from the workout default ({pageUnit}).</span>}
          </div>
          <div className="set-head" aria-hidden="true"><span>Set</span><span>{unit}</span><span>Reps</span><span>RPE</span><span /></div>
          {logs.map((l) => <SetRow key={l.id} log={l} onDone={onSetDone} />)}
          <div className="inline">
            <Button variant="small" onClick={() => void addSet(sessionId, slot.slotId)}>Add set</Button>
            <Button variant="small" onClick={onReplace}>Replace</Button>
            <Button variant="small" onClick={() => setSkipped(sessionId, slot.slotId, true)}>Skip</Button>
            <Button variant="small" aria-pressed={actual.painReported} onClick={() => setPain(sessionId, slot.slotId, !actual.painReported)}>
              {actual.painReported ? 'Pain noted ✓' : 'Felt pain'}
            </Button>
          </div>
          {actual.painReported && <p className="notice">Noted. The weight will not go up next time. If something hurts, stop, and consider asking a qualified professional.</p>}
          <details>
            <summary className="muted">Weight tip and how-to</summary>
            <p className="hint">{slot.loadNote}</p>
            <ExerciseMedia exerciseId={actual.exerciseId} />
          </details>
        </>
      )}
    </Card>
  )
}

function CardioRow({ log, planned, onDone }: { log: SetLog; planned: number; onDone: () => void }) {
  const [m, setM] = useState(String(log.actualMinutes ?? planned))
  const [err, setErr] = useState('')
  void onDone // cardio does not start a rest timer
  const save = async (completed: boolean) => {
    const n = Number(m)
    if (!Number.isFinite(n) || n < 0 || n > 600) { setErr('Minutes must be a number from 0 to 600.'); return }
    setErr('')
    await updateSet(log.id, { actualMinutes: n, completed })
  }
  return (
    <div className="set-row-wrap">
      <div className={log.completed ? 'set-row cardio done' : 'set-row cardio'}>
        <label className="mini"><span>Minutes done</span>
          <input inputMode="decimal" value={m} aria-label="Cardio minutes done" onChange={(e) => setM(e.target.value)} onBlur={() => void save(log.completed)} />
        </label>
        <button type="button" className={log.completed ? 'check-btn on' : 'check-btn'} aria-pressed={log.completed}
          aria-label={log.completed ? 'Cardio done. Tap to undo' : 'Mark cardio done'} onClick={() => void save(!log.completed)}>✓</button>
      </div>
      {err && <p className="error" role="alert">{err}</p>}
    </div>
  )
}

function SetRow({ log, onDone }: { log: SetLog; onDone: () => void }) {
  const [w, setW] = useState(log.actualWeight?.toString() ?? '')
  const [r, setR] = useState(log.actualReps?.toString() ?? String(log.plannedRepMax))
  const [e, setE] = useState(log.effortRating?.toString() ?? '')
  const [err, setErr] = useState('')
  // Keep the box in step when the unit of this exercise is changed from elsewhere on the page.
  const [seenWeight, setSeenWeight] = useState(log.actualWeight)
  if (seenWeight !== log.actualWeight) { setSeenWeight(log.actualWeight); setW(log.actualWeight?.toString() ?? '') }

  const parse = (): { reps?: number; weight?: number; effort?: number } | null => {
    const reps = r.trim() === '' ? undefined : Number(r)
    const weight = w.trim() === '' ? undefined : Number(w)
    if (reps !== undefined && (!Number.isInteger(reps) || reps < 0 || reps > 999)) { setErr('Reps must be a whole number from 0 to 999.'); return null }
    if (weight !== undefined && (!Number.isFinite(weight) || weight < 0 || weight > 2000)) { setErr('Weight must be a number from 0 to 2000.'); return null }
    setErr('')
    return { reps, weight, effort: e === '' ? undefined : Number(e) }
  }
  const save = async (completed: boolean) => {
    const p = parse()
    if (!p) return
    if (completed && p.reps === undefined) { setErr('Enter how many reps you did.'); return }
    await updateSet(log.id, { actualReps: p.reps, actualWeight: p.weight, effortRating: p.effort, completed })
    if (completed && !log.completed) onDone()
  }
  return (
    <div className="set-row-wrap">
      <div className={log.completed ? 'set-row done' : 'set-row'}>
        <span className="n">{log.setNumber}</span>
        <input aria-label={`Set ${log.setNumber} weight`} inputMode="decimal" value={w} placeholder={log.plannedWeight === undefined ? '-' : String(log.plannedWeight)} onChange={(x) => setW(x.target.value)} onBlur={() => void save(log.completed)} />
        <input aria-label={`Set ${log.setNumber} reps`} inputMode="numeric" value={r} onChange={(x) => setR(x.target.value)} onBlur={() => void save(log.completed)} />
        <select aria-label={`Set ${log.setNumber} effort, optional`} value={e} onChange={(x) => { setE(x.target.value) }} onBlur={() => void save(log.completed)}>
          <option value="">-</option>
          {[6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button type="button" className={log.completed ? 'check-btn on' : 'check-btn'} aria-label={log.completed ? `Set ${log.setNumber} done. Tap to undo` : `Mark set ${log.setNumber} done`} aria-pressed={log.completed} onClick={() => void save(!log.completed)}>✓</button>
      </div>
      {err && <p className="error" role="alert">{err}</p>}
    </div>
  )
}

function ReplaceDialog({ session, slotId, profile, equipment, onClose }: {
  session: WorkoutSession; slotId: string; profile: Profile; equipment: EquipmentSet; onClose: () => void
}) {
  const actual = session.actualExercises.find((a) => a.slotId === slotId)
  const current = actual ? exerciseById(actual.exerciseId) : undefined
  const inSession = session.actualExercises.map((a) => a.exerciseId)
  const alts = current
    ? findAlternatives(current, {
        catalog: CATALOG, equipment, excludedExerciseIds: profile.excludedExerciseIds,
        excludedPatterns: profile.excludedPatterns, experience: profile.trainingLevel,
      }, inSession).slice(0, 12)
    : []
  return (
    <Dialog title="Replace exercise" onClose={onClose}>
      <p className="hint">Options for the same muscle, using only your confirmed equipment and skipping anything you excluded.</p>
      {alts.length === 0 && <p className="notice">No other exercise fits your equipment and exclusions. You can skip this one instead.</p>}
      <ul className="alts">
        {alts.map((a) => (
          <li key={a.id}>
            <button type="button" className="alt" onClick={async () => { await replaceExercise(session.id, slotId, a.id); onClose() }}>
              <strong>{a.name}</strong>
              <span className="muted">{a.equipmentIds.filter((q) => q !== 'bodyweight').map((q) => EQUIPMENT_LABEL[q]).join(', ') || 'No equipment'}</span>
            </button>
          </li>
        ))}
      </ul>
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
    </Dialog>
  )
}
