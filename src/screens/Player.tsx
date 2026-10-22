import { useEffect, useMemo, useState } from 'react'
import { SessionRing } from '../components/Ring'
import { ConfirmButton } from '../components/confirm'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import {
  addSet, finishSession, pauseSession, replaceExercise, resumeSession, setExerciseUnit, setPain, setSessionUnit, setSkipped, undoReplace, updateSet, type LogsChoice,
} from '../db/repo'
import { CATALOG, exerciseById } from '../data/catalog'
import { alternativesFor, equipmentOptions, machineTakenSwap, patternWord, SHAREABLE, sessionEstimateMinutes } from '../engine/variants'
import { getSetting, setSetting } from '../db/settings'
import { EQUIPMENT_LABEL, type Exercise, type EquipmentSet, type PlannedExercise, type Profile, type SetLog, type WorkoutSession } from '../engine/types'
import { useNow } from '../hooks/app'
import { addRest, formatClock, isFinished, isPaused, pauseRest, remainingMs, resumeRest, startRest, type RestTimer } from '../engine/restTimer'
import type { WeightUnit } from '../engine/types'
import { FeedbackButton } from '../components/Feedback'
import { ExerciseInfo } from '../components/ExerciseInfo'
import { WorkoutMuscles } from '../components/WorkoutMuscles'
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
  const [change, setChange] = useState<{ slotId: string; toId: string } | null>(null)
  const [swapNote, setSwapNote] = useState<string | null>(null)
  /** Exercises found busy this session, so "Machine taken" never offers them again. */
  const [taken, setTaken] = useState<string[]>([])
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
  const rules = useMemo(() => ({
    catalog: CATALOG, equipment, excludedExerciseIds: profile.excludedExerciseIds, excludedPatterns: profile.excludedPatterns, experience: profile.trainingLevel,
    gym: profile.preferredLocation === 'gym' ? profile.gymType : undefined,
  }), [equipment, profile.excludedExerciseIds, profile.excludedPatterns, profile.trainingLevel, profile.preferredLocation, profile.gymType])
  const inSession = session.actualExercises.map((a) => a.exerciseId)
  const estimate = sessionEstimateMinutes(session, profile.goal)

  // Swap one slot to another exercise. If sets are already logged for it, ask what to do with them first.
  const requestSwap = (slotId: string, toId: string) => {
    const logged = sorted.filter((l) => l.slotId === slotId && l.completed).length
    if (logged > 0) { setChange({ slotId, toId }); return }
    void applySwap(slotId, toId, 'keep')
  }
  const applySwap = async (slotId: string, toId: string, logs: LogsChoice) => {
    setChange(null)
    setReplacing(null)
    const from = exerciseById(session.actualExercises.find((a) => a.slotId === slotId)?.exerciseId ?? '')
    await replaceExercise(session.id, slotId, toId, { logs })
    setSwapNote(`Swapped ${from?.name ?? 'the exercise'} for ${exerciseById(toId)?.name ?? 'a new one'}. Only this exercise changed. You can undo it on its card.`)
  }

  // "Machine taken": one tap swaps in the closest alternative, remembers the choice for next time, and never goes back to a busy one.
  const machineTaken = async (slotId: string, exerciseId: string) => {
    const cur = exerciseById(exerciseId)
    if (!cur) return
    const prefs = await getSetting<Record<string, string>>('swap.pref', {})
    const pick = machineTakenSwap(cur, rules, inSession, [...taken, exerciseId], prefs[exerciseId])
    if (!pick) { setSwapNote(`No other exercise fits your equipment and settings for ${cur.primaryMuscles[0]}. Skip ${cur.name} for now and come back to it.`); return }
    setTaken((t) => [...t, exerciseId])
    await setSetting('swap.pref', { ...prefs, [exerciseId]: pick.id })
    requestSwap(slotId, pick.id)
  }

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
      <SessionRing elapsedMs={elapsed} plannedMinutes={session.plannedMinutes || estimate} setsDone={done} setsTotal={relevant.length} paused={paused} />
      <p className="hint" aria-live="polite">Estimated session length: about {estimate} min{session.plannedMinutes ? ` (you chose ${session.plannedMinutes})` : ''}. It updates when you swap an exercise.</p>
      {swapNote && <p className="ok" role="status">{swapNote}</p>}
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

      <Card>
        <details>
          <summary>Muscles in this workout</summary>
          <WorkoutMuscles exerciseIds={session.actualExercises.filter((a) => !a.skipped && session.plannedExercises.find((p) => p.slotId === a.slotId)?.kind !== 'cardio').map((a) => a.exerciseId)} />
        </details>
      </Card>

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
            rules={rules}
            inSession={inSession}
            onSwap={(toId) => requestSwap(slot.slotId, toId)}
            onMachineTaken={() => void machineTaken(slot.slotId, actual.exerciseId)}
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
          rules={rules}
          onPick={(toId) => requestSwap(replacing, toId)}
          onSkip={async () => { await setSkipped(session.id, replacing, true); setReplacing(null) }}
          onClose={() => setReplacing(null)}
        />
      )}
      {change && (
        <LoggedSetsDialog
          fromName={exerciseById(session.actualExercises.find((a) => a.slotId === change.slotId)?.exerciseId ?? '')?.name ?? 'this exercise'}
          toName={exerciseById(change.toId)?.name ?? 'the new exercise'}
          logged={sorted.filter((l) => l.slotId === change.slotId && l.completed).length}
          onChoose={(choice) => void applySwap(change.slotId, change.toId, choice)}
          onCancel={() => setChange(null)}
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

function ExerciseCard({ slot, actual, sessionId, logs, pageUnit, onSetDone, onReplace, rules, inSession, onSwap, onMachineTaken }: {
  slot: PlannedExercise
  actual: WorkoutSession['actualExercises'][number]
  sessionId: string
  logs: SetLog[]
  pageUnit: WeightUnit
  onSetDone: () => void
  onReplace: () => void
  rules: Parameters<typeof equipmentOptions>[1]
  inSession: string[]
  onSwap: (toId: string) => void
  onMachineTaken: () => void
}) {
  const ex = exerciseById(actual.exerciseId)
  const [undoMsg, setUndoMsg] = useState('')
  const original = actual.replacedFromId ? exerciseById(actual.replacedFromId) : undefined
  const cardio = slot.kind === 'cardio'
  const unit: WeightUnit = logs[0]?.weightUnit ?? pageUnit
  return (
    <Card className={actual.skipped ? 'skipped' : ''}>
      <div className="title-row">
        <p className="big">{cardio ? slot.name : (ex?.name ?? slot.name)}</p>
        <FeedbackButton component="Workout exercise" element={ex?.name ?? slot.name} />
        {!cardio && !actual.skipped && <ExerciseInfo exerciseId={actual.exerciseId} name={ex?.name ?? slot.name} cues={slot.cues} note={slot.loadNote} why={slot.why} />}
      </div>
      {original && <p className="hint">Replaced {original.name}</p>}
      {cardio ? (
        <p className="muted">Target {slot.durationMinutes} min{slot.intensityCue ? ` · ${slot.intensityCue}` : ''}</p>
      ) : (
        <p className="muted">Target {slot.sets} × {slot.repMin}-{slot.repMax} reps · rest {slot.restSeconds}s</p>
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
            <ConfirmButton variant="small" confirm={{ title: 'Skip this exercise?', message: 'It is left out of this workout. You can undo it.' }} onConfirm={() => setSkipped(sessionId, slot.slotId, true)}>Skip</ConfirmButton>
          </div>
        </>
      ) : (
        <>
          {ex && <EquipmentSelect exercise={ex} name={slot.name} rules={rules} inSession={inSession} onPick={onSwap} />}
          {actual.previous && (
            <div className="inline">
              <Button variant="small" onClick={async () => { const r = await undoReplace(sessionId, slot.slotId); setUndoMsg(r.ok ? '' : r.reason) }}>Undo swap</Button>
              <span className="hint">Was {exerciseById(actual.previous.exerciseId)?.name}</span>
            </div>
          )}
          {undoMsg && <p className="error" role="alert">{undoMsg}</p>}
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
          <div className="set-actions">
            <Button variant="small" onClick={() => void addSet(sessionId, slot.slotId)}>Add set</Button>
            <Button variant="small" onClick={onReplace}>Replace</Button>
            <ConfirmButton variant="small" confirm={{ title: 'Skip this exercise?', message: 'It is left out of this workout. You can undo it.' }} onConfirm={() => setSkipped(sessionId, slot.slotId, true)}>Skip</ConfirmButton>
            {ex && SHAREABLE.has(ex.exerciseType) && (
              <Button variant="small" className="taken" onClick={onMachineTaken}>{ex.exerciseType === 'machine' || ex.exerciseType === 'cable' || ex.exerciseType === 'smith' ? 'Machine taken' : 'Equipment taken'}</Button>
            )}
            <Button variant="small" className="pain" aria-pressed={actual.painReported} onClick={() => setPain(sessionId, slot.slotId, !actual.painReported)}>
              {actual.painReported ? 'Pain noted ✓' : 'Felt pain'}
            </Button>
          </div>
          {actual.painReported && <p className="notice">Noted. The weight will not go up next time. If something hurts, stop, and consider asking a qualified professional.</p>}
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

function EquipmentSelect({ exercise, name, rules, inSession, onPick }: {
  exercise: Exercise; name: string; rules: Parameters<typeof equipmentOptions>[1]; inSession: string[]; onPick: (exerciseId: string) => void
}) {
  const options = equipmentOptions(exercise, rules, inSession)
  if (options.length < 2) return null
  const blocked = options.filter((o) => !o.exerciseId)
  return (
    <div className="equip-row">
      <label className="mini"><span>Equipment for this exercise</span>
        <select aria-label={`${name} equipment`} value={exercise.exerciseType} onChange={(e) => { const o = options.find((x) => x.type === e.target.value); if (o?.exerciseId) onPick(o.exerciseId) }}>
          {options.map((o) => (
            <option key={o.type} value={o.type} disabled={!o.exerciseId}>{o.label}{o.exerciseId ? '' : ' (not available)'}</option>
          ))}
        </select>
      </label>
      {blocked.length > 0 && (
        <details>
          <summary className="muted">Why are some options unavailable?</summary>
          <ul className="plain hint">{blocked.map((o) => <li key={o.type}><strong>{o.label}:</strong> {o.reason}</li>)}</ul>
        </details>
      )}
    </div>
  )
}

function LoggedSetsDialog({ fromName, toName, logged, onChoose, onCancel }: {
  fromName: string; toName: string; logged: number; onChoose: (c: LogsChoice) => void; onCancel: () => void
}) {
  return (
    <Dialog title="You already logged sets" onClose={onCancel}>
      <p>You logged {logged} set{logged === 1 ? '' : 's'} of <strong>{fromName}</strong>. What should happen when you switch to <strong>{toName}</strong>?</p>
      <div className="stack">
        <Button onClick={() => onChoose('keep')}>Keep my {logged} logged set{logged === 1 ? '' : 's'}, switch the rest</Button>
        <Button variant="danger" onClick={() => onChoose('reset')}>Reset this exercise's sets and switch</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel, change nothing</Button>
      </div>
      <p className="hint">Only this exercise is affected. Your other exercises and their sets stay as they are. You can undo a swap if you have not logged new sets since.</p>
    </Dialog>
  )
}

function ReplaceDialog({ session, slotId, rules, onPick, onSkip, onClose }: {
  session: WorkoutSession; slotId: string; rules: Parameters<typeof equipmentOptions>[1]
  onPick: (exerciseId: string) => void; onSkip: () => void; onClose: () => void
}) {
  const actual = session.actualExercises.find((a) => a.slotId === slotId)
  const current = actual ? exerciseById(actual.exerciseId) : undefined
  const inSession = session.actualExercises.map((a) => a.exerciseId)
  const { best, related } = current ? alternativesFor(current, rules, inSession) : { best: [], related: [] }
  const item = (a: Exercise) => (
    <li key={a.id}>
      <button type="button" className="alt" onClick={() => onPick(a.id)}>
        <strong>{a.name}</strong>
        <span className="muted">{a.equipmentIds.filter((q) => q !== 'bodyweight').map((q) => EQUIPMENT_LABEL[q]).join(', ') || 'No equipment'}</span>
      </button>
    </li>
  )
  return (
    <Dialog title="Replace exercise" onClose={onClose}>
      {current && <p className="hint">Swaps only <strong>{current.name}</strong> for something that still works your {current.primaryMuscles[0]}, using your equipment and exclusions. The rest of today's workout stays as it is.</p>}
      {best.length === 0 && related.length === 0 && (
        <div className="notice">
          <p>No other exercise fits. Nothing else trains the same muscle with the equipment you have, your exclusions and your level.</p>
          <div className="inline">
            <Button variant="small" onClick={onClose}>Keep this exercise</Button>
            <Button variant="small" onClick={onSkip}>Skip it today</Button>
          </div>
        </div>
      )}
      {best.length > 0 && current && (
        <>
          <p className="label-like">Same {patternWord(current.movementPattern)} movement</p>
          <ul className="alts">{best.slice(0, 10).map(item)}</ul>
        </>
      )}
      {related.length > 0 && (
        <>
          <p className="label-like">Same muscle, a different movement</p>
          <ul className="alts">{related.slice(0, 8).map(item)}</ul>
        </>
      )}
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
    </Dialog>
  )
}
