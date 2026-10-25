/**
 * The pain check before a workout. The person says where something hurts today and how much; today's workout is
 * designed around it. This is not a diagnosis: it only chooses gentler exercises, and the app says to rest or ask a
 * qualified professional when something hurts.
 */
import type { Exercise, Muscle } from './types'

export type PainArea = 'neck' | 'shoulder' | 'elbow' | 'wrist' | 'chest' | 'upper_back' | 'lower_back' | 'core' | 'hip' | 'knee' | 'ankle'
export type PainLevel = 1 | 2 | 3
export type PainReport = Partial<Record<PainArea, PainLevel>>

export const PAIN_AREAS: { id: PainArea; label: string }[] = [
  { id: 'neck', label: 'Neck' }, { id: 'shoulder', label: 'Shoulders' }, { id: 'elbow', label: 'Elbows' }, { id: 'wrist', label: 'Wrists' },
  { id: 'chest', label: 'Chest' }, { id: 'upper_back', label: 'Upper back' }, { id: 'lower_back', label: 'Lower back' }, { id: 'core', label: 'Core' },
  { id: 'hip', label: 'Hips' }, { id: 'knee', label: 'Knees' }, { id: 'ankle', label: 'Ankles' },
]
export const PAIN_LEVEL_LABEL: Record<PainLevel, string> = { 1: 'Mild', 2: 'Moderate', 3: 'Severe' }

type Pick_ = Pick<Exercise, 'name' | 'movementPattern' | 'primaryMuscles' | 'secondaryMuscles'>
const has = (ex: Pick_, m: Muscle) => ex.primaryMuscles.includes(m)

/** Does this exercise load the painful area? Deliberately generous: it is better to leave out one move too many. */
export function painAffects(area: PainArea, ex: Pick_): boolean {
  const n = ex.name.toLowerCase()
  switch (area) {
    case 'neck': return /shrug|upright|neck|overhead|military|clean|snatch/.test(n)
    case 'shoulder': return has(ex, 'shoulders') || /press|overhead|raise|dip|push-?up|pushup|fly|flye|pullover|upright|pull-?up|chin-?up|pulldown/.test(n) && (has(ex, 'chest') || has(ex, 'triceps') || has(ex, 'back'))
    case 'elbow': return has(ex, 'biceps') || has(ex, 'triceps') || /curl|extension|skull|dip|pushdown|push-?up|pushup|close-grip/.test(n)
    case 'wrist': return /curl|push-?up|pushup|plank|wrist|front squat|clean|press|handstand|farmer/.test(n)
    case 'chest': return has(ex, 'chest') || /push-?up|pushup|dip|fly|flye|pullover/.test(n)
    case 'upper_back': return has(ex, 'back') && ex.movementPattern !== 'hinge' || /row|pulldown|pull-?up|chin-?up|shrug/.test(n)
    case 'lower_back': return ex.movementPattern === 'hinge' || /deadlift|good morning|bent[- ]over|back extension|row|squat|hip thrust|superman|clean|snatch/.test(n)
    case 'core': return has(ex, 'core') || /plank|crunch|sit-?up|twist|wood ?chop|leg raise/.test(n)
    case 'hip': return has(ex, 'glutes') || ex.movementPattern === 'lunge' || ex.movementPattern === 'hinge' || /lunge|split|step|hip|glute|bridge|thrust|sumo|abduct|adduct|squat/.test(n)
    case 'knee': return ex.movementPattern === 'squat' || ex.movementPattern === 'lunge' || has(ex, 'quads') || /jump|step|leg extension|leg press|lunge|squat|hop|sprint/.test(n)
    case 'ankle': return has(ex, 'calves') || /calf|jump|lunge|step|hop|sprint|skip/.test(n)
  }
}

const areasAt = (r: PainReport, min: PainLevel) => (Object.entries(r) as [PainArea, PainLevel][]).filter(([, l]) => l >= min).map(([a]) => a)

/** Moderate or severe pain: leave out anything that loads that area. */
export function painBlocks(r: PainReport | undefined, ex: Pick_): boolean {
  return !!r && areasAt(r, 2).some((a) => painAffects(a, ex))
}

/** Mild pain: keep the exercise but do one set less. */
export function painTrims(r: PainReport | undefined, ex: Pick_): boolean {
  return !!r && areasAt(r, 1).some((a) => painAffects(a, ex))
}

export const hasPain = (r: PainReport | undefined): boolean => !!r && Object.keys(r).length > 0

export function painSummary(r: PainReport): string {
  return (Object.entries(r) as [PainArea, PainLevel][])
    .map(([a, l]) => `${PAIN_AREAS.find((x) => x.id === a)?.label.toLowerCase() ?? a} (${PAIN_LEVEL_LABEL[l].toLowerCase()})`)
    .join(', ')
}

/** Notes shown in "Why this workout". */
export function painNotes(r: PainReport | undefined): string[] {
  if (!r || !hasPain(r)) return []
  const out = [`You told us about pain today: ${painSummary(r)}.`]
  if (areasAt(r, 2).length > 0) out.push('Exercises that load a moderately or severely painful area are left out today. Choose lighter movement and rest that area.')
  if (areasAt(r, 1).some((a) => r[a] === 1)) out.push('For mild pain, affected exercises keep one set less and a lighter feel. Stop any move that hurts.')
  if (areasAt(r, 3).length > 0) out.push('Severe pain is a reason to rest. If it does not settle or gets worse, please ask a qualified professional.')
  return out
}

/** Pain is for one day. The key under which it is saved. */
export const painKey = (date: string) => `pain.${date}`
