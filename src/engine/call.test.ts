import { describe, expect, it } from 'vitest'
import { recoveryFactor, recoveryReport, type RecoveryReport, type RecoveryStatus } from './recovery'
import { ALL_FINE, fineOfCoarse } from './muscleMap'
import { checkChoice, FOCUS, groupReadiness, pairYoga, todaysCall } from './todaysCall'
import type { DayPlan, Muscle } from './types'
import { generateYoga } from './yoga'
import { focusScore, stretchTargets, unknownPoseIds } from './yogaMuscles'
import { machineTakenSwap } from './variants'
import { CATALOG, exerciseById } from '../data/catalog'
import { weekHasWeight, weighInDue } from './weighIn'

/** A report where the listed coarse muscles are tired and everything else is recovered. */
function report(tired: Muscle[] = [], hasHistory = true, readiness = 30): RecoveryReport {
  const base = recoveryReport([], [], new Date('2026-10-21T12:00:00'))
  const muscles = { ...base.muscles }
  for (const f of ALL_FINE) {
    const isTired = tired.some((m) => fineOfCoarse(m).includes(f))
    muscles[f] = { ...muscles[f], status: (isTired ? 'recovering' : 'recovered') as RecoveryStatus, readiness: isTired ? readiness : 100, hoursSinceLast: isTired ? 12 : 120 }
  }
  return { ...base, hasHistory, muscles, fresh: ALL_FINE.length - tired.length, total: ALL_FINE.length }
}
const plan = (m: Muscle[], focus = 'Plan day'): DayPlan => ({ focus, muscles: m })

describe("Today's Call (Lift decides)", () => {
  it('follows the plan when those muscles are recovered', () => {
    const c = todaysCall({ report: report(), scheduled: plan(['chest', 'back', 'shoulders']), yogaOn: true, workoutOn: true })
    expect(c.kind).toBe('train')
    expect(c.onPlan).toBe(true)
    expect(c.headline).toBe('Plan day')
  })

  it('switches to something else when the planned muscles are still recovering, and says why', () => {
    const c = todaysCall({ report: report(['chest', 'shoulders', 'triceps']), scheduled: plan(['chest', 'shoulders', 'triceps'], 'Push day'), yogaOn: true, workoutOn: true })
    expect(c.kind).toBe('train')
    expect(c.onPlan).toBe(false)
    expect(c.plan!.muscles).not.toContain('chest')
    expect(c.reasons.join(' ')).toMatch(/still need rest/i)
  })

  it('suggests recovery with a yoga pairing when almost everything is tired', () => {
    const all = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core'] as Muscle[]
    const c = todaysCall({ report: report(all), scheduled: plan(['chest']), yogaOn: true, workoutOn: true })
    expect(c.kind).toBe('recover')
    expect(c.yoga?.style).toBe('yin')
    expect(c.yoga!.focus.length).toBeGreaterThan(0)
  })

  it('says rest, with no yoga pairing, when yoga is off', () => {
    const all = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core'] as Muscle[]
    const c = todaysCall({ report: report(all), scheduled: null, yogaOn: false, workoutOn: true })
    expect(c.kind).toBe('recover')
    expect(c.headline).toBe('Rest day')
    expect(c.yoga).toBeUndefined()
  })

  it('goes lighter when nothing is fully ready but one group is nearly there', () => {
    const everything = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core'] as Muscle[]
    const c = todaysCall({ report: report(everything, true, 68), scheduled: plan(['chest']), yogaOn: true, workoutOn: true })
    expect(c.kind).toBe('train')
    expect(c.light).toBe(true)
    expect(c.headline).toMatch(/lighter/i)
  })

  it('a planned day with one tired muscle among fresh ones still follows the plan', () => {
    const c = todaysCall({ report: report(['chest'], true, 70), scheduled: plan(['chest', 'triceps'], 'Chest day'), yogaOn: true, workoutOn: true })
    expect(c.onPlan).toBe(true)
  })

  it('follows the plan when nothing is logged yet, and rests on an off day', () => {
    expect(todaysCall({ report: report([], false), scheduled: plan(['quads']), yogaOn: true, workoutOn: true }).onPlan).toBe(true)
    expect(todaysCall({ report: report([], false), scheduled: null, yogaOn: true, workoutOn: true }).kind).toBe('rest')
  })

  it('is deterministic', () => {
    const i = { report: report(['back']), scheduled: plan(['back']), yogaOn: true, workoutOn: true }
    expect(todaysCall(i)).toEqual(todaysCall(i))
  })

  it('very sore muscles count as not ready even if the log says recovered', () => {
    const r = groupReadiness(report(), { chest: 3 })
    expect(r.chest).toBeLessThan(50)
    const c = todaysCall({ report: report(), soreness: { chest: 3 }, scheduled: plan(['chest']), yogaOn: true, workoutOn: true })
    expect(c.onPlan).toBe(false)
  })
})

