import type { Experience, Goal, HeightUnit, WeightUnit } from './types'

export interface ProfileForm {
  displayName: string
  age: string
  heightValue: string
  heightUnit: HeightUnit
  weightValue: string
  weightUnit: WeightUnit
  goal: Goal
  experienceLevel: Experience
  trainingDays: number[]
  preferredDurationMinutes: string
}

export type FormErrors = Partial<Record<keyof ProfileForm, string>>

function num(s: string): number | undefined {
  if (s.trim() === '') return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

/** Optional numeric fields may be blank, but when present they must be sensible. */
export function validateProfileForm(f: ProfileForm): FormErrors {
  const e: FormErrors = {}
  if (f.displayName.length > 40) e.displayName = 'Keep the nickname under 40 characters.'
  const age = num(f.age)
  if (age !== undefined && (!Number.isInteger(age) || age < 13 || age > 100)) e.age = 'Enter a whole number between 13 and 100, or leave it blank.'
  const h = num(f.heightValue)
  if (h !== undefined) {
    const [lo, hi] = f.heightUnit === 'cm' ? [100, 250] : [40, 100]
    if (Number.isNaN(h) || h < lo || h > hi) e.heightValue = `Enter a height between ${lo} and ${hi} ${f.heightUnit}, or leave it blank.`
  }
  const w = num(f.weightValue)
  if (w !== undefined) {
    const [lo, hi] = f.weightUnit === 'kg' ? [30, 300] : [66, 660]
    if (Number.isNaN(w) || w < lo || w > hi) e.weightValue = `Enter a weight between ${lo} and ${hi} ${f.weightUnit}, or leave it blank.`
  }
  if (f.trainingDays.length < 1) e.trainingDays = 'Pick at least one training day.'
  else if (f.trainingDays.length > 6) e.trainingDays = 'Pick at most six days. Rest days matter.'
  const d = num(f.preferredDurationMinutes)
  if (d === undefined || !Number.isInteger(d) || d < 15 || d > 120) e.preferredDurationMinutes = 'Enter a whole number of minutes between 15 and 120.'
  return e
}

export function parseOptional(s: string): number | undefined {
  const n = num(s)
  return n === undefined || Number.isNaN(n) ? undefined : n
}
