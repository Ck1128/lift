/**
 * Which muscles each yoga pose mainly stretches. Used to pair a yoga session with the muscles you just trained
 * (a cool-down) or the ones that are still recovering. Strength-type poses (planks, boat) are left out on purpose:
 * this is about stretching, and it is a plain rule of thumb, not a measurement.
 */
import { POSES } from '../data/yoga'
import type { FineMuscle } from './muscleMap'

export const POSE_STRETCH: Record<string, FineMuscle[]> = {
  'neck-release': ['shoulders', 'upper_back'], 'shoulder-rolls': ['shoulders', 'upper_back'],
  'cat-cow': ['lower_back', 'upper_back', 'abs'], 'seated-spinal-flex': ['lower_back', 'upper_back'],
  'standing-side-bend': ['obliques', 'lats'], 'standing-forward-fold': ['hamstrings', 'lower_back', 'calves'],
  'sun-salutation-a': ['hamstrings', 'shoulders', 'chest'], 'sun-salutation-b': ['hamstrings', 'shoulders', 'chest', 'quads'],
  'down-dog': ['hamstrings', 'calves', 'shoulders', 'lats'], child: ['lower_back', 'lats', 'glutes'],
  'chair-pose': ['quads'], 'warrior-2': ['quads', 'glutes'], 'warrior-1': ['quads', 'chest'], triangle: ['hamstrings', 'obliques'],
  'wide-leg-fold': ['hamstrings'], goddess: ['quads', 'glutes'], 'side-angle': ['obliques', 'quads'],
  'crescent-lunge': ['quads', 'glutes'], 'low-lunge': ['quads', 'glutes'], lizard: ['quads', 'glutes'],
  cobra: ['chest', 'abs'], sphinx: ['chest', 'abs'], camel: ['chest', 'abs', 'quads'], bridge: ['glutes', 'chest', 'quads'],
  locust: ['lower_back', 'glutes'], 'seated-forward-fold': ['hamstrings', 'lower_back'], 'head-to-knee': ['hamstrings', 'lower_back'],
  caterpillar: ['hamstrings', 'lower_back'], 'knee-to-chest': ['lower_back', 'glutes'], 'happy-baby': ['glutes', 'hamstrings'],
  'reclined-hand-to-toe': ['hamstrings', 'calves'], 'reclined-leg-stretch': ['hamstrings'], 'figure-four': ['glutes'],
  'sleeping-pigeon': ['glutes'], 'chair-figure-four': ['glutes'], garland: ['glutes', 'calves'], frog: ['glutes'], dragon: ['quads', 'glutes'],
  'bound-angle': ['glutes'], 'reclined-bound-angle': ['glutes'], 'seated-twist': ['obliques', 'lower_back'],
  'supine-twist': ['obliques', 'lower_back'], 'supported-twist': ['obliques', 'lower_back'], 'chair-twist': ['obliques', 'lower_back'],
  'legs-up-wall': ['calves', 'hamstrings'], 'legs-on-chair': ['calves', 'hamstrings'], 'supported-child': ['lower_back', 'lats'],
  'supported-bridge': ['chest', 'lower_back'], 'chair-side-stretch': ['obliques', 'lats'], 'chair-forward-fold': ['hamstrings', 'lower_back'],
  'chair-cat-cow': ['lower_back', 'upper_back'], 'chair-eagle-arms': ['upper_back', 'shoulders'], 'chair-ankle-circles': ['calves'],
  eagle: ['shoulders', 'upper_back', 'glutes'],
}

export const stretchTargets = (poseId: string): FineMuscle[] => POSE_STRETCH[poseId] ?? []

/** How many of the wanted muscles this pose stretches. */
export function focusScore(poseId: string, focus: readonly FineMuscle[]): number {
  if (focus.length === 0) return 0
  const t = POSE_STRETCH[poseId]
  return t ? t.filter((m) => focus.includes(m)).length : 0
}

/** Ids in the map that are not in the catalog. Checked by a test so a renamed pose cannot silently lose its tags. */
export const unknownPoseIds = (): string[] => Object.keys(POSE_STRETCH).filter((id) => !POSES.some((p) => p.id === id))
