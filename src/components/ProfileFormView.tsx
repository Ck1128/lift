import { useState } from 'react'
import { WEEKDAY_LABELS } from '../engine/dates'
import {
  ALL_TRACKS, GOAL_LABEL, LEVEL_LABEL, TRACK_LABEL, type Goal, type GymType, type LocationType, type Sex, type Track, type TrainingLevel, type WeightUnit,
} from '../engine/types'
import {
  validateProfileForm, withWeightFieldUnit, type FormErrors, type ProfileForm,
} from '../engine/validateProfile'
import { LEVEL_PARAMS } from '../engine/levels'
import { useUnsavedGuard } from '../router'
import { Button, Chips, Field } from './ui'
import { WeightField } from './WeightField'
import { HeightField } from './HeightField'

export interface ProfileExtra { preferredLocation: LocationType; gymType: GymType }

export const LEVEL_HELP: Record<TrainingLevel, string> = {
  beginner: 'New to lifting or coming back. Simpler exercises, fewer sets, longer rests and short form cues. Height and weight are needed so loads and calories make sense.',
  intermediate: 'You train most weeks and know the main lifts. A balanced mix of exercises, sets and rest.',
  regular: 'You are a regular gym-goer. More variety and volume, and harder exercises where your equipment allows.',
}

const LEVELS: TrainingLevel[] = ['beginner', 'intermediate', 'regular']

