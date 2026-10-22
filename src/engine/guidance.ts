import type { FoodLogEntry } from './food'
import { summarizeDay } from './food'
import type { Sex } from './types'

/** What this app does and does not do with Apple Health. Shown in Settings. */
export const APPLE_HEALTH_NOTE = {
  status: 'Apple Health works through the Shortcuts app and Health export files, because a web app cannot reach Health directly.',
  why: 'Lift sends workouts, yoga, weight and optional food calories to Health, and reads body weight and workouts back. Nothing goes through a server.',
  alternative: 'See Settings > Apple Health for setup. Details are in docs/APPLE_HEALTH.md.',
} as const

export interface EnergyInput {
  weightKg?: number
  heightCm?: number
  age?: number
  sex?: Sex
}

export interface EnergyEstimate {
  /** Resting energy (Mifflin-St Jeor), in kilocalories per day. */
  bmr: number
  /** A broad range for a day with light to moderate activity. */
  low: number
  high: number
}

const round50 = (n: number) => Math.round(n / 50) * 50

/**
 * A rough daily energy range from the Mifflin-St Jeor equation. It needs weight, height, age and sex, and returns null
 * when any of them is missing, because guessing would be worse than showing nothing. It is an estimate, not a target.
 */
export function energyEstimate(i: EnergyInput): EnergyEstimate | null {
  if (!i.weightKg || !i.heightCm || !i.age || !i.sex) return null
  const base = 10 * i.weightKg + 6.25 * i.heightCm - 5 * i.age
  const bmr = base + (i.sex === 'male' ? 5 : -161)
  if (!(bmr > 600)) return null
  return { bmr: round50(bmr), low: round50(bmr * 1.2), high: round50(bmr * 1.55) }
}

export interface GuidanceInput extends EnergyInput {
  /** The day the food was eaten. The advice is for the day after. */
  date: string
  entries: FoodLogEntry[]
  trained: boolean
}

export interface Guidance {
  date: string
  /** Nothing was logged, so there is nothing to say. */
  empty: boolean
  loggedKcal: number
  energy: EnergyEstimate | null
  notes: string[]
}

/** The words this guidance must never use. Tested, so nobody adds them by accident. */
export const FORBIDDEN_GUIDANCE_WORDS = ['burn off', 'make up for', 'make it up', 'compensate', 'earn', 'cheat', 'guilt', 'punish', 'bad day', 'blew', 'undo']

/**
 * Gentle, optional notes about the day after a food log. It never asks you to eat less to make up for a day, never
 * counts exercise as a debt, and says plainly when the log may simply be incomplete.
 */
export function nextDayGuidance(i: GuidanceInput): Guidance {
  const s = summarizeDay(i.entries)
  const energy = energyEstimate(i)
  if (s.count === 0) return { date: i.date, empty: true, loggedKcal: 0, energy, notes: [] }
  const notes: string[] = []
  const protein = i.entries.reduce((a, e) => a + (e.protein ?? 0), 0)
  const proteinKnown = i.entries.some((e) => e.protein !== undefined)

  if (energy && s.kcal < energy.bmr * 0.7) {
    notes.push('The log for this day is quite low. It may be incomplete, since small snacks and drinks are easy to forget. If you are eating this little on purpose or by accident, it is worth talking to a doctor or registered dietitian.')
  } else if (energy && s.kcal > energy.high * 1.15) {
    notes.push('You logged a bit more than the usual range. One day does not matter, and there is nothing to fix. Tomorrow, simply eat normally and drink water.')
  } else if (energy) {
    notes.push('What you logged sits in a typical range for a day like this. Nothing to change.')
  }

  if (i.weightKg && proteinKnown) {
    const perKg = protein / i.weightKg
    if (perKg < 0.8) notes.push('Logged protein looked on the lower side. Eggs, yoghurt, beans, lentils, tofu, fish or chicken are easy to add at any meal, if that suits you.')
  }
  if (i.trained) notes.push('You trained, so a normal meal with some protein and carbohydrate, and water, helps you recover.')
  notes.push('Calories here are estimates from the portions you entered. This is general information, not medical or dietary advice.')
  return { date: i.date, empty: false, loggedKcal: Math.round(s.kcal), energy, notes }
}
