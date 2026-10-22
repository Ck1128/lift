/**
 * Today's Call: one plain recommendation for today, built only from what is on this phone
 * (your recovery map, your plan, your soreness). It is a rule of thumb, not medical advice.
 *
 * Two ways to use it: Lift decides ("tell", the default) or the person picks a focus and Lift designs that workout ("ask").
 */
import type { DayPlan, Muscle } from './types'
import { MUSCLE_LABEL } from './types'
import { ALL_FINE, FINE_LABEL, fineOfCoarse, type FineMuscle } from './muscleMap'
import type { RecoveryReport } from './recovery'
import type { YogaStyleId } from '../data/yoga'

export type CallMode = 'tell' | 'ask'
export type FocusKey = 'upper' | 'lower' | 'full' | 'push' | 'pull' | 'legs' | 'cardio' | 'express'

export const FOCUS: Record<FocusKey, { label: string; plan: DayPlan }> = {
  upper: { label: 'Upper body', plan: { focus: 'Upper body', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] } },
  lower: { label: 'Lower body', plan: { focus: 'Lower body', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'core'] } },
  full: { label: 'Full body', plan: { focus: 'Full body', muscles: ['quads', 'chest', 'back', 'shoulders', 'core'] } },
  push: { label: 'Push', plan: { focus: 'Push (chest, shoulders, triceps)', muscles: ['chest', 'shoulders', 'triceps'] } },
  pull: { label: 'Pull', plan: { focus: 'Pull (back, biceps)', muscles: ['back', 'biceps', 'core'] } },
  legs: { label: 'Legs', plan: { focus: 'Legs and glutes', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] } },
  cardio: { label: 'Cardio', plan: { focus: 'Cardio', muscles: [], cardioOnly: true } },
  express: { label: 'Express circuit', plan: { focus: 'Express circuit (30 min)', muscles: ['quads', 'chest', 'back', 'hamstrings', 'shoulders', 'core'], circuit: true } },
}
export const EXPRESS_MINUTES = 30
export const FOCUS_ORDER: FocusKey[] = ['full', 'upper', 'lower', 'push', 'pull', 'legs', 'cardio', 'express']
/** Templates the engine may choose on its own. Cardio is only ever a person's choice. */
const AUTO: FocusKey[] = ['upper', 'lower', 'push', 'pull', 'legs', 'full']

export const READY_AT = 80

export type Soreness = Partial<Record<Muscle, 1 | 2 | 3>>

/** 0 to 100 for each of the ten muscle groups. Unknown (never trained) counts as ready: nothing to recover from. */
export function groupReadiness(report: RecoveryReport, soreness: Soreness = {}): Record<Muscle, number> {
  const out = {} as Record<Muscle, number>
  const muscles = Object.keys(MUSCLE_LABEL) as Muscle[]
  for (const m of muscles) {
    const fines = fineOfCoarse(m)
    const vals = fines.map((f) => {
      const r = report.muscles[f]
      if (!r || r.status === 'no_data' || r.status === 'recovered') return 100
      return r.readiness ?? 50
    })
    let v = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 100
    const s = soreness[m]
    if (s === 3) v = Math.min(v, 20)
    else if (s === 2) v = Math.min(v, 60)
    out[m] = Math.round(v)
  }
  return out
}

export interface Fit { pct: number; ready: Muscle[]; tired: Muscle[]; ok: boolean }

export function fitFor(muscles: Muscle[], r: Record<Muscle, number>): Fit {
  if (muscles.length === 0) return { pct: 100, ready: [], tired: [], ok: true }
  const pct = Math.round(muscles.reduce((a, m) => a + r[m], 0) / muscles.length)
  const tired = muscles.filter((m) => r[m] < READY_AT)
  const ready = muscles.filter((m) => r[m] >= READY_AT)
  return { pct, ready, tired, ok: pct >= READY_AT && !muscles.some((m) => r[m] < 50) }
}