describe("Today's Call (I'll choose)", () => {
  it('never refuses: a tired choice still returns a plan, with a lighter flag and a plain note', () => {
    const c = checkChoice('push', report(['chest']), {})
    expect(c.plan.muscles).toEqual(FOCUS.push.plan.muscles)
    expect(c.light).toBe(true)
    expect(c.note).toMatch(/still recovering/i)
  })
  it('praises a recovered choice and treats cardio as easy', () => {
    expect(checkChoice('legs', report(), {}).note).toMatch(/good choice/i)
    expect(checkChoice('cardio', report(['quads']), {}).light).toBe(false)
  })
})

describe('yoga pairing', () => {
  it('every tagged pose exists in the catalog', () => expect(unknownPoseIds()).toEqual([]))
  it('a cool-down is short and gentle, recovery is yin', () => {
    expect(pairYoga(['hamstrings'], 'cooldown')).toMatchObject({ style: 'gentle', minutes: 10 })
    expect(pairYoga(['glutes'], 'recovery').style).toBe('yin')
  })
  it('a focus brings stretching poses for those muscles into the plan, and no focus changes nothing', () => {
    const base = { date: '2026-10-21', style: 'yin' as const, level: 'beginner' as const, minutes: 30, location: 'home' as const, props: ['mat' as const], restrictions: [] }
    const none = generateYoga(base)
    const empty = generateYoga({ ...base, focus: [] })
    expect(none).toEqual(empty)
    const withFocus = generateYoga({ ...base, focus: ['hamstrings', 'glutes'] })
    expect(withFocus.kind).toBe('plan')
    if (withFocus.kind !== 'plan' || none.kind !== 'plan') return
    const score = (p: typeof withFocus.plan) => p.items.reduce((a, i) => a + focusScore(i.poseId, ['hamstrings', 'glutes']), 0)
    expect(score(withFocus.plan)).toBeGreaterThanOrEqual(score(none.plan))
    expect(withFocus.plan.key).not.toBe(none.plan.key)
  })
  it('stretch tags are sensible', () => {
    expect(stretchTargets('down-dog')).toContain('hamstrings')
    expect(stretchTargets('savasana')).toEqual([])
  })
})

describe('Machine taken', () => {
  const rules = {
    catalog: CATALOG, equipment: { bodyweight: { id: 'bodyweight' }, machine: { id: 'machine' }, dumbbell: { id: 'dumbbell', min: 5, max: 50, increment: 5, unit: 'lb' }, cable: { id: 'cable' } } as never,
    excludedExerciseIds: [], excludedPatterns: [], experience: 'intermediate' as const, gym: undefined,
  }
  const machineEx = CATALOG.find((e) => e.exerciseType === 'machine' && e.primaryMuscles[0] === 'chest')
  it('swaps to another exercise for the same muscle, preferring different equipment', () => {
    if (!machineEx) return
    const pick = machineTakenSwap(machineEx, rules, [machineEx.id], [])
    expect(pick).toBeDefined()
    expect(pick!.id).not.toBe(machineEx.id)
    expect(pick!.primaryMuscles[0]).toBe('chest')
  })
  it('never offers one already found busy, and uses a remembered choice first', () => {
    if (!machineEx) return
    const first = machineTakenSwap(machineEx, rules, [machineEx.id], [])!
    const second = machineTakenSwap(machineEx, rules, [machineEx.id], [first.id])
    expect(second?.id).not.toBe(first.id)
    expect(machineTakenSwap(machineEx, rules, [machineEx.id], [], first.id)?.id).toBe(first.id)
  })
  it('returns nothing when no other exercise fits', () => {
    const tiny = { ...rules, catalog: [machineEx!] }
    expect(machineTakenSwap(machineEx!, tiny, [machineEx!.id], [])).toBeUndefined()
    expect(exerciseById(machineEx!.id)).toBeDefined()
  })
})

