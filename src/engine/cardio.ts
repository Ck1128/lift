import { CARDIO, type CardioActivity } from '../data/cardio'
import type { EquipmentId, Goal, TrainingLevel } from './types'

export const MIN_SESSION_MINUTES = 15
export const MAX_SESSION_MINUTES = 180
export const DURATION_PRESETS: readonly number[] = [30, 45, 60, 75, 90]

const RANK: Record<TrainingLevel, number> = { beginner: 0, intermediate: 1, regular: 2 }

/** Longest single block of cardio planned for each level. Longer sessions add strength work instead. */
const CAP: Record<TrainingLevel, number> = { beginner: 20, intermediate: 30, regular: 40 }
const CARDIO_ONLY_CAP: Record<TrainingLevel, number> = { beginner: 30, intermediate: 60, regular: 90 }

const SHARE: Record<Goal, number> = { fat_loss: 0.25, endurance: 0.3, general: 0.15, muscle: 0.1, strength: 0 }

const round5 = (n: number) => Math.round(n / 5) * 5

/** Minutes of cardio to include. 0 means none. Always a multiple of 5. */
export function cardioMinutesFor(goal: Goal, level: TrainingLevel, minutes: number, cardioOnly = false): number {
  if (cardioOnly) return Math.max(0, Math.min(CARDIO_ONLY_CAP[level], round5(minutes - 5)))
  if (minutes < 30) return 0
  let m = round5(minutes * SHARE[goal])
  if (goal === 'strength' && minutes >= 60) m = Math.max(m, 10)
  if (goal === 'muscle' && minutes >= 45) m = Math.max(m, 10)
  if (m > 0 && m < 10) m = 10
  return Math.min(m, CAP[level])
}

const PREFERENCE: Record<Goal, string[]> = {
  fat_loss: ['cardio-treadmill-walk', 'cardio-treadmill-jog', 'cardio-bike', 'cardio-elliptical', 'cardio-stairs', 'cardio-rower', 'cardio-walk', 'cardio-march'],
  endurance: ['cardio-bike', 'cardio-treadmill-jog', 'cardio-rower', 'cardio-elliptical', 'cardio-treadmill-walk', 'cardio-stairs', 'cardio-walk', 'cardio-march'],
  general: ['cardio-elliptical', 'cardio-bike', 'cardio-treadmill-walk', 'cardio-rower', 'cardio-walk', 'cardio-stairs', 'cardio-treadmill-jog', 'cardio-march'],
  // After lifting the legs are tired, so prefer low-impact options.
  muscle: ['cardio-bike', 'cardio-elliptical', 'cardio-treadmill-walk', 'cardio-walk', 'cardio-march', 'cardio-rower', 'cardio-stairs', 'cardio-treadmill-jog'],
  strength: ['cardio-bike', 'cardio-treadmill-walk', 'cardio-elliptical', 'cardio-walk', 'cardio-march', 'cardio-rower', 'cardio-stairs', 'cardio-treadmill-jog'],
}

export interface CardioPick {
  activity: CardioActivity
  minutes: number
  intensityCue: string
}

export function intensityCue(level: TrainingLevel, finisher: boolean): string {
  if (finisher) return 'Easy pace. You should be able to talk in full sentences. Use it to cool down, not to get more tired.'
  if (level === 'beginner') return 'Easy to moderate (talk test): you can speak in full sentences. If you cannot, slow down.'
  if (level === 'intermediate') return 'Moderate (talk test): you can speak in short sentences but would not want to sing.'
  return 'Moderate (talk test). If you feel good you may add a few slightly harder minutes. Slow down if you cannot speak in short sentences.'
}

export interface CardioInput {
  goal: Goal
  level: TrainingLevel
  minutes: number
  available: Set<EquipmentId>
  excludedIds: string[]
  lastDone: Record<string, string>
  /** 'none' skips cardio, an id picks that activity, undefined lets the app choose. */
  choice?: string
  cardioOnly?: boolean
}

/** Options the user can pick from for their equipment and level. */
export function cardioOptions(input: Pick<CardioInput, 'level' | 'available' | 'excludedIds'>): CardioActivity[] {
  return CARDIO.filter((c) =>
    RANK[c.minLevel] <= RANK[input.level]
    && !(input.level === 'beginner' && c.impact === 'high')
    && !input.excludedIds.includes(c.id)
    && c.equipmentIds.every((q) => input.available.has(q)))
}

export function pickCardio(input: CardioInput): CardioPick | null {
  if (input.choice === 'none') return null
  const minutes = cardioMinutesFor(input.goal, input.level, input.minutes, input.cardioOnly)
  if (minutes <= 0) return null
  const options = cardioOptions(input)
  if (options.length === 0) return null
  const chosen = input.choice ? options.find((o) => o.id === input.choice) : undefined
  const order = PREFERENCE[input.goal]
  const ranked = [...options].sort((a, b) => {
    const da = input.lastDone[a.id] ?? ''
    const db = input.lastDone[b.id] ?? ''
    if (da !== db) return da < db ? -1 : 1 // never done first, then longest ago
    return order.indexOf(a.id) - order.indexOf(b.id)
  })
  const activity = chosen ?? ranked[0]
  return { activity, minutes, intensityCue: intensityCue(input.level, !input.cardioOnly && (input.goal === 'strength' || input.goal === 'muscle')) }
}

/** Rough calorie range for a cardio block, from MET values. Returns null when body weight is unknown. */
export function cardioCalories(activity: CardioActivity, minutes: number, weightKg: number | undefined): { low: number; high: number } | null {
  if (!weightKg || weightKg <= 0 || minutes < 5) return null
  const r10 = (n: number) => Math.round(n / 10) * 10
  const h = minutes / 60
  return { low: r10(activity.met[0] * weightKg * h), high: r10(activity.met[1] * weightKg * h) }
}
