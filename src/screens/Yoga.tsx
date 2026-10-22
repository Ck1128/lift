import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { DEFAULT_YOGA_PREFS, getYogaPrefs, planYoga, saveYogaPrefs, startYogaSession, type YogaPrefs } from '../db/yogaRepo'
import { setYogaLevel } from '../db/repo'
import {
  ALL_PROPS, INTENT_LABEL, LOCATION_LABEL, PROP_LABEL, RESTRICTION_LABEL, STYLES, styleById, type PropId, type Restriction, type YogaIntent, type YogaLocation, type YogaStyleId,
} from '../data/yoga'
import {
  itemTotalSeconds, MAX_YOGA_MINUTES, MIN_YOGA_MINUTES, suggestedProps, YOGA_DURATION_PRESETS, yogaCalories, type YogaPlan, type YogaSession,
} from '../engine/yoga'
import { formatDay } from '../engine/dates'
import { FINE_LABEL } from '../engine/muscleMap'
import { LEVEL_LABEL, type Profile, type TrainingLevel } from '../engine/types'
import { LEVEL_HELP } from '../components/ProfileFormView'
import { DurationPicker } from '../components/HomeParts'
import { Button, Card, ScreenHeader } from '../components/ui'
import { useRouter } from '../router'

const LEVELS: TrainingLevel[] = ['beginner', 'intermediate', 'regular']
const YOGA_LEVEL_HELP: Record<TrainingLevel, string> = {
  beginner: 'New to yoga. Simpler poses, shorter holds, and a rest option.',
  intermediate: 'You have practised for a while and know the basic poses.',
  regular: 'You practise regularly. Longer holds and more demanding poses.',
}

