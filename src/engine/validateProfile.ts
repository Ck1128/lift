import { birthDateError } from './age'
import { cmToFtIn, fromKg, ftInToCm, HEIGHT_CM_RANGE, tidy1, toKg, weightRange } from './units'
import type { Goal, HeightUnit, Profile, Sex, Track, TrainingLevel, WeightUnit } from './types'
import { TRACKS_ERROR } from './tracks'
import { MAX_SESSION_MINUTES, MIN_SESSION_MINUTES } from './cardio'

export interface ProfileForm {
  displayName: string
  /** Date of birth, YYYY-MM-DD. Required. */
  birthDate: string
  /** Required. */
  sex: '' | Sex
  /** How height is shown. The value is always kept in centimetres in `heightCm`. */
  heightUnit: HeightUnit
  /** Canonical height as text, in centimetres. */
  heightCm: string
  /** Edit buffers for the feet and inches fields. They are derived from `heightCm`. */
  heightFt: string
  heightIn: string
  /** The page-level default unit for every weight on the page. */
  weightUnit: WeightUnit
  /** The unit used by the body weight field. It follows `weightUnit` unless the user overrides it. */
  weightFieldUnit: WeightUnit
  /** Body weight, typed in `weightFieldUnit`. */
  weightValue: string
  goal: Goal
  trainingLevel: TrainingLevel
  trainingDays: number[]
  preferredDurationMinutes: string
  nutritionGuidance: boolean
  /** Workout, Yoga or both. An empty list is not allowed when saving from the form. */
  tracks: Track[]
}

export type FormErrors = Partial<Record<keyof ProfileForm, string>>

function num(s: string): number | undefined {
  if (s.trim() === '') return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

/** Feet and inches buffers for a height in centimetres. Blank when there is no height. */
export function ftInBuffers(cm: number | undefined): { heightFt: string; heightIn: string } {
  if (cm === undefined) return { heightFt: '', heightIn: '' }
  const { ft, inch } = cmToFtIn(cm)
  return { heightFt: String(ft), heightIn: String(inch) }
}

/**
 * Typing feet or inches updates the canonical centimetres. Switching the display unit never touches it,
 * so flipping between ft/in and cm cannot drift the saved number.
 */
export function withFtIn(f: ProfileForm, ft: string, inch: string): ProfileForm {
  const feet = ft === '' ? 0 : Number(ft)
  const inches = inch === '' ? 0 : Number(inch)
  const cm = ft === '' && inch === '' ? '' : String(ftInToCm(feet, inches))
  return { ...f, heightFt: ft, heightIn: inch, heightCm: cm }
}

export function withHeightUnit(f: ProfileForm, unit: HeightUnit): ProfileForm {
  if (unit === f.heightUnit) return f
  const cm = num(f.heightCm)
  const buffers = cm !== undefined && !Number.isNaN(cm) ? ftInBuffers(cm) : { heightFt: f.heightFt, heightIn: f.heightIn }
  return { ...f, heightUnit: unit, ...buffers }
}

/** Switching the unit of one weight field converts the number so the physical weight stays the same. */
export function withWeightFieldUnit(f: ProfileForm, unit: WeightUnit): ProfileForm {
  if (unit === f.weightFieldUnit) return f
  const v = num(f.weightValue)
  if (v === undefined || Number.isNaN(v)) return { ...f, weightFieldUnit: unit }
  return { ...f, weightFieldUnit: unit, weightValue: String(tidy1(fromKg(toKg(v, f.weightFieldUnit), unit))) }
}

export function formWeightKg(f: ProfileForm): number | undefined {
  const v = num(f.weightValue)
  return v === undefined || Number.isNaN(v) ? undefined : Math.round(toKg(v, f.weightFieldUnit) * 100) / 100
}

export function formHeightCm(f: ProfileForm): number | undefined {
  const v = num(f.heightCm)
  return v === undefined || Number.isNaN(v) ? undefined : v
}

export function profileFormFrom(p?: Profile): ProfileForm {
  const heightUnit = p?.heightDisplayUnit ?? 'ft-in'
  const weightUnit = p?.weightUnit ?? 'lb'
  return {
    displayName: p?.displayName ?? '',
    birthDate: p?.birthDate ?? '',
    sex: p?.sex ?? '',
    heightUnit,
    heightCm: p?.heightCm?.toString() ?? '',
    ...ftInBuffers(p?.heightCm),
    weightUnit,
    weightFieldUnit: weightUnit,
    weightValue: p?.weightKg !== undefined ? String(tidy1(fromKg(p.weightKg, weightUnit))) : '',
    goal: p?.goal ?? 'muscle',
    trainingLevel: p?.trainingLevel ?? 'beginner',
    trainingDays: p?.trainingDays ?? [0, 2, 4],
    preferredDurationMinutes: String(p?.preferredDurationMinutes ?? 45),
    nutritionGuidance: p?.nutritionGuidance ?? false,
    // A saved profile without the setting keeps both. A brand-new form starts with nothing chosen, on purpose.
    tracks: p ? (p.tracks && p.tracks.length > 0 ? [...p.tracks] : ['workout', 'yoga']) : [],
  }
}

/** Optional numeric fields may be blank, but when present they must be sensible. */
export function validateProfileForm(f: ProfileForm): FormErrors {
  const e: FormErrors = {}
  if (f.displayName.length > 40) e.displayName = 'Keep the nickname under 40 characters.'
  const dobError = birthDateError(f.birthDate)
  if (dobError) e.birthDate = dobError
  if (f.sex === '') e.sex = 'Choose Female or Male. It sets your starting weights, calorie estimate and recovery times.'
  const h = num(f.heightCm)
  if (h !== undefined) {
    const [lo, hi] = HEIGHT_CM_RANGE
    if (Number.isNaN(h) || h < lo || h > hi) {
      e.heightCm = f.heightUnit === 'cm'
        ? `Enter a height between ${lo} and ${hi} cm, or leave it blank.`
        : `Enter a height between ${cmToFtIn(lo).ft} ft ${cmToFtIn(lo).inch} in and ${cmToFtIn(hi).ft} ft ${cmToFtIn(hi).inch} in, or leave it blank.`
    }
  }
  const w = num(f.weightValue)
  if (w !== undefined) {
    const [lo, hi] = weightRange(f.weightFieldUnit)
    if (Number.isNaN(w) || w < lo || w > hi) e.weightValue = `Enter a weight between ${lo} and ${hi} ${f.weightFieldUnit}, or leave it blank.`
  }
  if (f.tracks.length < 1) e.tracks = TRACKS_ERROR
  // Workout questions only matter when Workout is switched on.
  if (f.tracks.includes('workout')) {
    if (f.trainingDays.length < 1) e.trainingDays = 'Pick at least one training day.'
    else if (f.trainingDays.length > 6) e.trainingDays = 'Pick at most six days. Rest days matter.'
    const d = num(f.preferredDurationMinutes)
    if (d === undefined || !Number.isInteger(d) || d < MIN_SESSION_MINUTES || d > MAX_SESSION_MINUTES) {
      e.preferredDurationMinutes = `Enter a whole number of minutes between ${MIN_SESSION_MINUTES} and ${MAX_SESSION_MINUTES}.`
    }
  }
  return e
}

export function parseOptional(s: string): number | undefined {
  const n = num(s)
  return n === undefined || Number.isNaN(n) ? undefined : n
}
