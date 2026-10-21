import type { EquipmentId, EquipmentItem, EquipmentSet, GymType, LocationType, WeightUnit } from './types'
import { LOADABLE } from './types'

export type PresetKind = 'home' | 'planet_fitness' | 'generic_gym'

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

/** Starting points only. The user must confirm what their own location actually has. */
export function presetEquipment(kind: PresetKind, unit: WeightUnit): EquipmentSet {
  const lb = unit === 'lb'
  const ids: EquipmentId[] = ['bodyweight', 'dumbbell', 'barbell', 'machine', 'cable', 'smith', 'bench', 'pullup_bar', 'kettlebell', 'bands', 'mat']
  const on: Record<PresetKind, EquipmentId[]> = {
    home: ['bodyweight', 'mat'],
    planet_fitness: ['bodyweight', 'mat', 'dumbbell', 'machine', 'cable', 'smith', 'bench'],
    generic_gym: ['bodyweight', 'mat', 'dumbbell', 'barbell', 'machine', 'cable', 'smith', 'bench', 'pullup_bar', 'kettlebell', 'bands'],
  }
  const set: EquipmentSet = {}
  for (const id of ids) {
    const available = on[kind].includes(id)
    let load: Partial<EquipmentItem> | undefined
    if (kind === 'planet_fitness' && id === 'dumbbell') {
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
  return gymType === 'planet_fitness' ? 'planet_fitness' : 'generic_gym'
}

/** Equipment ids the user has confirmed as available. Bodyweight is always allowed. */
export function availableIds(set: EquipmentSet): Set<EquipmentId> {
  const out = new Set<EquipmentId>(['bodyweight'])
  for (const it of Object.values(set)) if (it?.available) out.add(it.id)
  return out
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
