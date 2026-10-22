import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { applyCallToToday, generateFor, recentSoreness } from '../db/repo'
import { getSetting, setSetting, SETTING } from '../db/settings'
import { applyYogaPairing } from '../db/yogaRepo'
import { exerciseById } from '../data/catalog'
import { musclesOfMany } from '../engine/muscleMap'
import {
  checkChoice, FOCUS, FOCUS_ORDER, fineOf, groupReadiness, pairYoga, READY_AT, todaysCall, type CallMode, type FocusKey, type YogaPairing,
} from '../engine/todaysCall'
import { MUSCLE_LABEL, type DayPlan, type Muscle, type Profile, type ScheduledWorkout } from '../engine/types'
import { tracksOf } from '../engine/tracks'
import { Button, Card } from './ui'
import { DurationPicker } from './HomeParts'
import { useRecovery } from '../hooks/useRecovery'
import { useRouter } from '../router'

/**
 * The first thing on Home. Lift reads your recovery map and says what to do today (default), or you pick a focus
 * and Lift designs that workout. Everything stays on this phone.
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
  const soreness = useLiveQuery(() => recentSoreness(today), [today], {} as Partial<Record<Muscle, 1 | 2 | 3>>)
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const [focus, setFocus] = useState<FocusKey | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (mode === undefined || loading || !tracks.workout) return null
  const doneToday = sessions.filter((s) => s.date === today && (s.status === 'completed' || s.status === 'partial'))
  const running = sessions.some((s) => s.status === 'in_progress')
  if (running) return null

  const scheduled: DayPlan | null = sched && sched.status !== 'skipped'
    ? { focus: sched.focus, muscles: sched.targetMuscles, cardioOnly: sched.cardioOnly }
    : null
  const choose = (m: CallMode) => { setFocus(null); setMessage(null); void setSetting(SETTING.callMode, m) }
  const pairYogaNow = async (p: YogaPairing) => { await applyYogaPairing(p); navigate('/yoga') }

  const switcher = (
    <div className="seg seg-wide" role="group" aria-label="Who decides today's workout">
      <button type="button" aria-pressed={mode === 'tell'} onClick={() => choose('tell')}>Lift decides</button>
      <button type="button" aria-pressed={mode === 'ask'} onClick={() => choose('ask')}>I'll choose</button>
    </div>
  )

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

  const build = async (plan: DayPlan, light: Muscle[]) => {
    if (minutes === null) { setMessage('Choose a workout length first.'); return }
    setBusy(true)
    setMessage(null)
    try {
      const row = await applyCallToToday(today, plan, minutes)
      const r = await generateFor(row.id, minutes, { today, force: true, light })
      if (r.kind === 'workout') navigate('/workout')
      else setMessage(r.message)
    } finally {
      setBusy(false)
    }
  }
  const tiredOf = (plan: DayPlan): Muscle[] => {
    const r = groupReadiness(report, soreness)
    return plan.muscles.filter((m) => r[m] < READY_AT)
  }

  if (mode === 'ask') {
    const picked = focus ? checkChoice(focus, report, soreness) : null
    return (
      <Card className="hero call">
        <p className="eyebrow">Today's call</p>
        {switcher}
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
            <p className="label-like">How much time do you have?</p>
            <DurationPicker value={minutes ?? profile.preferredDurationMinutes} onChange={setMinutes} />
            <Button disabled={busy || blocked || minutes === null} onClick={() => void build(picked.plan, picked.light ? tiredOf(picked.plan) : [])}>
              Design my {FOCUS[focus!].label.toLowerCase()} workout ({minutes ?? '?'} min)
            </Button>
          </>
        )}
        {message && <p className="error" role="alert">{message}</p>}
      </Card>
    )
  }

  const call = todaysCall({ report, soreness, scheduled, yogaOn: tracks.yoga, workoutOn: tracks.workout })
  return (
    <Card className="hero call">
      <p className="eyebrow">Today's call</p>
      {switcher}
      <p className="hero-title">{call.headline}</p>
      {call.reasons.map((r, i) => <p key={i} className="muted">{r}</p>)}
      {call.kind === 'train' && call.plan && call.onPlan && <p className="hint">This is the workout in your plan below.</p>}
      {call.kind === 'train' && call.plan && !call.onPlan && (
        <>
          <p className="label-like">How much time do you have?</p>
          <DurationPicker value={minutes ?? profile.preferredDurationMinutes} onChange={setMinutes} />
          <Button disabled={busy || blocked || minutes === null} onClick={() => void build(call.plan!, call.light ? tiredOf(call.plan!) : [])}>
            Build this workout ({minutes ?? '?'} min)
          </Button>
        </>
      )}
      {call.yoga && (
        <Button variant={call.kind === 'train' ? 'ghost' : 'primary'} onClick={() => void pairYogaNow(call.yoga!)}>{call.yoga.label}</Button>
      )}
      {message && <p className="error" role="alert">{message}</p>}
      <p className="hint">An estimate from your own log, not medical advice. If something hurts, rest.</p>
    </Card>
  )
}
