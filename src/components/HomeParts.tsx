import { useState } from 'react'
import { saveBodyBasics } from '../db/repo'
import { DURATION_PRESETS, MAX_SESSION_MINUTES, MIN_SESSION_MINUTES } from '../engine/cardio'
import { LEVEL_LABEL, type Profile, type TrainingLevel } from '../engine/types'
import { formHeightCm, formWeightKg, profileFormFrom, validateProfileForm, withWeightFieldUnit, type ProfileForm } from '../engine/validateProfile'
import { LEVEL_HELP } from './ProfileFormView'
import { HeightField } from './HeightField'
import { WeightField } from './WeightField'
import { Button, Card, Dialog } from './ui'

/** 30 / 45 / 60 / 75 / 90 minute chips and a custom box. `onChange(null)` means the box does not hold a valid length yet. */
export function DurationPicker({ value, onChange, presets = DURATION_PRESETS, min = MIN_SESSION_MINUTES, max = MAX_SESSION_MINUTES, label = 'Workout length' }: {
  value: number
  onChange: (minutes: number | null) => void
  presets?: readonly number[]
  min?: number
  max?: number
  label?: string
}) {
  const [custom, setCustom] = useState(!presets.includes(value))
  const [text, setText] = useState(String(value))
  const n = Number(text)
  const bad = custom && (text.trim() === '' || !Number.isInteger(n) || n < min || n > max)
  const message = !custom || !bad ? '' : `Enter a whole number of minutes from ${min} to ${max}.`
  const pick = (m: number) => { setCustom(false); setText(String(m)); onChange(m) }
  return (
    <div>
      <div role="group" aria-label={label} className="chips">
        {presets.map((m) => (
          <button key={m} type="button" className={!custom && value === m ? 'chip on' : 'chip'} aria-pressed={!custom && value === m} onClick={() => pick(m)}>{m} min</button>
        ))}
        <button type="button" className={custom ? 'chip on' : 'chip'} aria-pressed={custom} onClick={() => { setCustom(true); onChange(Number.isInteger(n) && n >= min && n <= max ? n : null) }}>Custom</button>
      </div>
      {custom && (
        <div className="field">
          <label htmlFor="custom-min">Minutes</label>
          <input id="custom-min" inputMode="numeric" value={text} aria-invalid={bad || undefined}
            onChange={(e) => {
              const t = e.target.value.replace(/\D/g, '')
              setText(t)
              const v = Number(t)
              onChange(t !== '' && v >= min && v <= max ? v : null)
            }} />
          {message && <p className="error" role="alert">{message}</p>}
          {bad && text.trim() !== '' && n > 0 && n < min && (
            <Button variant="small" onClick={() => pick(min)}>Use {min} minutes</Button>
          )}
        </div>
      )}
    </div>
  )
}

/** Shown to beginners who have not given height and weight. Nothing is guessed. */
export function BodyBasicsCard({ profile }: { profile: Profile }) {
  const [f, setF] = useState<ProfileForm>(() => profileFormFrom(profile))
  const [errors, setErrors] = useState<Partial<Record<'heightCm' | 'weightValue', string>>>({})
  const [saved, setSaved] = useState(false)
  const update = (fn: (p: ProfileForm) => ProfileForm) => { setF(fn); setSaved(false) }
  const save = async () => {
    const e = validateProfileForm(f)
    const next: typeof errors = {}
    if (f.heightCm.trim() === '') next.heightCm = 'Enter your height.'
    else if (e.heightCm) next.heightCm = e.heightCm
    if (f.weightValue.trim() === '') next.weightValue = 'Enter your body weight.'
    else if (e.weightValue) next.weightValue = e.weightValue
    setErrors(next)
    if (next.heightCm || next.weightValue) return
    await saveBodyBasics(formHeightCm(f), formWeightKg(f))
    setSaved(true)
  }
  return (
    <Card title="One more thing for your beginner plan">
      <p>A beginner plan needs your height and weight. They stay on this phone and are only used for loads and calorie estimates.</p>
      <HeightField form={f} update={update} error={errors.heightCm} />
      <WeightField label="Body weight" value={f.weightValue} unit={f.weightFieldUnit} pageUnit={f.weightUnit} error={errors.weightValue}
        onChange={(v, u) => update((p) => withWeightFieldUnit({ ...p, weightValue: v }, u))} />
      <Button onClick={() => void save()}>Save height and weight</Button>
      {saved && <p className="ok" role="status">Saved.</p>}
    </Card>
  )
}

const LEVELS: TrainingLevel[] = ['beginner', 'intermediate', 'regular']

/** Pick a new training level, and what to do with workouts already planned. Finished history is never changed. */
export function LevelDialog({ current, onApply, onClose }: {
  current: TrainingLevel
  onApply: (level: TrainingLevel, mode: 'update' | 'keep') => Promise<void> | void
  onClose: () => void
}) {
  const [level, setLevel] = useState<TrainingLevel>(current)
  const [mode, setMode] = useState<'update' | 'keep'>('update')
  return (
    <Dialog title="Change training level" onClose={onClose}>
      <div role="radiogroup" aria-label="Training level" className="level-list">
        {LEVELS.map((l) => (
          <label key={l} className={level === l ? 'level on' : 'level'}>
            <input type="radio" name="dlg-level" checked={level === l} onChange={() => setLevel(l)} />
            <span><strong>{LEVEL_LABEL[l]}</strong><br /><span className="hint">{LEVEL_HELP[l]}</span></span>
          </label>
        ))}
      </div>
      {level !== current && (
        <fieldset className="field">
          <legend>Workouts already planned</legend>
          <label className="check"><input type="radio" name="lvl-mode" checked={mode === 'update'} onChange={() => setMode('update')} /><span>Rebuild upcoming workouts for the new level</span></label>
          <label className="check"><input type="radio" name="lvl-mode" checked={mode === 'keep'} onChange={() => setMode('keep')} /><span>Keep upcoming workouts as they are, and use the new level afterwards</span></label>
          <p className="hint">Workouts you already did are never changed.</p>
        </fieldset>
      )}
      <div className="dialog-actions">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button disabled={level === current} onClick={async () => { await onApply(level, mode); onClose() }}>Apply</Button>
      </div>
    </Dialog>
  )
}
