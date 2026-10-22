import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { deleteYogaSession, finishYoga, markYogaItem, reopenYoga, setYogaNotes } from '../db/yogaRepo'
import { PROP_LABEL, poseById } from '../data/yoga'
import { YogaPoseHelp, type PoseHelpInput } from '../components/YogaPoseHelp'
import { itemTotalSeconds, yogaCalories } from '../engine/yoga'
import { addRest, formatClock, isPaused, pauseRest, remainingMs, resumeRest, startRest, type RestTimer } from '../engine/restTimer'
import { formatDay } from '../engine/dates'
import type { Profile } from '../engine/types'
import { useNow } from '../hooks/app'
import { Button, Card, ConfirmDialog, ScreenHeader } from '../components/ui'
import { SendToHealthButton } from '../components/HealthPanel'
import { yogaItem } from '../engine/health'
import { useRouter } from '../router'

/** The plan item stores a copy of the text; the catalog adds the position and sanskrit name when the pose still exists. */
const helpFor = (it: { poseId?: string; name: string; instructions: string[]; cautions: string[]; modifications: string[] }): PoseHelpInput => {
  const id = it.poseId ?? ''
  const pose = poseById(id)
  return { id, name: it.name, sanskrit: pose?.sanskrit, position: pose?.position ?? 'standing', instructions: it.instructions, cautions: it.cautions, modifications: it.modifications }
}

const STATUS = { in_progress: 'In progress', completed: 'Completed', partial: 'Partly done', abandoned: 'Discarded' } as const

export function YogaSessionPage({ sessionId, profile }: { sessionId: string; profile: Profile; today: string }) {
  const s = useLiveQuery(() => db.yogaSessions.get(sessionId), [sessionId], undefined)
  const { back, replace } = useRouter()
  const [timer, setTimer] = useState<{ index: number; t: RestTimer } | null>(null)
  const [confirm, setConfirm] = useState<'discard' | 'delete' | null>(null)
  const [notes, setNotes] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const now = useNow(250, timer !== null)

  if (s === undefined) return <p className="muted">Loading...</p>
  if (!s) return <><ScreenHeader title="Session not found" /><Button variant="ghost" onClick={back}>Back</Button></>

  const live = s.status === 'in_progress'
  const next = s.plan.items.find((i) => !s.completedItems.includes(i.index) && !s.skippedItems.includes(i.index))
  const kcal = yogaCalories(s.style, s.durationSeconds, profile.weightKg)
  const finish = async () => { await finishYoga(s.id, 'finish'); setMsg('Saved.') }

  return (
    <>
      <ScreenHeader title={s.styleName} subtitle={`${formatDay(s.date)} · ${STATUS[s.status]}`} />
      <div className="inline">
        {live
          ? <Button variant="small" className="finish-top" onClick={() => void finish()}>Finish session</Button>
          : <Button variant="small" onClick={async () => { const r = await reopenYoga(s.id); setMsg(r.ok ? '' : (r.reason ?? '')) }}>Edit or resume</Button>}
        {live && <Button variant="small" onClick={() => setConfirm('discard')}>Discard</Button>}
      </div>
      {msg && <p className="notice" role="status">{msg}</p>}
      {!live && <div className="inline"><SendToHealthButton build={(k) => yogaItem(s, k, kcal ? Math.round((kcal.low + kcal.high) / 2) : undefined)} /></div>}
      <p className="muted">{s.completedItems.length} of {s.plan.items.length} poses done · {Math.round(s.durationSeconds / 60)} min</p>
      {kcal && !live && <p className="hint">Roughly {kcal.low} to {kcal.high} calories (an estimate, not a measurement).</p>}
      {s.plan.cautions.map((c, i) => <p key={i} className="notice" role="note">{c}</p>)}

      {s.plan.items.map((it) => {
        const done = s.completedItems.includes(it.index)
        const skipped = s.skippedItems.includes(it.index)
        const current = live && next?.index === it.index
        const t = timer?.index === it.index ? timer.t : null
        return (
          <Card key={it.index} className={`${current ? 'today' : ''} ${skipped ? 'skipped' : ''}`}>
            <p className="muted">{it.phase}{it.optional ? ' · optional' : ''}</p>
            <p className="big">{it.index + 1}. {it.name}{done ? ' ✓' : ''}</p>
            <p className="muted">{it.perSide ? `${it.seconds}s each side` : formatClock(it.seconds * 1000)} · {formatClock(itemTotalSeconds(it) * 1000)} total{it.props.length ? ` · ${it.props.map((p) => PROP_LABEL[p]).join(', ')}` : ''}</p>
            {current ? <YogaPoseHelp pose={helpFor(it)} /> : (
              <details>
                <summary className="muted">How to do it</summary>
                <YogaPoseHelp pose={helpFor(it)} />
              </details>
            )}
            {current && (
              <div className="inline">
                {!t
                  ? <Button variant="small" onClick={() => setTimer({ index: it.index, t: startRest(Date.now(), it.seconds) })}>Start {it.perSide ? 'side timer' : 'timer'}</Button>
                  : (
                    <span role="timer" aria-label="Pose timer" className="big">{formatClock(remainingMs(t, now))}</span>
                  )}
                {t && (isPaused(t)
                  ? <Button variant="small" onClick={() => setTimer({ index: it.index, t: resumeRest(t, Date.now()) })}>Resume</Button>
                  : <Button variant="small" onClick={() => setTimer({ index: it.index, t: pauseRest(t, Date.now()) })}>Pause</Button>)}
                {t && <Button variant="small" onClick={() => setTimer({ index: it.index, t: addRest(t, 15, Date.now()) })}>+15s</Button>}
              </div>
            )}
            {(live || s.status !== 'abandoned') && (
              <div className="inline">
                <Button variant="small" aria-pressed={done} onClick={() => { setTimer(null); void markYogaItem(s.id, it.index, done ? 'clear' : 'done') }}>{done ? 'Done ✓ (undo)' : 'Mark done'}</Button>
                <Button variant="small" aria-pressed={skipped} onClick={() => { setTimer(null); void markYogaItem(s.id, it.index, skipped ? 'clear' : 'skipped') }}>{skipped ? 'Skipped (undo)' : 'Skip'}</Button>
              </div>
            )}
          </Card>
        )
      })}

      <Card title="Notes (optional)">
        <label className="sr-only" htmlFor="y-notes">Notes</label>
        <textarea id="y-notes" rows={2} maxLength={300} value={notes ?? s.notes ?? ''} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== null && void setYogaNotes(s.id, notes)} />
      </Card>

      {live && <Button className="finish-bottom" onClick={() => void finish()}>Finish session</Button>}
      <Button variant="ghost" onClick={() => setConfirm('delete')}>Delete this session</Button>

      {confirm === 'discard' && (
        <ConfirmDialog title="Discard this session?" message="It is kept in your history as discarded and does not count toward your progress." confirmLabel="Discard" danger
          onCancel={() => setConfirm(null)} onConfirm={async () => { setConfirm(null); await finishYoga(s.id, 'discard') }} />
      )}
      {confirm === 'delete' && (
        <ConfirmDialog title="Delete this session?" message="This removes the session from your history for good." confirmLabel="Delete" danger
          onCancel={() => setConfirm(null)} onConfirm={async () => { setConfirm(null); await deleteYogaSession(s.id); replace('/yoga') }} />
      )}
    </>
  )
}
