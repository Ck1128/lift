import type { HeightUnit, WeightUnit } from './types'

export const LB_PER_KG = 2.2046226218
export const CM_PER_IN = 2.54

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value
  return from === 'kg' ? value * LB_PER_KG : value / LB_PER_KG
}

export function toKg(value: number, unit: WeightUnit): number {
  return convertWeight(value, unit, 'kg')
}

export function fromKg(kg: number, unit: WeightUnit): number {
  return convertWeight(kg, 'kg', unit)
}

export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step
}

/** Avoids 22.500000000001 style output. */
export function tidy(value: number): number {
  return Math.round(value * 100) / 100
}

/** One decimal place, for body weight shown to people. */
export function tidy1(value: number): number {
  return Math.round(value * 10) / 10
}

export function formatWeight(value: number | undefined, unit: WeightUnit): string {
  if (value === undefined) return '-'
  return `${tidy(value)} ${unit}`
}

// ---------- height ----------
export interface FtIn { ft: number; inch: number }

/** Whole feet and whole inches (0 to 11), rounded to the nearest inch. */
export function cmToFtIn(cm: number): FtIn {
  const total = Math.round(cm / CM_PER_IN)
  return { ft: Math.floor(total / 12), inch: total % 12 }
}

export function ftInToCm(ft: number, inch: number): number {
  return tidy1((ft * 12 + inch) * CM_PER_IN)
}

export function formatHeight(cm: number | undefined, unit: HeightUnit): string {
  if (cm === undefined) return '-'
  if (unit === 'cm') return `${Math.round(cm)} cm`
  const { ft, inch } = cmToFtIn(cm)
  return `${ft} ft ${inch} in`
}

export const HEIGHT_CM_RANGE: [number, number] = [100, 250]
export const WEIGHT_KG_RANGE: [number, number] = [30, 300]

/** Plausible range for a typed body weight in the unit it was typed in. */
export function weightRange(unit: WeightUnit): [number, number] {
  return unit === 'kg' ? WEIGHT_KG_RANGE : [Math.round(WEIGHT_KG_RANGE[0] * LB_PER_KG), Math.round(WEIGHT_KG_RANGE[1] * LB_PER_KG)]
}
