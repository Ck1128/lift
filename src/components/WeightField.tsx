import { useId } from 'react'
import type { WeightUnit } from '../engine/types'
import { convertWeight, tidy1 } from '../engine/units'

/** Converts a typed weight to another unit, keeping blank or invalid text as it is. */
export function convertText(value: string, from: WeightUnit, to: WeightUnit): string {
  if (from === to || value.trim() === '') return value
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  return String(tidy1(convertWeight(n, from, to)))
}

/**
 * A weight input with its own kg / lb selector right beside it.
 * Changing the selector converts the number, so the physical weight stays the same.
 */
export function WeightField({
  label, value, unit, onChange, hint, error, pageUnit, placeholder, id: idProp, compact,
}: {
  label: string
  value: string
  unit: WeightUnit
  onChange: (value: string, unit: WeightUnit) => void
  hint?: string
  error?: string
  /** The page default. When the field's unit differs, a small note says it is an override. */
  pageUnit?: WeightUnit
  placeholder?: string
  id?: string
  compact?: boolean
}) {
  const auto = useId()
  const id = idProp ?? auto
  const eid = `${id}-e`
  const hid = `${id}-h`
  const described = [hint ? hid : '', error ? eid : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className={compact ? 'weight-field compact' : 'field weight-field'}>
      <label htmlFor={id}>{label}</label>
      <div className="inline">
        <input id={id} inputMode="decimal" value={value} placeholder={placeholder} aria-describedby={described} aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value, unit)} />
        <select aria-label={`${label} unit`} value={unit} onChange={(e) => { const u = e.target.value as WeightUnit; onChange(convertText(value, unit, u), u) }}>
          <option value="lb">lb</option>
          <option value="kg">kg</option>
        </select>
      </div>
      {pageUnit && pageUnit !== unit && <p className="hint">This field uses {unit}; the page default is {pageUnit}.</p>}
      {hint && <p id={hid} className="hint">{hint}</p>}
      {error && <p id={eid} className="error" role="alert">{error}</p>}
    </div>
  )
}
