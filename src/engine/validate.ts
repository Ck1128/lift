import { ALL_MUSCLES, type EquipmentId, type Exercise } from './types'

const EQUIPMENT: EquipmentId[] = [
  'bodyweight', 'dumbbell', 'barbell', 'machine', 'cable', 'smith',
  'bench', 'pullup_bar', 'kettlebell', 'bands', 'mat',
]
const PATTERNS = ['push', 'pull', 'squat', 'hinge', 'lunge', 'core', 'isolation']

/** Returns a list of problems. An empty list means the exercise is safe for the engine to use. */
export function validateExercise(e: Partial<Exercise>): string[] {
  const problems: string[] = []
  if (!e.id || typeof e.id !== 'string') problems.push('missing id')
  if (!e.name || typeof e.name !== 'string') problems.push('missing name')
  if (!Array.isArray(e.primaryMuscles) || e.primaryMuscles.length === 0) problems.push('no primary muscle')
  else if (e.primaryMuscles.some((m) => !ALL_MUSCLES.includes(m))) problems.push('unknown muscle')
  if (!e.movementPattern || !PATTERNS.includes(e.movementPattern)) problems.push('bad movement pattern')
  if (!Array.isArray(e.equipmentIds) || e.equipmentIds.length === 0) problems.push('no equipment listed')
  else if (e.equipmentIds.some((q) => !EQUIPMENT.includes(q))) problems.push('unknown equipment')
  if (!Array.isArray(e.instructions) || e.instructions.length === 0) problems.push('no instructions')
  return problems
}