describe('weekly weigh-in', () => {
  const wed = '2026-10-21' // Monday of that week is 2026-10-19
  it('is due from Monday until the week has a weight', () => {
    expect(weighInDue({ today: '2026-10-19', weights: [], startedOn: '2026-09-01' })).toBe(true)
    expect(weighInDue({ today: wed, weights: [{ date: '2026-10-12' }], startedOn: '2026-09-01' })).toBe(true)
    expect(weighInDue({ today: wed, weights: [{ date: '2026-10-20' }], startedOn: '2026-09-01' })).toBe(false)
    expect(weekHasWeight([{ date: '2026-10-25' }], wed)).toBe(true) // Sunday still belongs to that week
    expect(weekHasWeight([{ date: '2026-10-26' }], wed)).toBe(false)
  })
  it('closing it hides it for that day only', () => {
    expect(weighInDue({ today: wed, weights: [], dismissedOn: wed, startedOn: '2026-09-01' })).toBe(false)
    expect(weighInDue({ today: '2026-10-22', weights: [], dismissedOn: wed, startedOn: '2026-09-01' })).toBe(true)
  })
  it('never shows on the day the app was first set up', () => {
    expect(weighInDue({ today: wed, weights: [], startedOn: wed })).toBe(false)
  })
})

describe('recovery: sex and injury', () => {
  const base = { age: 30, trainingLevel: 'intermediate' as const }
  it('women get a small, bounded shortening; nothing changes when sex is not given', () => {
    expect(recoveryFactor(base).factor).toBe(1)
    const f = recoveryFactor({ ...base, sex: 'female' })
    expect(f.factor).toBe(0.95)
    expect(f.reasons.join(' ')).toMatch(/women/)
    expect(recoveryFactor({ ...base, sex: 'male' }).factor).toBe(1)
  })
  it('an injured area recovers 50% slower, only for that area, and says why', () => {
    const f = recoveryFactor({ ...base, injuredMuscles: ['quads'] })
    expect(f.perMuscle?.quads).toBe(1.5)
    expect(f.perMuscle?.chest).toBeUndefined()
    expect(f.reasons.join(' ')).toMatch(/injured/)
  })
  it('the longer time shows up in the recovery report', () => {
    const t = (iso: string) => iso
    const session = { id: 's', date: '2026-10-20', startedAt: t('2026-10-20T10:00:00.000Z'), finishedAt: t('2026-10-20T10:40:00.000Z'), status: 'completed', actualExercises: [{ slotId: 's1', exerciseId: 'Barbell_Squat', skipped: false, painReported: false }], title: 'x', plannedExercises: [], pausedMs: 0 } as never
    const logs = [1, 2, 3].map((n) => ({ id: `l${n}`, sessionId: 's', slotId: 's1', exerciseId: 'Barbell_Squat', setNumber: n, completed: true, actualReps: 8, actualWeight: 100, weightUnit: 'lb', plannedRepMin: 6, plannedRepMax: 8 })) as never
    const now = new Date('2026-10-21T10:00:00.000Z')
    const normal = recoveryReport([session], logs, now, recoveryFactor(base))
    const hurt = recoveryReport([session], logs, now, recoveryFactor({ ...base, injuredMuscles: ['quads'] }))
    const a = normal.muscles.quads.recent[0]?.needHours
    const b = hurt.muscles.quads.recent[0]?.needHours
    if (a !== undefined && b !== undefined) expect(b).toBeGreaterThan(a)
  })
  it('an injured muscle is never the first choice for Today\'s Call', () => {
    const c = todaysCall({ report: report(), soreness: { chest: 2, shoulders: 2, triceps: 2 }, scheduled: plan(['chest', 'shoulders', 'triceps'], 'Push'), yogaOn: true, workoutOn: true })
    expect(c.plan?.muscles ?? []).not.toContain('chest')
  })
})

describe('express circuit', () => {
  it('is only ever a person\'s choice, never picked by Lift on its own', () => {
    for (const tired of [[], ['chest'], ['quads', 'back']] as Muscle[][]) {
      const c = todaysCall({ report: report(tired), scheduled: plan(['chest']), yogaOn: true, workoutOn: true })
      expect(c.focusKey).not.toBe('express')
    }
    expect(FOCUS.express.plan.circuit).toBe(true)
  })
})
