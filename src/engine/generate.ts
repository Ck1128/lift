import type {
  EquipmentId, EquipmentSet, Exercise, Experience, GeneratedWorkout, GenerationResult, Goal, LastPerformance,
  Muscle, Pattern, PlannedExercise, WeightUnit, DayPlan,
} from './types'
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from './types'
import { availableIds, loadSpec } from './equipment'
import { assumptionsText, estimateSeconds, restSecondsFor } from './time'
import { startingWeight, suggestLoad, type LoadSpec } from './progression'
import { validateExercise } from './validate'
import { LEVEL_PARAMS, setsFor } from './levels'
import { cardioCalories, MAX_SESSION_MINUTES, MIN_SESSION_MINUTES, pickCardio } from './cardio'

export const GENERATOR_VERSION = 'gen-2.0'

export interface GenerateInput {
  date: string
  /** null means today is a rest day. */
  planDay: DayPlan | null
  minutes: number
  goal: Goal
  experience: Experience
  equipment: EquipmentSet
  excludedExerciseIds: string[]
  excludedPatterns: Pattern[]
  catalog: Exercise[]
  lastPerformance: Record<string, LastPerformance>
  /** exercise id -> date it was last done. Used to rotate exercises between sessions. */
  lastDone?: Record<string, string>
  soreness: Partial<Record<Muscle, 1 | 2 | 3>>
  weightUnit: WeightUnit
  /** 'none' skips cardio; a cardio id picks that activity; missing lets the app choose. */
  cardioChoice?: string
  /** Canonical body weight, used only for the rough cardio calorie range. */
  weightKg?: number
  /** Optional. With body weight and level it sets a cautious first-session weight guess. */
  sex?: 'female' | 'male'
}

const REPS: Record<Goal, { compound: [number, number]; iso: [number, number] }> = {
  strength: { compound: [3, 6], iso: [6, 10] },
  muscle: { compound: [6, 10], iso: [10, 15] },
  general: { compound: [8, 12], iso: [10, 15] },
  endurance: { compound: [12, 20], iso: [15, 20] },
  fat_loss: { compound: [10, 15], iso: [12, 20] },
}

const PATTERN_LABEL: Record<Pattern, string> = {
  push: 'a pushing movement', pull: 'a pulling movement', squat: 'a squat-type movement',
  hinge: 'a hip-hinge movement', lunge: 'a single-leg movement', core: 'a core exercise', isolation: 'an accessory (single-muscle) exercise',
}

type Rules = Pick<GenerateInput, 'excludedExerciseIds' | 'excludedPatterns' | 'experience'>

export function eligible(ex: Exercise, input: Rules, avail: Set<EquipmentId>): boolean {
  if (validateExercise(ex).length > 0) return false
  if (input.excludedExerciseIds.includes(ex.id)) return false
  if (input.excludedPatterns.includes(ex.movementPattern)) return false
  if (LEVEL_PARAMS[input.experience].maxDifficulty === 'beginner' && ex.difficulty !== 'beginner') return false
  return ex.equipmentIds.every((q) => avail.has(q))
}

function why(ex: Exercise): string {
  const main = ex.primaryMuscles.map((m) => MUSCLE_LABEL[m].toLowerCase()).join(' and ')
  const eq = ex.equipmentIds.filter((q) => q !== 'bodyweight').map((q) => EQUIPMENT_LABEL[q].toLowerCase())
  return `Works your ${main}. It is ${PATTERN_LABEL[ex.movementPattern]}${eq.length ? ` using ${eq.join(' and ')}` : ' with no equipment'}.`
}

function loadSpecFor(ex: Exercise, equipment: EquipmentSet, unit: WeightUnit): LoadSpec | null {
  if (ex.exerciseType === 'bodyweight' || ex.exerciseType === 'bands') return null
  const direct = ex.exerciseType === 'dumbbell' || ex.exerciseType === 'kettlebell' || ex.exerciseType === 'barbell'
    ? loadSpec(equipment, ex.exerciseType as EquipmentId)
    : null
  if (direct) return direct
  // Machines, cables and the Smith machine have no range to configure. Use a standard step.
  return { min: 0, max: Number.POSITIVE_INFINITY, increment: unit === 'lb' ? 5 : 2.5, unit }
}

function sortCandidates(list: Exercise[], lastDone: Record<string, string>): Exercise[] {
  return [...list].sort((a, b) => {
    if (a.compound !== b.compound) return a.compound ? -1 : 1
    const da = lastDone[a.id] ?? ''
    const db = lastDone[b.id] ?? ''
    if (da !== db) return da < db ? -1 : 1 // never done, then longest ago
    return a.name.localeCompare(b.name)
  })
}

