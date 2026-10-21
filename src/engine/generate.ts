import type {
  EquipmentId, EquipmentSet, Exercise, Experience, GeneratedWorkout, GenerationResult, Goal, LastPerformance,
  Muscle, Pattern, PlannedExercise, WeightUnit, DayPlan,
} from './types'
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from './types'
import { availableIds, loadSpec } from './equipment'
import { assumptionsText, estimateSeconds, restSecondsFor } from './time'
import { suggestLoad, type LoadSpec } from './progression'
import { validateExercise } from './validate'

export const GENERATOR_VERSION = 'gen-1.0'
const MAX_EXERCISES = 9

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
}

const REPS: Record<Goal, { compound: [number, number]; iso: [number, number] }> = {
  strength: { compound: [3, 6], iso: [6, 10] },
  muscle: { compound: [6, 10], iso: [10, 15] },
  general: { compound: [8, 12], iso: [10, 15] },
  endurance: { compound: [12, 20], iso: [15, 20] },
  fat_loss: { compound: [10, 15], iso: [12, 20] },
}

function setsFor(goal: Goal, experience: Experience, compound: boolean): number {
  let s = compound ? 3 : 2
  if (experience !== 'beginner') s = 3
  if (goal === 'strength' && compound && experience !== 'beginner') s = 4
  if (goal === 'endurance' && experience === 'beginner') s = 2
  return s
}

const PATTERN_LABEL: Record<Pattern, string> = {
  push: 'a pushing movement', pull: 'a pulling movement', squat: 'a squat-type movement',
  hinge: 'a hip-hinge movement', lunge: 'a single-leg movement', core: 'a core exercise', isolation: 'an accessory (single-muscle) exercise',
}

type Rules = Pick<GenerateInput, 'excludedExerciseIds' | 'excludedPatterns' | 'experience'>

function eligible(ex: Exercise, input: Rules, avail: Set<EquipmentId>): boolean {
  if (validateExercise(ex).length > 0) return false
  if (input.excludedExerciseIds.includes(ex.id)) return false
  if (input.excludedPatterns.includes(ex.movementPattern)) return false
  if (input.experience === 'beginner' && ex.difficulty !== 'beginner') return false
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
  if (!Number.isInteger(input.minutes) || input.minutes < 10 || input.minutes > 180) {
    return { kind: 'error', message: 'Choose a workout length between 10 and 180 minutes.' }
  }
  if (input.planDay === null) {
    return { kind: 'rest', message: 'Today is a rest day. Recovery is part of training. You can still choose a workout if you want one.' }
  }
  const { planDay } = input
  if (planDay.muscles.length === 0) return { kind: 'error', message: 'Today has no target muscle groups.' }

  const avail = availableIds(input.equipment)
  const pool = input.catalog.filter((e) => eligible(e, input, avail))
  if (pool.length === 0) {
    return { kind: 'error', message: 'No exercises match your equipment and exclusions. Check Settings: confirm your equipment or remove an exclusion.' }
  }

  const lastDone = input.lastDone ?? {}
  const notes: string[] = []
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
  const build = (ex: Exercise, slot: number, sets: number): PlannedExercise => {
    const [repMin, repMax] = ex.compound ? reps.compound : reps.iso
    const spec = loadSpecFor(ex, input.equipment, input.weightUnit)
    const noLoad = ex.exerciseType === 'bodyweight' || ex.exerciseType === 'bands'
    const sug = noLoad
      ? { weight: undefined, note: 'No weight needed. Use a variation that lets you reach the target reps with good form.' }
      : suggestLoad(input.lastPerformance[ex.id], spec, input.weightUnit, repMin, repMax)
    return {
      slotId: `s${slot + 1}`,
      exerciseId: ex.id,
      name: ex.name,
      sets,
      repMin,
      repMax,
      restSeconds: restSecondsFor(input.goal, ex.compound),
      suggestedWeight: sug.weight,
      loadUnit: sug.weight === undefined ? undefined : input.weightUnit,
      loadNote: sug.note,
      why: why(ex),
    }
  }
  const defaultSets = (ex: Exercise) => {
    let s = setsFor(input.goal, input.experience, ex.compound)
    if (soreFor(ex) >= 2) s = Math.max(2, s - 1)
    return s
  }

  // Add exercises in rank order while the time estimate fits.
  const budget = input.minutes * 60
  const chosen: { ex: Exercise; sets: number }[] = []
  let misses = 0
  for (const r of ranked) {
    if (chosen.length >= MAX_EXERCISES) break
    let sets = defaultSets(r.ex)
    const trial = (s: number) => estimateSeconds(
      [...chosen, { ex: r.ex, sets: s }].map((c) => ({ sets: c.sets, restSeconds: restSecondsFor(input.goal, c.ex.compound) })),
      input.goal, input.minutes,
    )
    if (trial(sets) > budget && sets > 2) sets = 2
    if (trial(sets) > budget) {
      if (chosen.length === 0) { chosen.push({ ex: r.ex, sets }); break } // always return at least one exercise, flagged as not fitting
      if (++misses >= 2) break
      continue
    }
    chosen.push({ ex: r.ex, sets })
  }

  // Heavier lifts first, accessories last. Stable within each group.
  const ordered = [...chosen].sort((a, b) => Number(b.ex.compound) - Number(a.ex.compound))
  const exercises = ordered.map((c, i) => build(c.ex, i, c.sets))
  const seconds = estimateSeconds(exercises, input.goal, input.minutes)
  const fits = seconds <= budget

  const covered = new Set(ordered.flatMap((c) => c.ex.primaryMuscles))
  for (const m of planDay.muscles) {
    if (pools.has(m) && !covered.has(m)) notes.push(`There was not enough time for ${MUSCLE_LABEL[m].toLowerCase()} in ${input.minutes} minutes. Try a longer session to include it.`)
  }
  if (!fits) notes.push(`Even a minimal session is estimated at about ${Math.ceil(seconds / 60)} minutes, longer than the ${input.minutes} you chose.`)
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
    exercises,
    notes,
    assumptions: assumptionsText(input.goal, input.minutes),
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
    input.planDay, input.minutes, input.goal, input.experience, eq,
    [...input.excludedExerciseIds].sort(), [...input.excludedPatterns].sort(),
    input.soreness, input.weightUnit, input.catalogVersion, GENERATOR_VERSION, input.recentSessionIds,
  ])
}
