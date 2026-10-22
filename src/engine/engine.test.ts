import { CATALOG } from '../data/catalog'
import { generateWorkout, findAlternatives, configHash, type GenerateInput } from './generate'
import { generateWeeklySchedule, coverageOf } from './split'
import { presetEquipment, availableIds } from './equipment'
import { suggestLoad, snapToSpec } from './progression'
import { estimateCalories } from './calories'
import { suggestReschedule } from './reschedule'
import { estimateSeconds, restSecondsFor } from './time'
import { validateExercise } from './validate'
import { profileFormFrom, validateProfileForm, type ProfileForm } from './validateProfile'
import { convertWeight } from './units'
import { addDays, weekdayIndex, startOfWeek } from './dates'
import type { LastPerformance, EquipmentId, Exercise } from './types'

const base = (over: Partial<GenerateInput> = {}): GenerateInput => ({
  date: '2026-10-21',
  planDay: { focus: 'Upper body', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  minutes: 45,
  goal: 'muscle',
  experience: 'intermediate',
  equipment: presetEquipment('planet_fitness', 'lb'),
  excludedExerciseIds: [],
  excludedPatterns: [],
  catalog: CATALOG,
  lastPerformance: {},
  soreness: {},
  weightUnit: 'lb',
  ...over,
})

function workoutOf(input: GenerateInput) {
  const r = generateWorkout(input)
  if (r.kind !== 'workout') throw new Error('expected workout, got ' + r.kind)
  return r.workout
}

/** Strength exercises only. Cardio blocks are not in the exercise catalog. */
const lifts = (w: { exercises: { kind?: string }[] }) => w.exercises.filter((e) => e.kind !== 'cardio') as ReturnType<typeof workoutOf>['exercises']

describe('catalog', () => {
  it('has stable unique ids and only valid entries', () => {
    const ids = CATALOG.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(CATALOG.length).toBeGreaterThan(150)
    for (const e of CATALOG) expect(validateExercise(e)).toEqual([])
  })
  it('flags entries with missing metadata', () => {
    expect(validateExercise({ id: 'x', name: 'x' })).toEqual(
      expect.arrayContaining(['no primary muscle', 'no equipment listed', 'no instructions']),
    )
  })
  it('has no barbell-only exercise hiding behind the Smith machine', () => {
    const smith = CATALOG.filter((e) => e.name.toLowerCase().includes('smith'))
    expect(smith.length).toBeGreaterThan(3)
    for (const e of smith) expect(e.equipmentIds).toContain('smith')
  })
})

describe('equipment and exclusions', () => {
  it('Planet Fitness preset has no barbell', () => {
    const avail = availableIds(presetEquipment('planet_fitness', 'lb'))
    expect(avail.has('barbell')).toBe(false)
    expect(avail.has('smith')).toBe(true)
  })

  it('never selects an exercise whose equipment is unavailable (all locations, all muscle splits)', () => {
    for (const kind of ['home', 'planet_fitness', 'generic_gym'] as const) {
      const equipment = presetEquipment(kind, 'lb')
      const avail = availableIds(equipment)
      for (const muscles of [['chest', 'back'], ['quads', 'hamstrings', 'glutes', 'calves'], ['shoulders', 'biceps', 'triceps', 'core']] as const) {
        const r = generateWorkout(base({ equipment, planDay: { focus: 't', muscles: [...muscles] } }))
        if (r.kind !== 'workout') continue
        for (const pe of lifts(r.workout)) {
          const ex = CATALOG.find((e) => e.id === pe.exerciseId)!
          for (const q of ex.equipmentIds) expect(avail.has(q as EquipmentId)).toBe(true)
        }
      }
    }
  })

  it('removing equipment changes future workouts', () => {
    const eq = presetEquipment('planet_fitness', 'lb')
    const withDb = lifts(workoutOf(base({ equipment: eq, experience: 'regular' }))).map((e) => e.exerciseId)
    eq.dumbbell = { ...eq.dumbbell!, available: false }
    const without = lifts(workoutOf(base({ equipment: eq, experience: 'regular' })))
    for (const e of without) expect(CATALOG.find((c) => c.id === e.exerciseId)!.equipmentIds).not.toContain('dumbbell')
    expect(without.map((e) => e.exerciseId)).not.toEqual(withDb)
  })

  it('home with only bodyweight still returns a workout using no equipment', () => {
    const w = workoutOf(base({ equipment: presetEquipment('home', 'lb'), planDay: { focus: 'Lower', muscles: ['quads', 'glutes', 'core'] } }))
    for (const pe of lifts(w)) {
      const ex = CATALOG.find((e) => e.id === pe.exerciseId)!
      expect(ex.equipmentIds.every((q) => q === 'bodyweight')).toBe(true)
    }
  })

  it('never selects excluded exercises or patterns', () => {
    const first = lifts(workoutOf(base())).map((e) => e.exerciseId)
    const w = workoutOf(base({ excludedExerciseIds: first }))
    for (const e of lifts(w)) expect(first).not.toContain(e.exerciseId)
    const w2 = workoutOf(base({ excludedPatterns: ['push'] }))
    for (const pe of lifts(w2)) expect(CATALOG.find((e) => e.id === pe.exerciseId)!.movementPattern).not.toBe('push')
  })

  it('returns a clear error when nothing is eligible', () => {
    const all = CATALOG.map((e) => e.id)
    const r = generateWorkout(base({ excludedExerciseIds: all }))
    expect(r.kind).toBe('error')
    if (r.kind === 'error') expect(r.message).toMatch(/equipment and exclusions/i)
  })

  it('beginners only get beginner exercises', () => {
    const w = workoutOf(base({ experience: 'beginner' }))
    for (const pe of lifts(w)) expect(CATALOG.find((e) => e.id === pe.exerciseId)!.difficulty).toBe('beginner')
  })

  it('alternatives respect exclusions and equipment', () => {
    const current = CATALOG.find((e) => e.primaryMuscles[0] === 'chest' && e.equipmentIds.includes('machine'))!
    const alts = findAlternatives(current, base())
    expect(alts.length).toBeGreaterThan(0)
    const avail = availableIds(base().equipment)
    for (const a of alts) {
      expect(a.primaryMuscles[0]).toBe('chest')
      expect(a.equipmentIds.every((q) => avail.has(q))).toBe(true)
    }
    const banned = alts[0].id
    expect(findAlternatives(current, base({ excludedExerciseIds: [banned] })).map((a) => a.id)).not.toContain(banned)
  })
})

describe('time and fit', () => {
  it('is deterministic', () => {
    expect(generateWorkout(base())).toEqual(generateWorkout(base()))
  })

  it('longer sessions get more work than shorter ones', () => {
    const short = workoutOf(base({ minutes: 20 }))
    const long = workoutOf(base({ minutes: 60 }))
    const vol = (w: typeof short) => w.exercises.reduce((n, e) => n + e.sets, 0)
    expect(vol(long)).toBeGreaterThan(vol(short))
  })

  it('every generated session that claims to fit really fits its own estimate', () => {
    for (const minutes of [20, 30, 45, 60, 75]) {
      const w = workoutOf(base({ minutes }))
      const secs = estimateSeconds(lifts(w), 'muscle', minutes, w.cardioMinutes ?? 0)
      expect(Math.ceil(secs / 60)).toBe(w.estimatedMinutes)
      if (w.fits) expect(secs).toBeLessThanOrEqual(minutes * 60)
    }
  })

  it('says so when it cannot fit, instead of claiming it does', () => {
    const w = workoutOf(base({ minutes: 15, goal: 'strength' }))
    if (!w.fits) expect(w.notes.join(' ')).toMatch(/longer than/)
    else expect(w.estimatedMinutes).toBeLessThanOrEqual(15)
  })

  it('a short session still starts with the scheduled muscles', () => {
    const w = workoutOf(base({ minutes: 20 }))
    const muscles = new Set(lifts(w).flatMap((e) => CATALOG.find((c) => c.id === e.exerciseId)!.primaryMuscles))
    expect([...muscles].every((m) => base().planDay!.muscles.includes(m))).toBe(true)
  })

  it('every exercise has sets, reps, rest and an explanation', () => {
    for (const e of lifts(workoutOf(base()))) {
      expect(e.sets).toBeGreaterThanOrEqual(2)
      expect(e.repMin).toBeLessThanOrEqual(e.repMax)
      expect(e.restSeconds).toBeGreaterThan(0)
      expect(e.why.length).toBeGreaterThan(10)
    }
  })

  it('rest times follow the goal', () => {
    expect(restSecondsFor('strength', true)).toBeGreaterThan(restSecondsFor('endurance', true))
  })

  it('rejects invalid duration and returns a rest-day result', () => {
    expect(generateWorkout(base({ minutes: 5 })).kind).toBe('error')
    expect(generateWorkout(base({ planDay: null })).kind).toBe('rest')
  })

  it('soreness reduces volume and adds a note', () => {
    const normal = workoutOf(base({ minutes: 90 }))
    const sore = workoutOf(base({ minutes: 90, soreness: { chest: 3 } }))
    const sets = (w: typeof normal) => w.exercises.reduce((n, e) => n + e.sets, 0)
    expect(sets(sore)).toBeLessThanOrEqual(sets(normal))
    expect(sore.notes.join(' ')).toMatch(/soreness/i)
  })
})

describe('weekly split', () => {
  it.each([1, 2, 3, 4, 5, 6])('builds a plan for %i training days', (n) => {
    const days = [0, 1, 2, 3, 4, 5].slice(0, n)
    const { schedule } = generateWeeklySchedule({ trainingDays: days, goal: 'muscle', experience: 'intermediate' })
    expect(Object.values(schedule).filter(Boolean)).toHaveLength(n)
    for (let d = 0; d < 7; d++) if (!days.includes(d)) expect(schedule[d]).toBeNull()
  })

  it('refuses a plan with no training days', () => {
    expect(() => generateWeeklySchedule({ trainingDays: [], goal: 'muscle', experience: 'beginner' })).toThrow(/at least one/)
  })

  it('back-to-back days avoid repeating the same muscles when 2-3 days are chosen', () => {
    const { notes } = generateWeeklySchedule({ trainingDays: [0, 1, 2], goal: 'general', experience: 'beginner' })
    expect(notes.join(' ')).not.toMatch(/both train/)
  })

  it('covers every muscle with 4+ days and reports gaps otherwise', () => {
    const four = generateWeeklySchedule({ trainingDays: [0, 1, 3, 4], goal: 'muscle', experience: 'intermediate' })
    expect(Object.values(coverageOf(four.schedule)).every((n) => n > 0)).toBe(true)
    const one = generateWeeklySchedule({ trainingDays: [2], goal: 'muscle', experience: 'intermediate' })
    expect(one.notes.join(' ')).toMatch(/does not train/)
  })
})

describe('progression', () => {
  const spec = { min: 5, max: 75, increment: 5, unit: 'lb' as const }
  const last = (over: Partial<LastPerformance> = {}): LastPerformance => ({
    exerciseId: 'x', date: '2026-10-14', unit: 'lb', painReported: false, repMin: 8, repMax: 12,
    sets: [{ weight: 40, reps: 12 }, { weight: 40, reps: 12 }, { weight: 40, reps: 12 }], ...over,
  })

  it('gives no number without history', () => {
    const s = suggestLoad(undefined, spec, 'lb', 8, 12)
    expect(s.weight).toBeUndefined()
    expect(s.note).toMatch(/No history/)
  })
  it('adds one increment after hitting the top of the range on every set', () => {
    const s = suggestLoad(last(), spec, 'lb', 8, 12)
    expect(s.weight).toBe(45)
    expect(s.note).toMatch(/2026-10-14/)
  })
  it('does not increase after poor performance', () => {
    const s = suggestLoad(last({ sets: [{ weight: 40, reps: 12 }, { weight: 40, reps: 6 }, { weight: 40, reps: 5 }] }), spec, 'lb', 8, 12)
    expect(s.weight).toBe(40)
  })
  it('does not increase when effort was 9+ or pain was reported', () => {
    expect(suggestLoad(last({ sets: [{ weight: 40, reps: 12, effort: 9 }, { weight: 40, reps: 12 }] }), spec, 'lb', 8, 12).weight).toBe(40)
    const p = suggestLoad(last({ painReported: true }), spec, 'lb', 8, 12)
    expect(p.weight).toBe(40)
    expect(p.note).toMatch(/pain/i)
  })
  it('keeps the same weight and asks for more reps when in the middle of the range', () => {
    const s = suggestLoad(last({ sets: [{ weight: 40, reps: 10 }, { weight: 40, reps: 9 }] }), spec, 'lb', 8, 12)
    expect(s.weight).toBe(40)
    expect(s.note).toMatch(/one more rep/)
  })
  it('never suggests a weight the equipment cannot make', () => {
    const s = suggestLoad(last({ sets: [{ weight: 75, reps: 12 }, { weight: 75, reps: 12 }] }), spec, 'lb', 8, 12)
    expect(s.weight).toBe(75)
    expect(snapToSpec(47, spec)).toBe(45)
    expect(snapToSpec(500, spec)).toBe(75)
  })
  it('converts units before snapping', () => {
    const s = suggestLoad(last({ unit: 'kg', sets: [{ weight: 20, reps: 12 }, { weight: 20, reps: 12 }] }), spec, 'lb', 8, 12)
    expect(s.weight).toBe(50) // 20 kg = 44 lb -> 45 snapped, +5
  })
  it('is predictable', () => {
    expect(suggestLoad(last(), spec, 'lb', 8, 12)).toEqual(suggestLoad(last(), spec, 'lb', 8, 12))
  })
  it('the generator uses history for the suggested load', () => {
    const ex = CATALOG.find((e) => e.exerciseType === 'machine' && e.primaryMuscles[0] === 'chest' && e.compound)!
    const w = workoutOf(base({
      planDay: { focus: 'Chest', muscles: ['chest'] },
      excludedExerciseIds: CATALOG.filter((e) => e.primaryMuscles[0] === 'chest' && e.id !== ex.id).map((e) => e.id),
      lastPerformance: { [ex.id]: last({ exerciseId: ex.id, repMin: 6, repMax: 10, sets: [{ weight: 100, reps: 10 }, { weight: 100, reps: 10 }, { weight: 100, reps: 10 }] }) },
    }))
    expect(w.exercises[0].suggestedWeight).toBe(105)
  })
})

describe('calories', () => {
  it('returns a labelled rough range', () => {
    const c = estimateCalories({ weightKg: 81.65, activeMinutes: 45 })!
    expect(c.low).toBeLessThan(c.high)
    expect(c.text).toMatch(/rough estimate/)
    // 180 lb = 81.6 kg, 0.75 h: 3.5 MET ~ 214, 6 MET ~ 367
    expect(c.low).toBe(210)
    expect(c.high).toBe(370)
  })
  it('changes with body weight and duration', () => {
    const a = estimateCalories({ weightKg: 68, activeMinutes: 30 })!
    const b = estimateCalories({ weightKg: 90.7, activeMinutes: 30 })!
    const c = estimateCalories({ weightKg: 68, activeMinutes: 60 })!
    expect(b.high).toBeGreaterThan(a.high)
    expect(c.high).toBeGreaterThan(a.high)
  })
  it('omits the estimate when there is not enough information', () => {
    expect(estimateCalories({ activeMinutes: 45 })).toBeNull()
    expect(estimateCalories({ weightKg: 68, activeMinutes: 2 })).toBeNull()
  })
  it('uses effort to narrow the range', () => {
    const hard = estimateCalories({ weightKg: 68, activeMinutes: 45, averageEffort: 9 })!
    const easy = estimateCalories({ weightKg: 68, activeMinutes: 45, averageEffort: 5 })!
    expect(hard.low).toBeGreaterThan(easy.low)
    expect(hard.high).toBeGreaterThan(easy.high)
  })
})

describe('rescheduling', () => {
  it('suggests a free day that does not stack the same muscles', () => {
    const sched = [
      { date: '2026-10-22', muscles: ['chest' as const, 'back' as const], status: 'planned' as const },
      { date: '2026-10-24', muscles: ['quads' as const], status: 'planned' as const },
    ]
    // skipped chest/back day: 22 is busy; 23 sits next to 22 (chest) so it conflicts; 25 is free and next to 24 (quads)
    expect(suggestReschedule(['chest', 'back'], sched, '2026-10-21')).toBe('2026-10-25')
  })
  it('returns null when nothing fits', () => {
    const sched = Array.from({ length: 8 }, (_, i) => ({ date: addDays('2026-10-21', i + 1), muscles: ['chest' as const], status: 'planned' as const }))
    expect(suggestReschedule(['chest'], sched, '2026-10-21')).toBeNull()
  })
})

describe('validation, units and dates', () => {
  const form = (o: Partial<ProfileForm> = {}): ProfileForm => ({ ...profileFormFrom(), tracks: ['workout', 'yoga'], birthDate: '1990-05-15', sex: 'male', ...o })
  it('accepts a minimal profile', () => expect(validateProfileForm(form())).toEqual({}))
  it('requires at least one track, and only asks workout questions when workout is on', () => {
    expect(validateProfileForm(form({ tracks: [] })).tracks).toMatch(/workout, yoga, or both/i)
    const yogaOnly = validateProfileForm(form({ tracks: ['yoga'], trainingDays: [], preferredDurationMinutes: 'abc', trainingLevel: 'beginner', heightCm: '', weightValue: '' }))
    expect(yogaOnly).toEqual({})
  })
  it('rejects bad numbers with understandable messages', () => {
    const e = validateProfileForm(form({ birthDate: '2020-01-01', sex: '', heightCm: '50', weightValue: '20', trainingDays: [], preferredDurationMinutes: 'abc' }))
    expect(e.birthDate).toMatch(/13 and over/)
    expect(e.sex).toMatch(/choose female or male/i)
    expect(e.heightCm).toMatch(/ft .* in/)
    expect(e.weightValue).toMatch(/66 and 66\d lb/)
    expect(e.trainingDays).toMatch(/at least one/)
    expect(e.preferredDurationMinutes).toMatch(/15 and 180/)
  })
  it('validates ranges in the unit of the field, never silently', () => {
    expect(validateProfileForm(form({ weightFieldUnit: 'kg', weightValue: '80' })).weightValue).toBeUndefined()
    expect(validateProfileForm(form({ weightFieldUnit: 'lb', weightValue: '25' })).weightValue).toBeDefined()
  })
  it('converts units both ways', () => {
    expect(convertWeight(100, 'kg', 'lb')).toBeCloseTo(220.46, 1)
    expect(convertWeight(220.462, 'lb', 'kg')).toBeCloseTo(100, 1)
  })
  it('handles weekdays (Monday = 0)', () => {
    expect(weekdayIndex('2026-10-19')).toBe(0)
    expect(weekdayIndex('2026-10-25')).toBe(6)
    expect(startOfWeek('2026-10-21')).toBe('2026-10-19')
  })
  it('config hash changes when inputs change', () => {
    const { catalog: _c, ...rest } = base()
    void _c
    const h1 = configHash({ ...rest, catalogVersion: 'v', recentSessionIds: [] })
    const eq = presetEquipment('planet_fitness', 'lb')
    eq.cable = { ...eq.cable!, available: false }
    expect(configHash({ ...rest, equipment: eq, catalogVersion: 'v', recentSessionIds: [] })).not.toBe(h1)
    expect(configHash({ ...rest, minutes: 30, catalogVersion: 'v', recentSessionIds: [] })).not.toBe(h1)
    expect(configHash({ ...rest, catalogVersion: 'v', recentSessionIds: [] })).toBe(h1)
  })
  it('type check: exercises are Exercise objects', () => {
    const e: Exercise = CATALOG[0]
    expect(e.catalogVersion).toBeTruthy()
  })
})