/**
 * Deterministic: the same input (including catalog and history) always returns the same workout.
 * No randomness and no network calls.
 */
export function generateWorkout(input: GenerateInput): GenerationResult {
  if (!Number.isInteger(input.minutes) || input.minutes < MIN_SESSION_MINUTES || input.minutes > MAX_SESSION_MINUTES) {
    return {
      kind: 'error',
      message: input.minutes < MIN_SESSION_MINUTES
        ? `${input.minutes} minutes is too short for a useful session. Try ${MIN_SESSION_MINUTES} minutes or more.`
        : `Choose a workout length between ${MIN_SESSION_MINUTES} and ${MAX_SESSION_MINUTES} minutes.`,
    }
  }
  if (input.planDay === null) {
    return { kind: 'rest', message: 'Today is a rest day. Recovery is part of training. You can still choose a workout if you want one.' }
  }
  const { planDay } = input
  const cardioOnly = planDay.cardioOnly === true
  if (planDay.muscles.length === 0 && !cardioOnly) return { kind: 'error', message: 'Today has no target muscle groups.' }

  const level = LEVEL_PARAMS[input.experience]
  const avail = availableIds(input.equipment)
  const lastDone = input.lastDone ?? {}
  const notes: string[] = []

  // ---- cardio ----
  const cardio = pickCardio({
    goal: input.goal, level: input.experience, minutes: input.minutes, available: avail,
    excludedIds: input.excludedExerciseIds, lastDone, choice: input.cardioChoice, cardioOnly,
  })
  if (cardioOnly && !cardio) {
    return { kind: 'error', message: 'No cardio option fits your equipment, level and exclusions. Walking needs no equipment, so check that Bodyweight is switched on in Settings.' }
  }
  const budget = input.minutes * 60
  const cardioPE = (minutes: number): PlannedExercise => ({
    slotId: 'c1', exerciseId: cardio!.activity.id, name: cardio!.activity.name, sets: 1, repMin: 0, repMax: 0,
    restSeconds: 0, loadNote: '', why: `Cardio for your heart and endurance. ${cardio!.activity.name} ${cardio!.activity.equipmentIds.includes('bodyweight') ? 'needs no equipment' : 'uses equipment you have'}.`,
    kind: 'cardio', durationMinutes: minutes, intensityCue: cardio!.intensityCue, cues: cardio!.activity.instructions,
  })

  if (cardioOnly && cardio) {
    const seconds = cardio.minutes * 60
    notes.push('Spend the first 5 minutes at an easy pace as your warm-up.')
    if (cardio.minutes < Math.floor(input.minutes / 5) * 5) {
      notes.push(`Continuous cardio is capped at ${cardio.minutes} minutes for your level. Longer blocks are best built up gradually.`)
    }
    const kcal = cardioCalories(cardio.activity, cardio.minutes, input.weightKg)
    if (kcal) notes.push(`Rough estimate: ${kcal.low} to ${kcal.high} calories. This is not a measurement.`)
    return {
      kind: 'workout',
      workout: {
        title: planDay.focus, date: input.date, targetMuscles: [], availableMinutes: input.minutes,
        estimatedMinutes: Math.ceil(seconds / 60), fits: seconds <= budget, cardioMinutes: cardio.minutes,
        exercises: [cardioPE(cardio.minutes)], notes, assumptions: ['Cardio time is the whole session. Your real pace will differ.'],
        generatorVersion: GENERATOR_VERSION, catalogVersion: input.catalog[0]?.catalogVersion ?? 'unknown',
      },
    }
  }

  // ---- strength ----
  const pool = input.catalog.filter((e) => eligible(e, input, avail))
  if (pool.length === 0) {
    return { kind: 'error', message: 'No exercises match your equipment and exclusions. Check Settings: confirm your equipment or remove an exclusion.' }
  }
  const pools = new Map<Muscle, Exercise[]>()
  for (const m of planDay.muscles) {
    const primary = pool.filter((e) => e.primaryMuscles[0] === m)
    const any = pool.filter((e) => e.primaryMuscles.includes(m))
    const list = sortCandidates(primary.length > 0 ? primary : any, lastDone)
    if (list.length === 0) notes.push(`No exercise for ${MUSCLE_LABEL[m].toLowerCase()} fits your equipment and exclusions, so it is skipped today.`)
    else pools.set(m, list)
  }
  if (pools.size === 0) {
    return { kind: 'error', message: 'None of today\'s target muscles have an exercise that fits your equipment and exclusions.' }
  }

  // Ranked picks: one best exercise per muscle first, then a second pass with a different movement pattern, and so on.
  const used = new Set<string>()
  const ranked: { ex: Exercise; muscle: Muscle }[] = []
  for (let pass = 0; pass < 3; pass++) {
    for (const m of planDay.muscles) {
      const list = pools.get(m)
      if (!list) continue
      const left = list.filter((e) => !used.has(e.id))
      if (left.length === 0) continue
      let pick = left[0]
      if (pass > 0) {
        const have = new Set(ranked.filter((r) => r.muscle === m).map((r) => r.ex.movementPattern))
        pick = left.find((e) => !have.has(e.movementPattern)) ?? left[0]
      }
      used.add(pick.id)
      ranked.push({ ex: pick, muscle: m })
    }
  }

  const reps = REPS[input.goal]
  const soreFor = (ex: Exercise) => Math.max(0, ...ex.primaryMuscles.map((m) => input.soreness[m] ?? 0))
  const rest = (ex: Exercise) => restSecondsFor(input.goal, ex.compound, level.restBonus)
  // With no history, offer a light starting guess from level, body weight and sex. It is only a place to start.
  const withStart = (sug: { weight?: number; note: string }, ex: Exercise, spec: LoadSpec | null) => {
    if (sug.weight !== undefined || input.lastPerformance[ex.id]) return sug
    const w = startingWeight({ exerciseType: ex.exerciseType, compound: ex.compound, primaryMuscles: ex.primaryMuscles, level: input.experience, weightKg: input.weightKg, sex: input.sex }, spec, input.weightUnit)
    if (w === undefined) return sug
    return { weight: w, note: `First time, so this is a light starting guess (${w} ${input.weightUnit}) from your level, body weight and sex. It is not a safe-load rule. Go lighter if the last reps are not smooth, or heavier if it feels too easy.` }
  }
  const build = (ex: Exercise, slot: number, sets: number): PlannedExercise => {
    const [repMin, repMax] = ex.compound ? reps.compound : reps.iso
    const spec = loadSpecFor(ex, input.equipment, input.weightUnit)
    const noLoad = ex.exerciseType === 'bodyweight' || ex.exerciseType === 'bands'
    const sug = noLoad
      ? { weight: undefined, note: 'No weight needed. Use a variation that lets you reach the target reps with good form.' }
      : withStart(suggestLoad(input.lastPerformance[ex.id], spec, input.weightUnit, repMin, repMax, level.effortCeiling), ex, spec)
    return {
      slotId: `s${slot + 1}`,
      exerciseId: ex.id,
      name: ex.name,
      sets,
      repMin,
      repMax,
      restSeconds: rest(ex),
      suggestedWeight: sug.weight,
      loadUnit: sug.weight === undefined ? undefined : input.weightUnit,
      loadNote: sug.note,
      why: why(ex),
      kind: 'strength',
      cues: ex.instructions.slice(0, level.cues),
    }
  }
  const defaultSets = (ex: Exercise) => {
    let s = setsFor(input.goal, input.experience, ex.compound)
    if (soreFor(ex) >= 2) s = Math.max(2, s - 1)
    return s
  }

  // Add exercises in rank order while the time estimate fits. Cardio time is reserved first.
  let cardioMinutes = cardio?.minutes ?? 0
  const timed = (list: { ex: Exercise; sets: number }[], cm: number) =>
    estimateSeconds(list.map((c) => ({ sets: c.sets, restSeconds: rest(c.ex) })), input.goal, input.minutes, cm)
  if (cardio && ranked.length > 0) {
    const first = { ex: ranked[0].ex, sets: 2 }
    while (cardioMinutes > 0 && timed([first], cardioMinutes) > budget) cardioMinutes -= 5
    if (cardioMinutes < cardio.minutes) {
      notes.push(cardioMinutes > 0
        ? `Cardio was shortened to ${cardioMinutes} minutes to leave room for strength work in ${input.minutes} minutes.`
        : `There was not enough time for cardio in ${input.minutes} minutes, so today is strength only.`)
    }
  }
  const chosen: { ex: Exercise; sets: number }[] = []
  let misses = 0
  let droppedForTime = 0
  const cap = level.maxExercises
  for (const r of ranked) {
    if (chosen.length >= cap) break
    let sets = defaultSets(r.ex)
    const trial = (n: number) => timed([...chosen, { ex: r.ex, sets: n }], cardioMinutes)
    if (trial(sets) > budget && sets > 2) sets = 2
    if (trial(sets) > budget) {
      if (chosen.length === 0) { chosen.push({ ex: r.ex, sets }); break } // always return at least one exercise, flagged as not fitting
      droppedForTime += 1
      if (++misses >= 2) { droppedForTime += ranked.length - ranked.indexOf(r) - 1; break }
      continue
    }
    chosen.push({ ex: r.ex, sets })
  }

  // Heavier lifts first, accessories last. Stable within each group.
  const ordered = [...chosen].sort((a, b) => Number(b.ex.compound) - Number(a.ex.compound))
  const exercises: PlannedExercise[] = ordered.map((c, i) => build(c.ex, i, c.sets))
  if (cardio && cardioMinutes > 0) exercises.push({ ...cardioPE(cardioMinutes), slotId: `s${exercises.length + 1}` })
  const seconds = estimateSeconds(
    exercises.filter((e) => e.kind !== 'cardio'), input.goal, input.minutes, cardioMinutes,
  )
  const fits = seconds <= budget

  const covered = new Set(ordered.flatMap((c) => c.ex.primaryMuscles))
  for (const m of planDay.muscles) {
    if (pools.has(m) && !covered.has(m)) notes.push(`There was not enough time for ${MUSCLE_LABEL[m].toLowerCase()} in ${input.minutes} minutes. Try a longer session to include it.`)
  }
  if (droppedForTime > 0) {
    notes.push(`To fit ${input.minutes} minutes, ${droppedForTime} lower-priority exercise${droppedForTime === 1 ? ' was' : 's were'} left out. Compound lifts come first, and muscles that are targeted today are covered before extras are added.`)
  }
  if (!fits) notes.push(`Even a minimal session is estimated at about ${Math.ceil(seconds / 60)} minutes, longer than the ${input.minutes} you chose. A longer session or fewer exercises would help.`)
  if (cardio && cardioMinutes > 0) {
    const kcal = cardioCalories(cardio.activity, cardioMinutes, input.weightKg)
    notes.push(`Cardio: ${cardio.activity.name} for ${cardioMinutes} minutes. ${cardio.intensityCue}${kcal ? ` Rough estimate: ${kcal.low} to ${kcal.high} calories (not a measurement).` : ''} You can skip it or switch it before you start.`)
  }
  const sorest = planDay.muscles.filter((m) => (input.soreness[m] ?? 0) >= 2)
  if (sorest.length > 0) {
    notes.push(`You reported soreness in ${sorest.map((m) => MUSCLE_LABEL[m].toLowerCase()).join(', ')}, so those exercises have one fewer set. If you feel unwell or something hurts, rest or choose a lighter day.`)
  }

  const workout: GeneratedWorkout = {
    title: planDay.focus,
    date: input.date,
    targetMuscles: planDay.muscles,
    availableMinutes: input.minutes,
    estimatedMinutes: Math.ceil(seconds / 60),
    fits,
    cardioMinutes,
    exercises,
    notes,
    assumptions: assumptionsText(input.goal, input.minutes, cardioMinutes),
    generatorVersion: GENERATOR_VERSION,
    catalogVersion: input.catalog[0]?.catalogVersion ?? 'unknown',
  }
  return { kind: 'workout', workout }
}

