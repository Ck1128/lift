import type { EquipmentId, EquipmentItem, EquipmentSet, GymType, LocationType, WeightUnit } from './types'
import { ALL_EQUIPMENT, LOADABLE } from './types'

export type PresetKind = 'home' | 'standard_gym' | 'generic_gym'

export function defaultLoad(id: EquipmentId, unit: WeightUnit): Pick<EquipmentItem, 'minWeight' | 'maxWeight' | 'increment' | 'unit'> | null {
  if (!LOADABLE.includes(id)) return null
  const lb = unit === 'lb'
  if (id === 'dumbbell') return { minWeight: lb ? 5 : 2.5, maxWeight: lb ? 50 : 25, increment: lb ? 5 : 2.5, unit }
  if (id === 'kettlebell') return { minWeight: lb ? 10 : 4, maxWeight: lb ? 50 : 24, increment: lb ? 5 : 4, unit }
  // barbell: bar plus plates. 45 lb / 20 kg bar, smallest plate pair adds 5 lb / 2.5 kg.
  return { minWeight: lb ? 45 : 20, maxWeight: lb ? 300 : 140, increment: lb ? 5 : 2.5, unit }
}

function item(id: EquipmentId, available: boolean, unit: WeightUnit, load?: Partial<EquipmentItem>): EquipmentItem {
  return { id, available, ...(available ? defaultLoad(id, unit) : null), ...load }
}

/** Version and review date of the curated default lists (also in docs/standard-gym-equipment.md). */
export const PRESET_VERSION = 'presets-3'
export const PRESET_REVIEWED = '2026-10-21'

/**
 * Starting points only. Individual locations differ.
 * Standard gym: see src/engine/standardGym.ts (machines, cables, Smith, dumbbells to 75 lb, EZ bars, kettlebells,
 * bands, rowers; no Olympic barbells or squat racks). The user can mark anything missing at their club.
 */
export const PRESET_EQUIPMENT: Record<PresetKind, EquipmentId[]> = {
  home: ['bodyweight', 'mat'],
  // From the club equipment list in src/engine/standardGym.ts: no Olympic barbell or pull-up bar.
  standard_gym: ['bodyweight', 'mat', 'dumbbell', 'machine', 'cable', 'smith', 'bench', 'kettlebell', 'bands', 'ez_bar', 'treadmill', 'exercise_bike', 'elliptical', 'rower', 'stair_climber'],
  generic_gym: ['bodyweight', 'mat', 'dumbbell', 'barbell', 'ez_bar', 'machine', 'cable', 'smith', 'bench', 'pullup_bar', 'kettlebell', 'bands', 'treadmill', 'exercise_bike', 'elliptical', 'rower', 'stair_climber'],
}

export function presetEquipment(kind: PresetKind, unit: WeightUnit): EquipmentSet {
  const lb = unit === 'lb'
  const ids: EquipmentId[] = ALL_EQUIPMENT
  const on = PRESET_EQUIPMENT
  const set: EquipmentSet = {}
  for (const id of ids) {
    const available = on[kind].includes(id)
    let load: Partial<EquipmentItem> | undefined
    if (kind === 'standard_gym' && id === 'kettlebell') {
      load = { minWeight: lb ? 10 : 4, maxWeight: lb ? 50 : 24, increment: lb ? 5 : 4, unit }
    }
    if (kind === 'standard_gym' && id === 'dumbbell') {
      load = { minWeight: lb ? 5 : 2.5, maxWeight: lb ? 75 : 35, increment: lb ? 5 : 2.5, unit }
    }
    if (kind === 'generic_gym' && id === 'dumbbell') {
      load = { minWeight: lb ? 5 : 2.5, maxWeight: lb ? 100 : 45, increment: lb ? 5 : 2.5, unit }
    }
    set[id] = item(id, available, unit, load)
  }
  return set
}

export function presetFor(location: LocationType, gymType: GymType): PresetKind {
  if (location === 'home') return 'home'
  return gymType === 'standard' ? 'standard_gym' : 'generic_gym'
}

/**
 * Equipment ids the user has confirmed as available.
 * Bodyweight is an ordinary option that is on unless the user explicitly turns it off.
 * (A missing entry means "on", so older saved lists keep working.)
 */
export function availableIds(set: EquipmentSet): Set<EquipmentId> {
  const out = new Set<EquipmentId>()
  if (set.bodyweight?.available !== false) out.add('bodyweight')
  for (const it of Object.values(set)) if (it?.available) out.add(it.id)
  return out
}

/** A preset list with the items the user said their club does not have switched off. */
export function withExclusions(set: EquipmentSet, excluded: EquipmentId[] = []): EquipmentSet {
  const out: EquipmentSet = { ...set }
  for (const id of excluded) {
    const it = out[id]
    if (it) out[id] = { ...it, available: false }
  }
  return out
}

/** Plain-language summary of what is available, for the "applied equipment" line. */
export function equipmentSummary(set: EquipmentSet, labels: Record<EquipmentId, string>): string {
  return [...availableIds(set)].map((id) => labels[id]).join(', ')
}

export function loadSpec(set: EquipmentSet, id: EquipmentId): { min: number; max: number; increment: number; unit: WeightUnit } | null {
  const it = set[id]
  if (!it?.available || it.minWeight === undefined || it.maxWeight === undefined || !it.increment || !it.unit) return null
  return { min: it.minWeight, max: it.maxWeight, increment: it.increment, unit: it.unit }
}

/** Convert a saved equipment set to another weight unit (ranges rounded to friendly numbers). */
export function convertEquipmentUnit(set: EquipmentSet, to: WeightUnit): EquipmentSet {
  const out: EquipmentSet = {}
  for (const [k, it] of Object.entries(set) as [EquipmentId, EquipmentItem][]) {
    if (!it.unit || it.unit === to) {
      out[k] = it
      continue
    }
    const d = defaultLoad(k, to)
    out[k] = { ...it, ...(d ?? {}), unit: to }
  }
  return out
}