export const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`

export function PlanView({ plan, weightKg }: { plan: YogaPlan; weightKg?: number }) {
  const kcal = yogaCalories(plan.style, plan.estimatedSeconds, weightKg)
  return (
    <>
      <Card title={`${plan.styleName} · about ${Math.round(plan.estimatedSeconds / 60)} min`}>
        {plan.cautions.map((c, i) => <p key={i} className="notice" role="note">{c}</p>)}
        {plan.notes.map((n, i) => <p key={i} className="hint">{n}</p>)}
        {plan.substitutions.map((n, i) => <p key={i} className="hint">Swapped: {n}</p>)}
        {kcal && <p className="hint">Roughly {kcal.low} to {kcal.high} calories (an estimate from published activity values, not a measurement).</p>}
      </Card>
      {plan.items.map((it) => (
        <Card key={it.index}>
          <p className="muted">{it.phase}{it.optional ? ' · optional' : ''}</p>
          <p className="big">{it.index + 1}. {it.name}{it.sanskrit ? <span className="muted"> ({it.sanskrit})</span> : null}</p>
          <p className="muted">{it.perSide ? `${it.seconds}s each side` : `${mmss(it.seconds)}`} · {mmss(itemTotalSeconds(it))} total{it.props.length ? ` · uses ${it.props.map((p) => PROP_LABEL[p]).join(', ')}` : ''}</p>
        </Card>
      ))}
    </>
  )
}

export function Yoga({ profile, today }: { profile: Profile; today: string }) {
  const { navigate } = useRouter()
  const saved = useLiveQuery(() => getYogaPrefs(), [], undefined)
  const [prefs, setPrefs] = useState<YogaPrefs>(DEFAULT_YOGA_PREFS)
  const [minutes, setMinutes] = useState<number | null>(DEFAULT_YOGA_PREFS.minutes)
  const [loaded, setLoaded] = useState(false)
  const [plan, setPlan] = useState<YogaPlan | null>(null)
  const [error, setError] = useState('')
  const history = useLiveQuery(() => db.yogaSessions.toArray(), [], [] as YogaSession[])
  const level = profile.yogaLevel

  // Take the saved choices once they have loaded.
  if (saved && !loaded) { setLoaded(true); setPrefs(saved); setMinutes(saved.minutes) }

  const style = styleById(prefs.style)
  const update = (patch: Partial<YogaPrefs>) => { setPrefs((p) => ({ ...p, ...patch })); setPlan(null) }
  const [intent, setIntent] = useState<YogaIntent | 'all'>('all')
  // Keep the chosen style in the list even when it does not match the filter, so the select never shows a blank.
  const shownStyles = STYLES.filter((x) => intent === 'all' || x.intents.includes(intent) || x.id === prefs.style)
  const toggle = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const sorted = useMemo(() => [...history].filter((s) => s.status !== 'in_progress' || true).sort((a, b) => b.startedAt.localeCompare(a.startedAt)), [history])

  const build = async () => {
    setError('')
    if (!level) return setError('Choose your yoga level first.')
    if (minutes === null) return setError(`Choose a length from ${MIN_YOGA_MINUTES} to ${MAX_YOGA_MINUTES} minutes.`)
    const next = { ...prefs, minutes }
    await saveYogaPrefs(next)
    const r = await planYoga({ date: today, style: next.style, level, minutes, location: next.location, props: next.props, restrictions: next.restrictions, focus: next.focus })
    if (r.kind === 'error') { setPlan(null); setError(r.message) } else setPlan(r.plan)
  }
  const begin = async () => {
    if (!plan) return
    const s = await startYogaSession(plan)
    navigate(`/yoga/session/${s.id}`)
  }

  if (saved === undefined) return <p className="muted">Loading...</p>

  return (
    <>
      <ScreenHeader title="Yoga" subtitle="A guided session for any level" />

      {!level ? (
        <Card title="What is your yoga level?">
          <p className="hint">This is separate from your lifting level. You can change it any time in Settings.</p>
          <div role="radiogroup" aria-label="Yoga level" className="level-list">
            {LEVELS.map((l) => (
              <label key={l} className="level">
                <input type="radio" name="yoga-level" onChange={() => void setYogaLevel(l)} />
                <span><strong>{LEVEL_LABEL[l]}</strong><br /><span className="hint">{YOGA_LEVEL_HELP[l]}</span></span>
              </label>
            ))}
          </div>
          <p className="hint">{LEVEL_HELP.beginner.split('.')[0]}.</p>
        </Card>
      ) : (
        <>
          {prefs.focus && prefs.focus.length > 0 && (
            <Card className="focus-note">
              <p className="eyebrow">Paired with your training</p>
              <p>Poses that stretch your {prefs.focus.map((m) => FINE_LABEL[m].toLowerCase()).join(', ')} come first.</p>
              <Button variant="small" onClick={() => update({ focus: undefined })}>Clear focus</Button>
            </Card>
          )}
          <Card title="Style">
            <p className="label-like">What are you after?</p>
            <div className="chips" role="group" aria-label="Filter styles by intent">
              <button type="button" className={intent === 'all' ? 'chip on' : 'chip'} aria-pressed={intent === 'all'} onClick={() => setIntent('all')}>All</button>
              {(Object.keys(INTENT_LABEL) as YogaIntent[]).map((i) => (
                <button key={i} type="button" className={intent === i ? 'chip on' : 'chip'} aria-pressed={intent === i} onClick={() => setIntent(i)}>{INTENT_LABEL[i]}</button>
              ))}
            </div>
            <div className="field">
              <label htmlFor="y-style">Yoga style</label>
              <select id="y-style" value={prefs.style} onChange={(e) => update({ style: e.target.value as YogaStyleId })}>
                {shownStyles.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {shownStyles.length === 0 && <p className="hint">No style matches that. Choose another.</p>}
            </div>
            {style && (
              <>
                <p>{style.description}</p>
                <p className="hint">Pace: {style.pace}. Works best for {style.recommendedMinutes[0]} to {style.recommendedMinutes[1]} minutes.</p>
                {style.caution && <p className="notice">{style.caution}</p>}
              </>
            )}
          </Card>

          <Card title="How long?">
            <DurationPicker value={minutes ?? prefs.minutes} onChange={(m) => { setMinutes(m); setPlan(null) }} presets={YOGA_DURATION_PRESETS} min={MIN_YOGA_MINUTES} max={MAX_YOGA_MINUTES} label="Yoga length" />
          </Card>

          <Card title="Where are you?">
            <div role="group" aria-label="Yoga location" className="chips">
              {(['home', 'gym', 'other'] as YogaLocation[]).map((l) => (
                <button key={l} type="button" className={prefs.location === l ? 'chip on' : 'chip'} aria-pressed={prefs.location === l}
                  onClick={() => update({ location: l, props: suggestedProps(l) })}>{LOCATION_LABEL[l]}</button>
              ))}
            </div>
            <p className="label-like">Props you have</p>
            <p className="hint">Tick what is within reach. Poses that need something you do not have are swapped for ones that do not.</p>
            <div className="chips" role="group" aria-label="Props">
              <button type="button" className={prefs.props.length === 0 ? 'chip on' : 'chip'} aria-pressed={prefs.props.length === 0} onClick={() => update({ props: [] })}>No props</button>
              {ALL_PROPS.map((p: PropId) => (
                <button key={p} type="button" className={prefs.props.includes(p) ? 'chip on' : 'chip'} aria-pressed={prefs.props.includes(p)} onClick={() => update({ props: toggle(prefs.props, p) })}>{PROP_LABEL[p]}</button>
              ))}
            </div>
          </Card>

          <Card title="Anything to avoid? (optional)">
            <p className="hint">Poses with these features are left out. This is not medical advice. Check with a health professional about injuries or pregnancy.</p>
            {(Object.keys(RESTRICTION_LABEL) as Restriction[]).map((r) => (
              <label key={r} className="check">
                <input type="checkbox" checked={prefs.restrictions.includes(r)} onChange={() => update({ restrictions: toggle(prefs.restrictions, r) })} />
                <span>{RESTRICTION_LABEL[r]}</span>
              </label>
            ))}
          </Card>

          {error && <p className="error" role="alert">{error}</p>}
          <Button onClick={() => void build()}>{plan ? 'Rebuild the plan' : 'Show my yoga plan'}</Button>
          {plan && (
            <>
              <PlanView plan={plan} weightKg={profile.weightKg} />
              <Button onClick={() => void begin()}>Start this session</Button>
            </>
          )}
        </>
      )}

      <Card title="Your yoga history">
        {sorted.length === 0 ? <p className="muted">No yoga sessions yet.</p> : (
          <ul className="history">
            {sorted.map((s) => (
              <li key={s.id}>
                <button type="button" className="alt" onClick={() => navigate(`/yoga/session/${s.id}`)}>
                  <strong>{s.styleName}</strong>
                  <span className="muted">{formatDay(s.date)} · {s.status === 'completed' ? 'Completed' : s.status === 'partial' ? 'Partly done' : s.status === 'in_progress' ? 'In progress' : 'Discarded'} · {Math.round(s.durationSeconds / 60)} min done</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
