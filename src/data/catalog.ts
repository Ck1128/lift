import raw from './catalog.json'
import { MANUAL_EXERCISES } from './manualExercises'
import type { EquipmentId, Exercise, ExerciseType, Level, Muscle, Pattern } from '../engine/types'
import { validateExercise } from '../engine/validate'

export const CATALOG_VERSION = 'fedb-1+manual-2'

interface RawRow {
  id: string
  name: string
  pm: string[]
  sm: string[]
  pat: string
  eq: string[]
  lvl: string
  c: boolean
  ins: string[]
  img?: string
}

function typeOf(eq: string[]): ExerciseType {
  const main = eq.find((e) => e !== 'bench' && e !== 'pullup_bar') ?? 'bodyweight'
  return main as ExerciseType
}

function fromRaw(r: RawRow): Exercise {
  return {
    id: r.id,
    name: r.name,
    primaryMuscles: r.pm as Muscle[],
    secondaryMuscles: r.sm as Muscle[],
    movementPattern: r.pat as Pattern,
    equipmentIds: r.eq as EquipmentId[],
    exerciseType: typeOf(r.eq),
    difficulty: r.lvl as Level,
    compound: r.c,
    instructions: r.ins,
    imageId: r.img,
    catalogVersion: CATALOG_VERSION,
  }
}

/**
 * Corrections to the bundled dataset, applied by exercise name.
 *  - EZ-bar and fixed-barbell curls are done with the curl bars many gyms have, not an Olympic barbell and plates.
 *  - The ab crunch machine is a simple selectorized machine, so it is fine for beginners.
 */
const EZ_BAR = new Set(['EZ-Bar Curl', 'Barbell Curl', 'Preacher Curl', 'Close-Grip EZ-Bar Press'])
const BEGINNER_OK = new Set(['Ab Crunch Machine'])
function patch(e: Exercise): Exercise {
  let out = e
  if (EZ_BAR.has(e.name)) out = { ...out, equipmentIds: out.equipmentIds.map((q) => (q === 'barbell' ? 'ez_bar' : q)) as EquipmentId[], exerciseType: 'ez_bar' }
  if (BEGINNER_OK.has(e.name)) out = { ...out, difficulty: 'beginner' }
  return out
}

const names = new Set<string>()
const all: Exercise[] = []
for (const e of [...MANUAL_EXERCISES, ...(raw as RawRow[]).map(fromRaw)].map(patch)) {
  const key = e.name.toLowerCase()
  if (names.has(key)) continue
  names.add(key)
  all.push({ ...e, catalogVersion: CATALOG_VERSION })
}

/** Only entries that pass validation reach the engine. Invalid ones are dropped, never guessed at. */
export const CATALOG: Exercise[] = all.filter((e) => validateExercise(e).length === 0)

const byId = new Map(CATALOG.map((e) => [e.id, e]))
export function exerciseById(id: string): Exercise | undefined {
  return byId.get(id)
}

export const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
export function imageUrls(e: Exercise): [string, string] | null {
  return e.imageId ? [`${IMAGE_BASE}${e.imageId}/0.jpg`, `${IMAGE_BASE}${e.imageId}/1.jpg`] : null
}
