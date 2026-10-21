import type { Exercise, ExerciseType } from './types'
import { EQUIPMENT_LABEL, type EquipmentId, type EquipmentSet, type Goal, type Pattern, type WorkoutSession } from './types'
import { availableIds } from './equipment'
import { eligible, type GenerateInput } from './generate'
import { estimateSeconds, restSecondsFor } from './time'
import { exerciseById } from '../data/catalog'

type Rules = Pick<GenerateInput, 'catalog' | 'equipment' | 'excludedExerciseIds' | 'excludedPatterns' | 'experience'>

const PATTERN_WORD: Record<Pattern, string> = {
  push: 'pushing', pull: 'pulling', squat: 'squat', hinge: 'hip-hinge', lunge: 'single-leg', core: 'core', isolation: 'single-muscle',
}

export const TYPE_LABEL: Record<ExerciseType, string> = {
  bodyweight: 'Bodyweight / no equipment', dumbbell: 'Dumbbells', barbell: 'Barbell', machine: 'Machine', cable: 'Cable', smith: 'Smith machine', kettlebell: 'Kettlebell', bands: 'Resistance bands',
}

export interface Alternatives {
  /** Same main muscle AND the same kind of movement. The closest swap that keeps the day's intent. */
  best: Exercise[]
  /** Same main muscle, a different movement. Still on target for the day, but a different exercise. */
  related: Exercise[]
}

/**
 * Replacement choices that keep the day's intent. Both lists target the same main muscle, so a leg-day squat is never
 * offered an arm exercise. `best` also keeps the movement pattern. Everything respects equipment, exclusions and level.
 */
export function alternativesFor(current: Exercise, rules: Rules, inSession: string[] = []): Alternatives {
  const avail = availableIds(rules.equipment)
  const pool = rules.catalog
    .filter((e) => e.id !== current.id && !inSession.includes(e.id) && e.primaryMuscles[0] === current.primaryMuscles[0])
    .filter((e) => eligible(e, rules, avail))
    .sort((a, b) => a.name.localeCompare(b.name))
  return {
    best: pool.filter((e) => e.movementPattern === current.movementPattern),
    related: pool.filter((e) => e.movementPattern !== current.movementPattern),
  }
}

export interface EquipmentOption {
  type: ExerciseType
  label: string
  /** The exercise that would be used. Missing when this equipment cannot do the movement. */
  exerciseId?: string
  /** This is what the slot uses now. */
  current: boolean
  /** Plain-language reason it is not offered. */
  reason?: string
}

function whyNot(e: Exercise, rules: Rules, avail: Set<EquipmentId>): string {
  const missing = e.equipmentIds.filter((q) => !avail.has(q))
  if (missing.length) return `Needs ${missing.map((q) => EQUIPMENT_LABEL[q].toLowerCase()).join(' and ')}, which is not in your equipment list.`
  if (rules.excludedExerciseIds.includes(e.id) || rules.excludedPatterns.includes(e.movementPattern)) return 'You excluded this in Settings.'
  return 'Too advanced for your training level.'
}

/**
 * The equipment this one exercise could use, for the same movement and main muscle. Bodyweight is listed whenever a
 * bodyweight version exists. It is never turned off just because other equipment is selected.
 */
export function equipmentOptions(current: Exercise, rules: Rules, inSession: string[] = []): EquipmentOption[] {
  const avail = availableIds(rules.equipment)
  const same = rules.catalog
    .filter((e) => e.primaryMuscles[0] === current.primaryMuscles[0] && e.movementPattern === current.movementPattern)
    .sort((a, b) => a.name.localeCompare(b.name))
  const types = [...new Set<ExerciseType>([current.exerciseType, ...same.map((e) => e.exerciseType)])]
  const order: ExerciseType[] = ['bodyweight', 'dumbbell', 'barbell', 'smith', 'machine', 'cable', 'kettlebell', 'bands']
  types.sort((a, b) => order.indexOf(a) - order.indexOf(b))
  return types.map((type): EquipmentOption => {
    if (type === current.exerciseType) return { type, label: TYPE_LABEL[type], exerciseId: current.id, current: true }
    const ok = same.find((e) => e.exerciseType === type && e.id !== current.id && !inSession.includes(e.id) && eligible(e, rules, avail))
    if (ok) return { type, label: TYPE_LABEL[type], exerciseId: ok.id, current: false }
    const blocked = same.find((e) => e.exerciseType === type && e.id !== current.id)
    return { type, label: TYPE_LABEL[type], current: false, reason: blocked ? whyNot(blocked, rules, avail) : 'No version of this movement uses it.' }
  })
}

export const patternWord = (p: Pattern): string => PATTERN_WORD[p]

/**
 * The session length in minutes using the exercises that are actually in the session now (replacements, skipped slots,
 * cardio). A replacement can change the rest between sets, so this is recalculated whenever the session changes.
 */
export function sessionEstimateMinutes(session: Pick<WorkoutSession, 'plannedExercises' | 'actualExercises' | 'plannedMinutes'>, goal: Goal): number {
  const timed: { sets: number; restSeconds: number }[] = []
  let cardio = 0
  for (const slot of session.plannedExercises) {
    const actual = session.actualExercises.find((a) => a.slotId === slot.slotId)
    if (actual?.skipped) continue
    if (slot.kind === 'cardio') { cardio += slot.durationMinutes ?? 0; continue }
    const now = actual ? exerciseById(actual.exerciseId) : undefined
    const was = exerciseById(slot.exerciseId)
    let rest = slot.restSeconds
    if (now && was && now.compound !== was.compound) rest += restSecondsFor(goal, now.compound) - restSecondsFor(goal, was.compound)
    timed.push({ sets: slot.sets, restSeconds: rest })
  }
  const minutes = session.plannedMinutes ?? 0
  return Math.round(estimateSeconds(timed, goal, minutes, cardio) / 60)
}

export type { EquipmentSet }
