import type { HeightUnit } from '../engine/types'
import { withFtIn, withHeightUnit, type ProfileForm } from '../engine/validateProfile'

/** Height as feet and inches, or centimetres. The saved value is always centimetres, so switching the display never drifts it. */
export function HeightField({ form, update, error }: { form: ProfileForm; update: (fn: (p: ProfileForm) => ProfileForm) => void; error?: string }) {
  const bad = error ? true : undefined
  return (
    <div className="field">
      <label htmlFor="pf-height">Height</label>
      <div className="inline">
        {form.heightUnit === 'cm' ? (
          <input id="pf-height" inputMode="decimal" value={form.heightCm} aria-label="Height in centimetres" aria-invalid={bad}
            onChange={(e) => update((p) => ({ ...p, heightCm: e.target.value }))} />
        ) : (
          <>
            <input id="pf-height" inputMode="numeric" value={form.heightFt} aria-label="Height, feet" aria-invalid={bad}
              onChange={(e) => update((p) => withFtIn(p, e.target.value, p.heightIn))} />
            <span className="muted">ft</span>
            <input inputMode="decimal" value={form.heightIn} aria-label="Height, inches" aria-invalid={bad}
              onChange={(e) => update((p) => withFtIn(p, p.heightFt, e.target.value))} />
            <span className="muted">in</span>
          </>
        )}
        <select aria-label="Height unit" value={form.heightUnit} onChange={(e) => update((p) => withHeightUnit(p, e.target.value as HeightUnit))}>
          <option value="ft-in">ft / in</option>
          <option value="cm">cm</option>
        </select>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  )
}
