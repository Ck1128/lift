/**
 * The single source of truth for muscle groups on screen (US-09).
 *
 * The exercise catalog stores ten coarse muscles (see `Muscle`). People think in finer groups (lats vs upper back,
 * abs vs obliques, forearms), so this module derives the fine groups from the catalog entry. Workout targeting,
 * the recovery model, the body map and history all call `musclesOf`. Nothing else assigns muscles to exercises.
 *
 * Existing workout records only store exercise ids, so they keep working if the mapping below changes.
 */
import type { Exercise, Muscle } from './types'

export type FineMuscle =
  | 'chest' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'upper_back' | 'lats' | 'lower_back' | 'abs' | 'obliques'
  | 'glutes' | 'quads' | 'hamstrings' | 'calves'

export const ALL_FINE: FineMuscle[] = [
  'chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'upper_back', 'lats', 'lower_back', 'abs', 'obliques', 'glutes', 'quads', 'hamstrings', 'calves',
]

export const FINE_LABEL: Record<FineMuscle, string> = {
  chest: 'Chest', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms',
  upper_back: 'Upper back', lats: 'Lats', lower_back: 'Lower back', abs: 'Abs', obliques: 'Obliques',
  glutes: 'Glutes', quads: 'Quads', hamstrings: 'Hamstrings', calves: 'Calves',
}

/** Big groups take longer to recover than small ones. Used by the recovery model. */
export const LARGE_MUSCLES: ReadonlySet<FineMuscle> = new Set<FineMuscle>(['chest', 'upper_back', 'lats', 'lower_back', 'glutes', 'quads', 'hamstrings'])

/** Which body view shows each group. A few appear on both. */
export const VIEW_OF: Record<FineMuscle, ('front' | 'back')[]> = {
  chest: ['front'], shoulders: ['front', 'back'], biceps: ['front'], triceps: ['back'], forearms: ['front', 'back'],
  upper_back: ['back'], lats: ['back'], lower_back: ['back'], abs: ['front'], obliques: ['front'],
  glutes: ['back'], quads: ['front'], hamstrings: ['back'], calves: ['back', 'front'],
}

/** The coarse group each fine group belongs to, for features that still use the ten-group model (soreness, targets). */
export const COARSE_OF: Record<FineMuscle, Muscle> = {
  chest: 'chest', shoulders: 'shoulders', biceps: 'biceps', triceps: 'triceps', forearms: 'biceps',
  upper_back: 'back', lats: 'back', lower_back: 'back', abs: 'core', obliques: 'core',
  glutes: 'glutes', quads: 'quads', hamstrings: 'hamstrings', calves: 'calves',
}

export const fineOfCoarse = (m: Muscle): FineMuscle[] => ALL_FINE.filter((f) => COARSE_OF[f] === m && f !== 'forearms')

export interface MuscleUse {
  primary: FineMuscle[]
  secondary: FineMuscle[]
  /** True when the exercise has no usable mapping. Callers must say so instead of guessing. */
  unmapped: boolean
}

const re = (s: string) => new RegExp(s, 'i')
const LATS = re('pulldown|pull-up|pullup|pull up|chin|\\blat\\b|lat-|pullover|straight-arm')
const UPPER = re('row|shrug|face pull|rear delt|reverse fly|reverse flye|upright|scapula')
const LOWER = re('deadlift|good morning|hyperextension|back extension|superman|bird dog|reverse hyper')
const OBLIQUE = re('twist|side bend|side plank|oblique|woodchop|wood chop|russian|bicycle|windshield')
const FOREARM_P = re('wrist|forearm|farmer|grip')
const FOREARM_S = re('curl|deadlift|pull|row|carry|shrug|hang|chin')

function backFor(name: string): FineMuscle[] {
  if (LOWER.test(name)) return ['lower_back']
  if (LATS.test(name)) return ['lats']
  if (UPPER.test(name)) return ['upper_back']
  return ['lats', 'upper_back']
}

function expand(m: Muscle, name: string): FineMuscle[] {
  switch (m) {
    case 'back': return backFor(name)
    case 'core': return OBLIQUE.test(name) ? ['obliques', 'abs'] : ['abs']
    default: return [m]
  }
}

/** Hand-checked overrides for exercises where the name pattern above is not enough. Keyed by catalog id. */
const OVERRIDES: Record<string, Partial<Pick<MuscleUse, 'primary' | 'secondary'>>> = {}

/** The one place that answers "which muscles does this exercise use?". */
export function musclesOf(ex: Pick<Exercise, 'id' | 'name' | 'primaryMuscles' | 'secondaryMuscles'> | undefined | null): MuscleUse {
  if (!ex || (ex.primaryMuscles?.length ?? 0) === 0) return { primary: [], secondary: [], unmapped: true }
  const o = OVERRIDES[ex.id]
  const prim = new Set<FineMuscle>(o?.primary ?? ex.primaryMuscles.flatMap((m) => expand(m, ex.name)))
  const sec = new Set<FineMuscle>(o?.secondary ?? (ex.secondaryMuscles ?? []).flatMap((m) => expand(m, ex.name)))
  if (!o) {
    if (FOREARM_P.test(ex.name)) prim.add('forearms')
    else if (FOREARM_S.test(ex.name)) sec.add('forearms')
    if (LOWER.test(ex.name) && ex.primaryMuscles.includes('back')) prim.add('lower_back')
  }
  for (const p of prim) sec.delete(p)
  return { primary: [...prim], secondary: [...sec], unmapped: false }
}

/** Union of several exercises, primary winning over secondary. Unmapped exercises are reported, not guessed. */
export function musclesOfMany(list: (Pick<Exercise, 'id' | 'name' | 'primaryMuscles' | 'secondaryMuscles'> | undefined)[]): MuscleUse & { byMuscle: Partial<Record<FineMuscle, string[]>>; unmappedCount: number } {
  const primary = new Set<FineMuscle>()
  const secondary = new Set<FineMuscle>()
  const byMuscle: Partial<Record<FineMuscle, string[]>> = {}
  let unmappedCount = 0
  for (const ex of list) {
    const u = musclesOf(ex)
    if (u.unmapped) { unmappedCount++; continue }
    for (const m of [...u.primary, ...u.secondary]) (byMuscle[m] ??= []).push(ex!.name)
    u.primary.forEach((m) => primary.add(m))
    u.secondary.forEach((m) => secondary.add(m))
  }
  for (const p of primary) secondary.delete(p)
  return { primary: [...primary], secondary: [...secondary], unmapped: primary.size + secondary.size === 0, byMuscle, unmappedCount }
}
