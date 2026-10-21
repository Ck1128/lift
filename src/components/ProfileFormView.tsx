import { useState } from 'react'
import { WEEKDAY_LABELS } from '../engine/dates'
import { GOAL_LABEL, type Goal, type Experience, type GymType, type LocationType } from '../engine/types'
import { validateProfileForm, type FormErrors, type ProfileForm } from '../engine/validateProfile'
import { Button, Chips, Field } from './ui'

export interface ProfileExtra { preferredLocation: LocationType; gymType: GymType }

export function ProfileFormView({
  initial, initialExtra, showLocation, submitLabel, onSubmit,
}: {
  initial: ProfileForm
  initialExtra: ProfileExtra
  showLocation: boolean
  submitLabel: string
  onSubmit: (form: ProfileForm, extra: ProfileExtra) => Promise<void> | void
}) {
  const [f, setF] = useState<ProfileForm>(initial)
  const [extra, setExtra] = useState<ProfileExtra>(initialExtra)
  const [errors, setErrors] = useState<FormErrors>({})
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) => { setF((p) => ({ ...p, [k]: v })); setSaved(false) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validateProfileForm(f)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setBusy(true)
    try {
      await onSubmit(f, extra)
      setSaved(true)
    } finally {
      setBusy(false)
    }
  }

  const toggleDay = (d: number) =>
    set('trainingDays', f.trainingDays.includes(d) ? f.trainingDays.filter((x) => x !== d) : [...f.trainingDays, d])

  return (
    <form onSubmit={submit} noValidate>
      <Field label="Nickname (optional)" hint="Only used to greet you. You do not need your real name." error={errors.displayName}>
        {(id, d) => <input id={id} aria-describedby={d} value={f.displayName} maxLength={40} onChange={(e) => set('displayName', e.target.value)} />}
      </Field>

      <Field label="Main goal" hint="This sets rep ranges and rest times. It does not promise any particular result.">
        {(id) => (
          <select id={id} value={f.goal} onChange={(e) => set('goal', e.target.value as Goal)}>
            {(Object.keys(GOAL_LABEL) as Goal[]).map((g) => <option key={g} value={g}>{GOAL_LABEL[g]}</option>)}
          </select>
        )}
      </Field>

      <Field label="Training experience" hint="Beginners get simpler exercises and fewer sets.">
        {(id) => (
          <select id={id} value={f.experienceLevel} onChange={(e) => set('experienceLevel', e.target.value as Experience)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        )}
      </Field>

      <fieldset className="field">
        <legend>Training days</legend>
        <div role="group" aria-label="Training days" className="chips">
          {WEEKDAY_LABELS.map((l, d) => (
            <button key={l} type="button" className={f.trainingDays.includes(d) ? 'chip on' : 'chip'} aria-pressed={f.trainingDays.includes(d)} onClick={() => toggleDay(d)}>{l}</button>
          ))}
        </div>
        <p className="hint">Pick 1 to 6 days. Other days are rest days. Fewer days means more full-body sessions.</p>
        {errors.trainingDays && <p className="error" role="alert">{errors.trainingDays}</p>}
      </fieldset>

      <Field label="Usual workout length (minutes)" hint="You can change it each day." error={errors.preferredDurationMinutes}>
        {(id, d) => <input id={id} aria-describedby={d} inputMode="numeric" value={f.preferredDurationMinutes} onChange={(e) => set('preferredDurationMinutes', e.target.value)} />}
      </Field>

      {showLocation && (
        <>
          <Field label="Where do you train?" hint="You can switch any time in Settings.">
            {(id) => (
              <select id={id} value={extra.preferredLocation} onChange={(e) => setExtra({ ...extra, preferredLocation: e.target.value as LocationType })}>
                <option value="gym">Gym</option>
                <option value="home">Home</option>
              </select>
            )}
          </Field>
          {extra.preferredLocation === 'gym' && (
            <Field label="Which gym?" hint="A starting equipment list. You will confirm it next.">
              {(id) => (
                <select id={id} value={extra.gymType} onChange={(e) => setExtra({ ...extra, gymType: e.target.value as GymType })}>
                  <option value="planet_fitness">Planet Fitness</option>
                  <option value="generic">Another gym</option>
                </select>
              )}
            </Field>
          )}
        </>
      )}

      <details className="optional">
        <summary>Optional details</summary>
        <p className="hint">These are never required. Weight is only used for the rough calorie estimate. Everything stays on this phone.</p>
        <Field label="Age" error={errors.age}>
          {(id, d) => <input id={id} aria-describedby={d} inputMode="numeric" value={f.age} onChange={(e) => set('age', e.target.value)} />}
        </Field>
        <Field label="Body weight" error={errors.weightValue}>
          {(id, d) => (
            <div className="inline">
              <input id={id} aria-describedby={d} inputMode="decimal" value={f.weightValue} onChange={(e) => set('weightValue', e.target.value)} />
              <span className="muted">{f.weightUnit}</span>
            </div>
          )}
        </Field>
        <Field label="Height" error={errors.heightValue}>
          {(id, d) => (
            <div className="inline">
              <input id={id} aria-describedby={d} inputMode="decimal" value={f.heightValue} onChange={(e) => set('heightValue', e.target.value)} />
              <Chips label="Height unit" options={['in', 'cm'] as const} value={f.heightUnit} onChange={(v) => set('heightUnit', v)} />
            </div>
          )}
        </Field>
      </details>

      <div className="field">
        <p className="label-like">Weight units</p>
        <Chips label="Weight units" options={['lb', 'kg'] as const} value={f.weightUnit} onChange={(v) => set('weightUnit', v)} />
        <p className="hint">Used for the weights you lift and your body weight.</p>
      </div>
      <Button type="submit" disabled={busy}>{busy ? 'Saving...' : submitLabel}</Button>
      {saved && <p className="ok" role="status">Saved.</p>}
    </form>
  )
}