/** Alternatives for replacing an exercise: same primary muscle, similar pattern first, nothing excluded or unavailable. */
export function findAlternatives(
  current: Exercise,
  input: Pick<GenerateInput, 'catalog' | 'equipment' | 'excludedExerciseIds' | 'excludedPatterns' | 'experience'>,
  alreadyInSession: string[] = [],
): Exercise[] {
  const avail = availableIds(input.equipment)
  return input.catalog
    .filter((e) => e.id !== current.id && !alreadyInSession.includes(e.id))
    .filter((e) => e.primaryMuscles[0] === current.primaryMuscles[0])
    .filter((e) => eligible(e, input, avail))
    .sort((a, b) => {
      const pa = a.movementPattern === current.movementPattern ? 0 : 1
      const pb = b.movementPattern === current.movementPattern ? 0 : 1
      if (pa !== pb) return pa - pb
      return a.name.localeCompare(b.name)
    })
}

/** Stable text fingerprint of everything that should invalidate a cached workout when it changes. */
export function configHash(input: Omit<GenerateInput, 'catalog'> & { catalogVersion: string; recentSessionIds: string[] }): string {
  const eq = Object.values(input.equipment)
    .filter((i) => i?.available)
    .map((i) => `${i!.id}:${i!.minWeight ?? ''}-${i!.maxWeight ?? ''}-${i!.increment ?? ''}`)
    .sort()
  return JSON.stringify([
    input.planDay, input.minutes, input.goal, input.experience, input.cardioChoice ?? '', eq,
    [...input.excludedExerciseIds].sort(), [...input.excludedPatterns].sort(),
    input.soreness, input.weightUnit, input.catalogVersion, GENERATOR_VERSION, input.recentSessionIds,
  ])
}