export function ProfileFormView({
  initial, initialExtra, showLocation, submitLabel, onSubmit, onLevelChange, stepped, onStepChange,
}: {
  initial: ProfileForm
  initialExtra: ProfileExtra
  showLocation: boolean
  submitLabel: string
  onSubmit: (form: ProfileForm, extra: ProfileExtra, opts?: { levelChange?: 'update' | 'keep' }) => Promise<void> | void
  /** Called when the level is about to change on a saved profile, so the page can ask what to do with upcoming workouts. */
  onLevelChange?: (from: TrainingLevel, to: TrainingLevel, proceed: (mode: 'update' | 'keep') => void) => void
  /** First-run mode: one topic per screen with Back and Next. Settings keeps the single page. */
  stepped?: boolean
  onStepChange?: (index: number) => void
}) {
  const [f, setF] = useState<ProfileForm>(initial)
  const [extra, setExtra] = useState<ProfileExtra>(initialExtra)
  const [errors, setErrors] = useState<FormErrors>({})
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [stepNo, setStepNo] = useState(0)
  useUnsavedGuard(dirty)
  const workoutOn = f.tracks.includes('workout')
  const beginner = workoutOn && f.trainingLevel === 'beginner'
  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) => { setF((p) => ({ ...p, [k]: v })); setSaved(false); setDirty(true) }
  const update = (fn: (p: ProfileForm) => ProfileForm) => { setF(fn); setSaved(false); setDirty(true) }

  const doSubmit = async (levelChange?: 'update' | 'keep') => {
    setBusy(true)
    try {
      await onSubmit(f, extra, { levelChange })
      setSaved(true)
      setDirty(false)
    } finally {
      setBusy(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validateProfileForm(f)
    // A beginner needs both measurements.
    if (beginner) {
      if (f.heightCm.trim() === '') errs.heightCm = 'Beginner plans need your height. It stays on this phone.'
      if (f.weightValue.trim() === '') errs.weightValue = 'Beginner plans need your body weight. It stays on this phone.'
    }
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      if (stepped) {
        const at = steps.findIndex((st) => st.fields.some((k) => errs[k as keyof FormErrors]))
        if (at >= 0) goStep(at)
      }
      return
    }
    if (workoutOn && onLevelChange && initial.trainingLevel !== f.trainingLevel) {
      onLevelChange(initial.trainingLevel, f.trainingLevel, (mode) => void doSubmit(mode))
      return
    }
    await doSubmit()
  }

  const toggleTrack = (t: Track) =>
    update((p) => ({ ...p, tracks: p.tracks.includes(t) ? p.tracks.filter((x) => x !== t) : ALL_TRACKS.filter((x) => x === t || p.tracks.includes(x)) }))

  const toggleDay = (d: number) =>
    set('trainingDays', f.trainingDays.includes(d) ? f.trainingDays.filter((x) => x !== d) : [...f.trainingDays, d])

  const setPageUnit = (u: WeightUnit) =>
    update((p) => {
      // The body weight field follows the page unit unless it was given its own unit.
      const follows = p.weightFieldUnit === p.weightUnit
      const next = { ...p, weightUnit: u }
      return follows ? withWeightFieldUnit(next, u) : next
    })

  // Sections of the form. Settings shows them in one page; first run shows them as steps.
  const secTracks = (
    <>
      <fieldset className="field">
        <legend>What do you want to use Lift for?</legend>
        <div role="group" aria-label="Activities" className="chips">
          {ALL_TRACKS.map((t) => (
            <button key={t} type="button" className={f.tracks.includes(t) ? 'chip on' : 'chip'} aria-pressed={f.tracks.includes(t)} onClick={() => toggleTrack(t)}>{TRACK_LABEL[t]}</button>
          ))}
        </div>
        <p className="hint">Pick Workout, Yoga, or both. You can change this later. Turning one off only hides it: your history is kept.</p>
        {errors.tracks && <p className="error" role="alert">{errors.tracks}</p>}
      </fieldset>

      <Field label="Nickname (optional)" hint="Only used to greet you. You do not need your real name." error={errors.displayName}>
        {(id, d) => <input id={id} aria-describedby={d} value={f.displayName} maxLength={40} onChange={(e) => set('displayName', e.target.value)} />}
      </Field>
    </>
  )
  const secLevel = (
    <>
      <Field label="Main goal" hint="This sets rep ranges and rest times. It does not promise any particular result.">
        {(id) => (
          <select id={id} value={f.goal} onChange={(e) => set('goal', e.target.value as Goal)}>
            {(Object.keys(GOAL_LABEL) as Goal[]).map((g) => <option key={g} value={g}>{GOAL_LABEL[g]}</option>)}
          </select>
        )}
      </Field>

      <fieldset className="field">
        <legend>Training level</legend>
        <div role="radiogroup" aria-label="Training level" className="level-list">
          {LEVELS.map((l) => (
            <label key={l} className={f.trainingLevel === l ? 'level on' : 'level'}>
              <input type="radio" name="training-level" value={l} checked={f.trainingLevel === l} onChange={() => set('trainingLevel', l)} />
              <span><strong>{LEVEL_LABEL[l]}</strong><br /><span className="hint">{LEVEL_HELP[l]}</span></span>
            </label>
          ))}
        </div>
        <p className="hint">Up to {LEVEL_PARAMS[f.trainingLevel].maxExercises} exercises per workout at this level. You can change it any time.</p>
      </fieldset>
    </>
  )
  const secBody = (
    <>
      <div className={beginner ? 'required-block' : ''}>
        <p className="label-like">{beginner ? 'Your height and weight (needed for beginners)' : 'Height and weight (optional)'}</p>
        <HeightField form={f} update={update} error={errors.heightCm} />
        <WeightField
          label="Body weight"
          value={f.weightValue}
          unit={f.weightFieldUnit}
          pageUnit={f.weightUnit}
          error={errors.weightValue}
          onChange={(v, u) => update((p) => ({ ...p, weightValue: v, weightFieldUnit: u }))}
        />
      </div>

      <div className="field">
        <p className="label-like">Weight units for this page</p>
        <Chips label="Weight units" options={['lb', 'kg'] as const} value={f.weightUnit} onChange={setPageUnit} />
        <p className="hint">The default for the weights you lift and your body weight. Each weight box can use its own unit too.</p>
      </div>
    </>
  )
  const secWeek = (
    <>
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
    </>
  )
  const secWhere = showLocation ? (
    <>
      <Field label="Where do you train?" hint="You can switch any time in Settings.">
        {(id) => (
          <select id={id} value={extra.preferredLocation} onChange={(e) => { setExtra({ ...extra, preferredLocation: e.target.value as LocationType }); setDirty(true) }}>
            <option value="gym">Gym</option>
            <option value="home">Home</option>
          </select>
        )}
      </Field>
      {extra.preferredLocation === 'gym' && (
        <Field label="Which gym?" hint="Planet Fitness gets a maintained equipment list. You can exclude anything your club does not have.">
          {(id) => (
            <select id={id} value={extra.gymType} onChange={(e) => { setExtra({ ...extra, gymType: e.target.value as GymType }); setDirty(true) }}>
              <option value="planet_fitness">Planet Fitness</option>
              <option value="generic">Another gym</option>
            </select>
          )}
        </Field>
      )}
    </>
  ) : null
  const secOptional = (
    <details className="optional">
      <summary>Optional details</summary>
      <p className="hint">These are never required. Age and sex are only used for a rough energy estimate. Everything stays on this phone.</p>
      <Field label="Age" error={errors.age}>
        {(id, d) => <input id={id} aria-describedby={d} inputMode="numeric" value={f.age} onChange={(e) => set('age', e.target.value)} />}
      </Field>
      <Field label="Sex (optional)" hint="Used only in the daily energy estimate on the Food tab. Leave blank to skip it.">
        {(id) => (
          <select id={id} value={f.sex} onChange={(e) => set('sex', e.target.value as '' | Sex)}>
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        )}
      </Field>
      <label className="check">
        <input type="checkbox" checked={f.nutritionGuidance} onChange={(e) => set('nutritionGuidance', e.target.checked)} />
        <span>Show gentle next-day food guidance (optional)</span>
      </label>
    </details>
  )

  type Step = { title: string; why: string; body: React.ReactNode; fields: string[] }
  const steps: Step[] = [
    { title: 'Let\'s set you up', why: 'A few quick questions so the app fits you.', body: secTracks, fields: ['tracks', 'displayName'] },
    ...(workoutOn ? [{ title: 'Your training', why: 'This decides how many exercises, sets and rest you get.', body: secLevel, fields: [] as string[] }] : []),
    { title: 'About you', why: 'Used to pick starting weights and rough calorie numbers.', body: <>{secBody}{secOptional}</>, fields: ['heightCm', 'weightValue', 'age'] },
    ...(workoutOn ? [{ title: 'Your week', why: 'Pick the days you can train. The rest are recovery days.', body: secWeek, fields: ['trainingDays', 'preferredDurationMinutes'] }] : []),
    ...(workoutOn && showLocation ? [{ title: 'Where you train', why: 'This sets the equipment your workouts can use.', body: secWhere, fields: [] as string[] }] : []),
  ]
  const cur = Math.min(stepNo, steps.length - 1)
  const lastStep = cur === steps.length - 1
  const goStep = (i: number) => {
    // Going forward from the first step needs a choice of Workout, Yoga or both.
    if (i > cur && steps[cur].fields.includes('tracks')) {
      const err = validateProfileForm(f).tracks
      if (err) { setErrors((p) => ({ ...p, tracks: err })); return }
    }
    setStepNo(i); onStepChange?.(i); window.scrollTo?.(0, 0)
  }

  const submitRow = (
    <>
      <Button type="submit" disabled={busy} className={stepped && !lastStep ? 'step-off' : ''}>{busy ? 'Saving...' : submitLabel}</Button>
      {saved && <p className="ok" role="status">Saved.</p>}
    </>
  )

  if (!stepped) {
    return (
      <form onSubmit={submit} noValidate>
        {secTracks}
        {workoutOn && secLevel}
        {secBody}
        {workoutOn && <>{secWeek}{secWhere}</>}
        {secOptional}
        {submitRow}
      </form>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="stepped">
      <div className="step-progress" role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={cur + 1}>
        {steps.map((st, i) => <span key={st.title} className={i <= cur ? 'dot on' : 'dot'} />)}
      </div>
      {steps.map((st, i) => (
        <div key={st.title} className={i === cur ? 'step' : 'step step-off'}>
          <h2 className="step-title">{st.title}</h2>
          <p className="step-why">{st.why}</p>
          {st.body}
        </div>
      ))}
      <div className="step-nav">
        {cur > 0 && <Button variant="ghost" onClick={() => goStep(cur - 1)}>Back</Button>}
        {!lastStep && <Button onClick={() => goStep(cur + 1)}>Next</Button>}
        {submitRow}
      </div>
    </form>
  )
}
