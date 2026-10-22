import { useState } from 'react'
import { db } from '../db/schema'
import { applyDefaultEquipment, saveEquipment, setExcludedEquipment } from '../db/repo'
import {
  availableIds, defaultLoad, equipmentSummary, PRESET_EQUIPMENT, PRESET_REVIEWED, PRESET_VERSION, presetEquipment, presetFor, withExclusions,
} from '../engine/equipment'
import type { EquipmentId, EquipmentItem, EquipmentSet, GymType, LocationType, WeightUnit } from '../engine/types'
import { ALL_EQUIPMENT, EQUIPMENT_LABEL, LOADABLE } from '../engine/types'
import { useQuery } from '../hooks/app'
import { ConfirmButton, SaveBar } from './confirm'

/** In Settings changes wait for Save. During setup (`instant`) each tick is saved at once, because Continue needs it. */
export function EquipmentEditor({ location, gymType, unit, instant }: { location: LocationType; gymType: GymType; unit: WeightUnit; instant?: boolean }) {
  const q = useQuery(() => db.equipment.get(location), [location])
  // Changes wait here until Save. Nothing is applied to your workouts before that.
  const [draftExcluded, setDraftExcluded] = useState<EquipmentId[] | null>(null)
  const [draftItems, setDraftItems] = useState<EquipmentSet | null>(null)
  if (q.loading) return <p className="muted">Loading...</p>
  const rec = q.value
  const kind = presetFor(location, gymType)
  const preset = rec?.preset
  const excluded = draftExcluded ?? rec?.excluded ?? []
  const items = preset
    ? withExclusions(presetEquipment(preset, unit), excluded)
    : (draftItems ?? rec?.items ?? presetEquipment(kind, unit))
  const dirty = !instant && (draftExcluded !== null || draftItems !== null)
  const discard = () => { setDraftExcluded(null); setDraftItems(null) }
  const saveBar = (
    <SaveBar
      dirty={dirty} label="Save equipment" onDiscard={discard}
      onSave={async () => {
        if (preset && draftExcluded) await setExcludedEquipment(location, draftExcluded)
        else if (draftItems) await saveEquipment(location, draftItems)
        discard()
      }}
    />
  )
  const summary = equipmentSummary(items, EQUIPMENT_LABEL)

  if (preset) {
    const base = PRESET_EQUIPMENT[preset]
    const toggle = (id: EquipmentId, on: boolean) => {
      const next = on ? excluded.filter((x) => x !== id) : [...excluded, id]
      if (instant) void setExcludedEquipment(location, next)
      else setDraftExcluded(next)
    }
    return (
      <div>
        {saveBar}
        <p className="notice">
          <strong>Standard gym equipment applied automatically.</strong>{' '}
          List {PRESET_VERSION}, last reviewed {PRESET_REVIEWED}. It is a typical club, not a record of every location, so
          untick anything your club does not have.
        </p>
        <p className="hint"><strong>Applied now:</strong> {summary}</p>
        {base.map((id) => {
          const on = !excluded.includes(id)
          return (
            <div key={id} className="equip">
              <label className="check">
                <input type="checkbox" checked={on} onChange={(e) => void toggle(id, e.target.checked)} />
                <span>{EQUIPMENT_LABEL[id]}</span>
              </label>
              {on && id === 'dumbbell' && items.dumbbell?.maxWeight && <p className="hint">Dumbbells up to {items.dumbbell.maxWeight} {items.dumbbell.unit}.</p>}
            </div>
          )
        })}
        <p className="hint">Not on the standard list: {ALL_EQUIPMENT.filter((id) => !base.includes(id)).map((id) => EQUIPMENT_LABEL[id]).join(', ')}.</p>
        <details>
          <summary>Edit the list myself instead</summary>
          <p className="hint">Your club has something different? Switch to your own list. It starts from the current one and you can tick anything. It will no longer follow updates to the standard gym list.</p>
          <ConfirmButton variant="ghost" confirm={{ title: 'Switch to your own list?', message: 'It starts from the current list and will no longer follow updates to the standard gym list.' }} onConfirm={() => saveEquipment(location, items)}>Use my own list</ConfirmButton>
        </details>
      </div>
    )
  }

  const set = (id: EquipmentId, patch: Partial<EquipmentItem>) => {
    const cur = items[id] ?? { id, available: false }
    const next: EquipmentItem = { ...cur, id, ...patch }
    if (patch.available && LOADABLE.includes(id) && next.minWeight === undefined) Object.assign(next, defaultLoad(id, unit))
    if (instant) void saveEquipment(location, { ...items, [id]: next })
    else setDraftItems({ ...items, [id]: next })
  }
  const num = (s: string) => (s.trim() === '' ? undefined : Number(s))
  const have = availableIds(items)
  const presetName = location === 'home' ? 'an empty home setup (bodyweight and a mat)' : gymType === 'standard' ? 'the standard gym list' : 'a typical commercial gym'

  return (
    <div>
      {saveBar}
      <p className="hint">
        {location === 'home' ? 'Tick only what you own.' : 'Tick what your gym has today.'} The workout generator uses only the ticked items.
        {' '}Bodyweight is an ordinary option: untick it if you do not want bodyweight exercises.
      </p>
      <p className="hint"><strong>Applied now:</strong> {summary}</p>
      {ALL_EQUIPMENT.map((id) => {
        const it = items[id] ?? { id, available: false }
        const checked = id === 'bodyweight' ? have.has('bodyweight') : it.available
        return (
          <div key={id} className="equip">
            <label className="check">
              <input type="checkbox" checked={checked} onChange={(e) => set(id, { available: e.target.checked })} />
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
      <ConfirmButton variant="ghost" confirm={{ title: `Reset the list to ${presetName}?`, message: 'Your own ticks and weights for this list are replaced.', danger: true }} onConfirm={() => applyDefaultEquipment(location, gymType, unit)}>
        Reset list to {presetName}
      </ConfirmButton>
    </div>
  )
}
