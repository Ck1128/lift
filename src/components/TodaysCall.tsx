import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { applyCallToToday, generateFor, recentSoreness } from '../db/repo'
import { getSetting, setSetting, SETTING } from '../db/settings'
import { applyYogaPairing } from '../db/yogaRepo'
import { exerciseById } from '../data/catalog'
import { musclesOfMany } from '../engine/muscleMap'
import {
  checkChoice, EXPRESS_MINUTES, FOCUS, FOCUS_ORDER, fineOf, groupReadiness, pairYoga, READY_AT, todaysCall, type CallMode, type FocusKey, type YogaPairing,
} from '../engine/todaysCall'
import { MUSCLE_LABEL, type DayPlan, type Muscle, type Profile, type ScheduledWorkout } from '../engine/types'
import { tracksOf } from '../engine/tracks'
import { Button, Card } from './ui'
import { DurationPicker } from './HomeParts'
import { useRecovery } from '../hooks/useRecovery'
import { useRouter } from '../router'

/**
 * The one workout card on Home. Lift reads your recovery and says what to do today (default). Underneath the main
 * button are two quiet options: "I'll choose" (pick a focus and Lift designs it) and the 30 minute express circuit.
 */
export function TodaysCall({ profile, today, sched, minutes, setMinutes, blocked }: {
  profile: Profile
  today: string
  sched: ScheduledWorkout | undefined | null
  minutes: number | null
  setMinutes: (m: number | null) => void
  /** Missing profile details that must be filled in before a workout can be built. */
  blocked: boolean
}) {
  const { navigate } = useRouter()
  const tracks = tracksOf(profile)
  const { report, loading } = useRecovery()
  const mode = useLiveQuery(() => getSetting<CallMode>(SETTING.callMode, 'tell'), [], undefined)
  const reported = useLiveQuery(() => recentSoreness(today), [today], {} as Partial<Record<Muscle, 1 | 2 | 3>>)
  // An injured area counts as at least moderately sore, so Lift never makes it the first choice.
  const soreness: Partial<Record<Muscle, 1 | 2 | 3>> = { ...reported }
  for (const m of profile.injuredMuscles ?? []) if ((soreness[m] ?? 0) < 2) soreness[m] = 2
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const [focus, setFocus] = useState<FocusKey | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (mode === undefined || loading || !tracks.workout) return null
  const doneToday = sessions.filter((s) => s.date === today && s.status === 'completed')
  if (sessions.some((s) => s.status === 'in_progress')) return null

  const scheduled: DayPlan | null = sched && sched.status !== 'skipped'
    ? { focus: sched.focus, muscles: sched.targetMuscles, cardioOnly: sched.cardioOnly }
    : null
  const setMode = (m: CallMode) => { setFocus(null); setMessage(null); void setSetting(SETTING.callMode, m) }
  const pairYogaNow = async (p: YogaPairing) => { await applyYogaPairing(p); navigate('/yoga') }
  const tiredOf = (plan: DayPlan): Muscle[] => {
    const r = groupReadiness(report, soreness)
    return plan.muscles.filter((m) => r[m] < READY_AT)
  }

  // After a workout today: a short cool-down for what was just worked.
  if (doneToday.length > 0) {
    if (!tracks.yoga) return null
    const used = musclesOfMany(doneToday.flatMap((s) => s.actualExercises.filter((a) => !a.skipped).map((a) => exerciseById(a.exerciseId))))
    const pairing = pairYoga(used.primary, 'cooldown')
    if (pairing.focus.length === 0) return null
    return (
      <Card className="hero call">
        <p className="eyebrow">Cool down</p>
        <p className="hero-title">Stretch what you just worked</p>
        <p className="muted">{pairing.label}. Poses for those muscles come first.</p>
        <Button onClick={() => void pairYogaNow(pairing)}>Set up the cool-down</Button>
      </Card>
    )
  }

  /** Build a different workout than the plan's. */
  const build = async (plan: DayPlan, light: Muscle[]) => {
    const mins = plan.circuit ? EXPRESS_MINUTES : minutes
    if (mins === null) { setMessage('Choose a workout length first.'); return }
    setBusy(true)
    setMessage(null)
    try {
      const row = await applyCallToToday(today, plan, mins)
      const r = await generateFor(row.id, mins, { today, force: true, light })
      if (r.kind === 'workout') navigate('/workout')
      else setMessage(r.message)
    } finally {
      setBusy(false)
    }
  }
  /** Open (or build) the workout that is already planned for today. */
  const openPlanned = async (id: string) => {
    if (minutes === null) { setMessage('Choose a workout length first.'); return }
    setBusy(true)
    setMessage(null)
    try {
      const r = await generateFor(id, minutes, { today })
      if (r.kind === 'workout') navigate('/workout')
      else setMessage(r.message)
    } finally {
      setBusy(false)
    }
  }

  const length = (
    <>
      <p className="label-like">How much time do you have?</p>
      <DurationPicker value={minutes ?? profile.preferredDurationMinutes} onChange={setMinutes} />
    </>
  )
  const err = message && <p className="error" role="alert">{message}</p>

  // ---------- I'll choose ----------
  if (mode === 'ask') {
    const picked = focus ? checkChoice(focus, report, soreness) : null
    return (
      <Card className="hero call">
        <p className="eyebrow">Today's call</p>
        <p className="hero-title">What do you feel like today?</p>
        <div className="chips" role="group" aria-label="Workout focus">
          {FOCUS_ORDER.map((k) => (
            <button key={k} type="button" className={focus === k ? 'chip on' : 'chip'} aria-pressed={focus === k} onClick={() => { setFocus(k); setMessage(null) }}>{FOCUS[k].label}</button>
          ))}
          {tracks.yoga && <button type="button" className="chip" onClick={() => void pairYogaNow(pairYoga(fineOf(tiredOf({ focus: '', muscles: Object.keys(MUSCLE_LABEL) as Muscle[] }).slice(0, 4)), 'recovery'))}>Yoga</button>}
        </div>
        {picked && (
          <>
            <p className="muted" role="status">{picked.note}</p>
            {focus !== 'express' && length}
            <Button disabled={busy || blocked || (focus !== 'express' && minutes === null)} onClick={() => void build(picked.plan, picked.light ? tiredOf(picked.plan) : [])}>
              Design my {FOCUS[focus!].label.toLowerCase()} {focus === 'express' ? '' : 'workout '}({focus === 'express' ? EXPRESS_MINUTES : (minutes ?? '?')} min)
            </Button>
          </>
        )}
        {err}
        <p className="call-alt"><button type="button" className="pill" onClick={() => setMode('tell')}>Let Lift decide</button></p>
      </Card>
    )
  }

  // ---------- Lift decides ----------
  const call = todaysCall({ report, soreness, scheduled, yogaOn: tracks.yoga, workoutOn: tracks.workout })
  const planned = call.kind === 'train' && call.plan ? call.plan : null
  const hasWorkout = !!sched?.workout
  return (
    <Card className="hero call">
      <p className="eyebrow">{planned ? "Today's focus" : "Today's call"}</p>
      <p className="hero-title">{call.headline}</p>
      {planned && planned.muscles.length > 0 && <p className="muted">{planned.muscles.map((m) => MUSCLE_LABEL[m]).join(' · ')}</p>}
      {call.reasons.map((r, i) => <p key={i} className="hint">{r}</p>)}
      {sched?.status === 'partial' && call.onPlan && <p className="muted">You did part of this workout today.</p>}
      {planned && (
        <>
          {length}
          <Button
            disabled={busy || blocked || minutes === null}
            onClick={() => void (call.onPlan && sched ? openPlanned(sched.id) : build(planned, call.light ? tiredOf(planned) : []))}
          >
            {call.onPlan && sched
              ? `${hasWorkout ? 'View / update workout' : 'Generate workout'} (${minutes ?? '?'} min)`
              : `Build this workout (${minutes ?? '?'} min)`}
          </Button>
        </>
      )}
      {call.yoga && <Button variant={planned ? 'ghost' : 'primary'} onClick={() => void pairYogaNow(call.yoga!)}>{call.yoga.label}</Button>}
      {err}
      <p className="call-alt">
        <button type="button" className="pill" onClick={() => setMode('ask')}>{planned ? "I'll choose" : 'I want to train anyway'}</button>
        <button type="button" className="pill" disabled={busy || blocked} onClick={() => void build(FOCUS.express.plan, tiredOf(FOCUS.express.plan))}>Express circuit · 30 min</button>
      </p>
      <p className="hint">An estimate from your own log, not medical advice. If something hurts, rest.</p>
    </Card>
  )
}