export interface YogaPairing { style: YogaStyleId; minutes: number; focus: FineMuscle[]; label: string }

const listWords = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const lower = (s: string) => s.toLowerCase()

/** A short yoga session that stretches the given muscles. Gentle styles, because these muscles are tired or just worked. */
export function pairYoga(muscles: FineMuscle[], kind: 'cooldown' | 'recovery'): YogaPairing {
  const focus = [...new Set(muscles)].filter((m) => ALL_FINE.includes(m)).slice(0, 5)
  const names = focus.map((m) => lower(FINE_LABEL[m]))
  return kind === 'cooldown'
    ? { style: 'gentle', minutes: 10, focus, label: `10 min gentle yoga${names.length ? ` for ${listWords(names)}` : ''}` }
    : { style: 'yin', minutes: 20, focus, label: `20 min yin yoga${names.length ? ` for ${listWords(names)}` : ''}` }
}

export const fineOf = (ms: Muscle[]): FineMuscle[] => ms.flatMap((m) => fineOfCoarse(m))

export interface Call {
  kind: 'train' | 'recover' | 'rest'
  /** The workout to build when kind is 'train'. */
  plan?: DayPlan
  focusKey?: FocusKey
  /** True when this is exactly what the weekly plan already has for today. */
  onPlan: boolean
  /** Train, but go easier on the tired muscles. */
  light: boolean
  headline: string
  reasons: string[]
  yoga?: YogaPairing
}

export interface CallInput {
  report: RecoveryReport
  soreness?: Soreness
  /** What the weekly plan has for today, or null on a rest day. */
  scheduled: DayPlan | null
  yogaOn: boolean
  workoutOn: boolean
}

const hoursOf = (report: RecoveryReport, muscles: Muscle[]): number => {
  const vals = muscles.flatMap((m) => fineOfCoarse(m)).map((f) => report.muscles[f]?.hoursSinceLast ?? 9999)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 9999
}

const sameSet = (a: Muscle[], b: Muscle[]) => a.length === b.length && a.every((m) => b.includes(m))
const names = (ms: Muscle[]) => listWords(ms.map((m) => lower(MUSCLE_LABEL[m])))

