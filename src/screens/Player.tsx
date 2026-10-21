import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { finishSession, pauseSession, replaceExercise, resumeSession, setPain, setSkipped, updateSet } from '../db/repo'
import { CATALOG, exerciseById } from '../data/catalog'
import { findAlternatives } from '../engine/generate'
import { EQUIPMENT_LABEL, type EquipmentSet, type PlannedExercise, type Profile, type SetLog, type WorkoutSession } from '../engine/types'
import { useNow } from '../hooks/app'
import { ExerciseMedia } from '../components/ExerciseMedia'
import { Button, Card, ConfirmDialog, Dialog, ScreenHeader } from '../components/ui'

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function Player({ session, profile, equipment, onFinished }: {
  session: WorkoutSession
  profile: Profile
  equipment: EquipmentSet
  onFinished: (id: string) => void
}) {
  const logs = useLiveQuery(() => db.setLogs.where('sessionId').equals(session.id).toArray(), [session.id], [] as SetLog[])
  const [rest, setRest] = useState<{ end: number } | null>(null)
  const [replacing, setReplacing] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'finish' | 'abandon' | null>(null)
  const paused = !!session.pausedAt
  const now = useNow(rest || !paused ? 250 : 1000)

  const elapsed = (paused ? new Date(session.pausedAt!).getTime() : now) - new Date(session.startedAt).getTime() - session.pausedMs
  const sorted = useMemo(
    () => [...logs].sort((a, b) => a.slotId.localeCompare(b.slotId, undefined, { numeric: true }) || a.setNumber - b.setNumber),
    [logs],
  )
  const activeSlots = session.actualExercises.filter((a) => !a.skipped).map((a) => a.slotId)
  const relevant = sorted.filter((l) => activeSlots.includes(l.slotId))
  const done = relevant.filter((l) => l.completed).length
  const pending = relevant.length - done
  const remaining = rest ? Math.max(0, Math.ceil((rest.end - now) / 1000)) : 0

  useEffect(() => {
    if (!rest) return
    const t = setTimeout(() => {
      try { navigator.vibrate?.(250) } catch { /* not supported on iPhone Safari */ }
      setRest(null)
    }, Math.max(0, rest.end - Date.now()))
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
      <div className="inline">
        <Button variant="small" onClick={() => (paused ? resumeSession(session.id) : pauseSession(session.id))}>{paused ? 'Resume' : 'Pause'}</Button>
        <Button variant="small" onClick={() => setConfirm('finish')}>Finish</Button>
        <Button variant="small" onClick={() => setConfirm('abandon')}>Discard</Button>
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
            unit={session.weightUnit}
            onSetDone={() => setRest({ end: Date.now() + slot.restSeconds * 1000 })}
            onReplace={() => setReplacing(slot.slotId)}
          />
        )
      })}

      {rest && (
        <div className="rest-bar" role="timer" aria-live="off">
          <span>Rest {clock(remaining * 1000)}</span>
          <span>
            <button type="button" onClick={() => setRest({ end: rest.end + 15000 })}>+15s</button>
            <button type="button" onClick={() => setRest(null)}>Skip</button>
          </span>
        </div>
      )}

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

function ExerciseCard({ slot, actual, sessionId, logs, unit, onSetDone, onReplace }: {
  slot: PlannedExercise
  actual: WorkoutSession['actualExercises'][number]
  sessionId: string
  logs: SetLog[]
  unit: string
  onSetDone: () => void
  onReplace: () => void
}) {
  const ex = exerciseById(actual.exerciseId)
  const original = actual.replacedFromId ? exerciseById(actual.replacedFromId) : undefined
  return (
    <Card className={actual.skipped ? 'skipped' : ''}>
      <p className="big">{ex?.name ?? slot.name}</p>
      {original && <p className="hint">Replaced {original.name}</p>}
      <p className="muted">Target {slot.sets} × {slot.repMin}-{slot.repMax} reps · rest {slot.restSeconds}s</p>
      {actual.skipped ? (
        <div className="inline">
          <span className="muted">Skipped</span>
          <Button variant="small" onClick={() => setSkipped(sessionId, slot.slotId, false)}>Undo skip</Button>
        </div>
      ) : (
        <>
          <div className="set-head" aria-hidden="true"><span>Set</span><span>{unit}</span><span>Reps</span><span>RPE</span><span /></div>
          {logs.map((l) => <SetRow key={l.id} log={l} onDone={onSetDone} />)}
          <div className="inline">
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

function SetRow({ log, onDone }: { log: SetLog; onDone: () => void }) {
  const [w, setW] = useState(log.actualWeight?.toString() ?? '')
  const [r, setR] = useState(log.actualReps?.toString() ?? String(log.plannedRepMax))
  const [e, setE] = useState(log.effortRating?.toString() ?? '')
  const [err, setErr] = useState('')

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
        excludedPatterns: profile.excludedPatterns, experience: profile.experienceLevel,
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
