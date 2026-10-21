import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { saveEquipment } from '../db/repo'
import { defaultLoad, presetEquipment, presetFor } from '../engine/equipment'
import type { EquipmentId, EquipmentItem, GymType, LocationType, WeightUnit } from '../engine/types'
import { EQUIPMENT_LABEL, LOADABLE } from '../engine/types'
import { Button } from './ui'

const ORDER: EquipmentId[] = ['bodyweight', 'dumbbell', 'kettlebell', 'barbell', 'bench', 'pullup_bar', 'bands', 'mat', 'machine', 'cable', 'smith']

export function EquipmentEditor({ location, gymType, unit }: { location: LocationType; gymType: GymType; unit: WeightUnit }) {
  const rec = useLiveQuery(() => db.equipment.get(location), [location])
  const items = rec?.items ?? presetEquipment(presetFor(location, gymType), unit)
  const preset = location === 'home' ? 'an empty home setup (bodyweight only)' : gymType === 'planet_fitness' ? 'Planet Fitness (no barbells; Smith machine, dumbbells up to 75 lb, machines, cables)' : 'a typical commercial gym'

  const set = (id: EquipmentId, patch: Partial<EquipmentItem>) => {
    const cur = items[id] ?? { id, available: false }
    const next: EquipmentItem = { ...cur, id, ...patch }
    if (patch.available && LOADABLE.includes(id) && next.minWeight === undefined) Object.assign(next, defaultLoad(id, unit))
    return saveEquipment(location, { ...items, [id]: next })
  }
  const num = (s: string) => (s.trim() === '' ? undefined : Number(s))

  return (
    <div>
      <p className="hint">
        {location === 'home' ? 'Tick only what you own.' : 'Tick what your gym has today.'} The workout generator uses only the ticked items.
        {location === 'gym' && ' The starting list is a guess, not a record of every location, so please confirm it.'}
        {' '}Untick something that is broken or taken, then generate again to get alternatives.
      </p>
      {ORDER.map((id) => {
        const it = items[id] ?? { id, available: false }
        const locked = id === 'bodyweight'
        return (
          <div key={id} className="equip">
            <label className="check">
              <input type="checkbox" checked={locked ? true : it.available} disabled={locked} onChange={(e) => set(id, { available: e.target.checked })} />
              <span>{EQUIPMENT_LABEL[id]}</span>
            </label>
            {it.available && LOADABLE.includes(id) && (
              <div className="load-row">
                {(['minWeight', 'maxWeight', 'increment'] as const).map((k) => (
                  <label key={k} className="mini">
                    <span>{k === 'minWeight' ? 'Lightest' : k === 'maxWeight' ? 'Heaviest' : 'Step'} ({unit})</span>
                    <input
                      type="number" inputMode="decimal" min={0} step="any" defaultValue={it[k] ?? ''}
                      key={`${id}-${k}-${it[k] ?? ''}`}
                      onBlur={(e) => {
                        const v = num(e.target.value)
                        if (v !== undefined && v > 0) set(id, { [k]: v, unit })
                      }}
                    />
                  </label>
                ))}
                <p className="hint">{id === 'barbell' ? 'Include the bar in Lightest. Step is the smallest weight you can add (a pair of plates).' : 'Step is the gap between weights, for example 5.'}</p>
              </div>
            )}
          </div>
        )
      })}
      <Button variant="ghost" onClick={() => saveEquipment(location, presetEquipment(presetFor(location, gymType), unit))}>
        Reset list to {preset}
      </Button>
    </div>
  )
}