/** Lift decides. Same inputs, same answer. */
export function todaysCall(input: CallInput): Call {
  const { report, scheduled } = input
  const soreness = input.soreness ?? {}
  const r = groupReadiness(report, soreness)
  const allMuscles = Object.keys(MUSCLE_LABEL) as Muscle[]
  const tiredAll = allMuscles.filter((m) => r[m] < READY_AT)
  const recoverYoga = (tired: Muscle[]) => (input.yogaOn ? pairYoga(fineOf(tired), 'recovery') : undefined)

  if (!input.workoutOn) {
    return { kind: 'recover', onPlan: false, light: false, headline: 'Yoga today', reasons: ['Workouts are off, so Lift suggests a yoga session.'], yoga: pairYoga([], 'recovery') }
  }

  // Nothing logged yet: follow the plan. There is nothing to recover from.
  if (!report.hasHistory) {
    if (scheduled) {
      const key = (Object.keys(FOCUS) as FocusKey[]).find((k) => sameSet(FOCUS[k].plan.muscles, scheduled.muscles))
      return { kind: 'train', plan: scheduled, focusKey: key, onPlan: true, light: false, headline: scheduled.focus, reasons: ['No workouts are logged yet, so your plan stands.'] }
    }
    return { kind: 'rest', onPlan: false, light: false, headline: 'Rest day', reasons: ['Your plan has today off. Log a workout and Lift can read your recovery.'], yoga: input.yogaOn ? pairYoga([], 'recovery') : undefined }
  }

  // 1. The plan's own workout, if the muscles are ready.
  if (scheduled && (scheduled.cardioOnly || scheduled.muscles.length > 0)) {
    const fit = fitFor(scheduled.muscles, r)
    if (scheduled.cardioOnly || fit.ok) {
      const key = (Object.keys(FOCUS) as FocusKey[]).find((k) => sameSet(FOCUS[k].plan.muscles, scheduled.muscles))
      return {
        kind: 'train', plan: scheduled, focusKey: key, onPlan: true, light: false, headline: scheduled.focus,
        reasons: scheduled.cardioOnly ? ['Easy on the muscles, so it fits today.'] : [`Your ${names(scheduled.muscles)} ${scheduled.muscles.length === 1 ? 'is' : 'are'} recovered (${fit.pct}% ready).`],
      }
    }
  }

  // 2. The best template for what is ready, rotating towards what was trained longest ago.
  const scored = AUTO.map((k) => ({ k, fit: fitFor(FOCUS[k].plan.muscles, r), since: hoursOf(report, FOCUS[k].plan.muscles) }))
  const good = scored.filter((s) => s.fit.ok).sort((a, b) => b.since - a.since || AUTO.indexOf(a.k) - AUTO.indexOf(b.k))
  if (good.length > 0) {
    const pick = good[0]
    const plan = FOCUS[pick.k].plan
    const why = scheduled && !scheduled.cardioOnly
      ? [`Your plan says ${lower(scheduled.focus)}, but ${names(scheduled.muscles.filter((m) => r[m] < READY_AT)) || 'those muscles'} still need rest.`]
      : scheduled === null ? ['Your plan has today off, but your body is ready if you want to train.'] : []
    return {
      kind: 'train', plan, focusKey: pick.k, onPlan: false, light: false, headline: plan.focus,
      reasons: [...why, `${names(plan.muscles)} ${plan.muscles.length === 1 ? 'is' : 'are'} recovered (${pick.fit.pct}% ready).`],
    }
  }

  // 3. Nothing is fully ready. A lighter session if one group is nearly there, otherwise recovery.
  const best = [...scored].sort((a, b) => b.fit.pct - a.fit.pct)[0]
  if (best.fit.pct >= 60 && !best.fit.tired.some((m) => r[m] < 40)) {
    const plan = FOCUS[best.k].plan
    return {
      kind: 'train', plan, focusKey: best.k, onPlan: false, light: true, headline: `${plan.focus}, lighter`,
      reasons: [`${names(best.fit.tired)} ${best.fit.tired.length === 1 ? 'is' : 'are'} still recovering, so keep the weights easy today.`],
      yoga: recoverYoga(best.fit.tired),
    }
  }
  return {
    kind: 'recover', onPlan: false, light: false,
    headline: input.yogaOn ? 'Recovery day' : 'Rest day',
    reasons: [`Most of your muscles are still recovering (${names(tiredAll.slice(0, 4))}${tiredAll.length > 4 ? ' and more' : ''}). Rest, a walk${input.yogaOn ? ' or some gentle stretching' : ''} will help them catch up.`],
    yoga: recoverYoga(tiredAll),
  }
}

/** The person chose the focus. Lift still says how ready those muscles are, but never refuses. */
export function checkChoice(key: FocusKey, report: RecoveryReport, soreness: Soreness = {}): { plan: DayPlan; note: string; light: boolean } {
  const plan = FOCUS[key].plan
  if (key === 'cardio') return { plan, note: 'Cardio is easy on your muscles.', light: false }
  const r = groupReadiness(report, soreness)
  const fit = fitFor(plan.muscles, r)
  if (!report.hasHistory) return { plan, note: 'No workouts are logged yet, so Lift builds this from your profile.', light: false }
  if (fit.ok) return { plan, note: `Your ${names(plan.muscles)} ${plan.muscles.length === 1 ? 'is' : 'are'} recovered (${fit.pct}% ready). Good choice.`, light: false }
  const light = fit.tired.length > 0
  return { plan, note: `${names(fit.tired)} ${fit.tired.length === 1 ? 'is' : 'are'} still recovering (${fit.pct}% ready). Lift will keep it lighter, and you can still go ahead.`, light }
}
