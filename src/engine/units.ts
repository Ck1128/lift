import type { WeightUnit } from './types'

export const LB_PER_KG = 2.20462
export const CM_PER_IN = 2.54

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value
  return from === 'kg' ? value * LB_PER_KG : value / LB_PER_KG
}

export function toKg(value: number, unit: WeightUnit): number {
  return convertWeight(value, unit, 'kg')
}

export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step
}

/** Avoids 22.500000000001 style output. */
export function tidy(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatWeight(value: number | undefined, unit: WeightUnit): string {
  if (value === undefined) return '-'
  return `${tidy(value)} ${unit}`
}
