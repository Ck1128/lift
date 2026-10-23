import { useEffect, useMemo, useRef, useState } from 'react'
import { useLang } from '../i18n'
import { useLiveQuery } from 'dexie-react-hooks'
import { addFoodEntry, changeFoodPortion, foodCacheStore, foodOnlineEnabled, getFoodEntry, recentFoods } from '../db/foodRepo'
import { uid, nowIso } from '../db/schema'
import {
  basisOf, basisText, calcPortion, choiceTitle, entryFromChoice, manualFood, MEAL_CATEGORIES, MEAL_LABEL, PORTION_LABEL, PREP_LABEL,
  supportedUnits, type FoodChoice, type FoodLogEntry, type MealCategory, type PortionUnit,
} from '../engine/food'
import { searchFoods, type ProviderReport } from '../food/search'
import { openFoodFactsProvider } from '../food/providers'
import { formatDay } from '../engine/dates'
import type { Profile } from '../engine/types'
import { OnlineSearchSwitch } from '../components/OnlineSearchSwitch'
import { Button, Card, ScreenHeader } from '../components/ui'
import { useOnline } from '../hooks/app'
import { queryOf, useRouter } from '../router'
import { clearDraft, loadDraft, saveDraft } from '../hooks/drafts'

const off = openFoodFactsProvider()

function choiceFromEntry(e: FoodLogEntry): FoodChoice {
  const state = { state: e.state, ...e.basis, label: e.stateLabel }
  return {
    state,
    item: { provider: e.provider, providerId: e.providerId, name: e.name, brand: e.brand, states: [state], kind: e.userEntered ? 'user' : 'generic', source: e.source, approximate: e.approximate },
  }
}

const defaultUnit = (units: PortionUnit[]): PortionUnit => (units.includes('g') ? 'g' : units[0])
const defaultValue = (u: PortionUnit) => (u === 'g' || u === 'ml' ? '100' : '1')

function PortionForm({ units, basis, value, unit, onChange }: {
  units: PortionUnit[]; basis: Parameters<typeof calcPortion>[0]; value: string; unit: PortionUnit
  onChange: (value: string, unit: PortionUnit) => void
}) {
  const n = Number(value)
  const r = value.trim() !== '' && Number.isFinite(n) && n > 0 ? calcPortion(basis, n, unit) : null
  return (
    <div>
      <div className="inline">
        <input aria-label="Amount" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value, unit)} />
        <select aria-label="Unit" value={unit} onChange={(e) => onChange(value, e.target.value as PortionUnit)}>
          {units.map((u) => <option key={u} value={u}>{PORTION_LABEL[u]}</option>)}
        </select>
      </div>
      <p className="hint">Per {basisText(basis)}</p>
      {r && r.ok && <p className="big" role="status">{Math.round(r.kcal)} kcal{r.protein !== undefined ? ` · ${r.protein} g protein` : ''}</p>}
      {r && !r.ok && <p className="error" role="alert">{r.reason}</p>}
      {value.trim() !== '' && !(n > 0) && <p className="error" role="alert">Enter an amount greater than zero.</p>}
    </div>
  )
}

export function FoodEntry({ today, editId }: { profile: Profile; today: string; editId?: string }) {
  const lang = useLang()
  const { path, replace, back } = useRouter()
  const q = queryOf(path)
  const online = useOnline()
  const onlineOn = useLiveQuery(() => foodOnlineEnabled(), [], false)
  const recents = useLiveQuery(() => recentFoods(10), [], [] as FoodLogEntry[])
  const existing = useLiveQuery(() => (editId ? getFoodEntry(editId) : undefined), [editId], undefined)

  type Draft = { meal: MealCategory; date: string; query: string; picked: FoodChoice | null; value: string; unit: PortionUnit; note: string; manual: boolean; mName: string; mKcal: string }
  const [draft] = useState(() => (editId ? null : loadDraft<Draft>('food.new')))
  const [meal, setMeal] = useState<MealCategory>(draft?.meal ?? ((q.get('meal') as MealCategory) || 'lunch'))
  const [date, setDate] = useState(draft?.date ?? q.get('date') ?? today)
  const [query, setQuery] = useState(draft?.query ?? '')
  const [results, setResults] = useState<FoodChoice[]>([])
  const [reports, setReports] = useState<ProviderReport[]>([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState<FoodChoice | null>(draft?.picked ?? null)
  const [value, setValue] = useState(draft?.value ?? '100')
  const [unit, setUnit] = useState<PortionUnit>(draft?.unit ?? 'g')
  const [note, setNote] = useState(draft?.note ?? '')
  const [manual, setManual] = useState(draft?.manual ?? false)
  const [mName, setMName] = useState(draft?.mName ?? '')
  const [mKcal, setMKcal] = useState(draft?.mKcal ?? '')
  const [err, setErr] = useState('')
  const seq = useRef(0)

  // Edit mode: fill the form from the saved entry once it has loaded.
  const [loaded, setLoaded] = useState<string | null>(null)
  if (existing && loaded !== existing.id) {
    setLoaded(existing.id)
    setMeal(existing.mealCategory)
    setDate(existing.date)
    setValue(String(existing.portionValue))
    setUnit(existing.portionUnit)
    setNote(existing.note ?? '')
  }

  // Anything typed here is kept as a draft, so Back never loses it. It is cleared when the entry is saved.
  const hasInput = picked !== null || manual || query.trim() !== '' || mName.trim() !== '' || mKcal.trim() !== ''
  useEffect(() => {
    if (editId) return
    if (hasInput) saveDraft('food.new', { meal, date, query, picked, value, unit, note, manual, mName, mKcal })
    else clearDraft('food.new')
  }, [editId, hasInput, meal, date, query, picked, value, unit, note, manual, mName, mKcal])

  useEffect(() => {
    const text = query.trim()
    if (text.length < 2) return
    const mine = ++seq.current
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const out = await searchFoods({ query: text, online: [off], allowNetwork: !!onlineOn, networkOffline: !online, cache: foodCacheStore })
        if (mine === seq.current) { setResults(out.choices); setReports(out.reports) }
      } finally {
        if (mine === seq.current) setSearching(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query, onlineOn, online])

  const shown = query.trim().length < 2 ? [] : results
  const units = useMemo(() => (picked ? supportedUnits(basisOf(picked.state)) : []), [picked])

  const choose = (c: FoodChoice) => {
    const us = supportedUnits(basisOf(c.state))
    const u = defaultUnit(us)
    setPicked(c); setUnit(u); setValue(defaultValue(u)); setErr('')
  }

  const save = async () => {
    const n = Number(value)
    if (!(n > 0) || !Number.isFinite(n)) return setErr('Enter an amount greater than zero.')
    if (editId && existing) {
      const r = await changeFoodPortion(editId, n, unit, meal, note.trim() || undefined)
      if (!r.ok) return setErr(r.error)
      return afterSave()
    }
    if (!picked) return
    const entry = entryFromChoice({ id: uid(), date, meal, choice: picked, value: n, unit, note: note.trim() || undefined, now: nowIso() })
    if ('error' in entry) return setErr(entry.error)
    await addFoodEntry(entry)
    afterSave()
  }
  // The entry is saved, so leaving is not "losing changes".
  const afterSave = () => { clearDraft('food.new'); replace(`/food?date=${date}`) }

  const saveManual = () => {
    const kcal = Number(mKcal)
    if (mName.trim().length < 1) return setErr('Give the food a name.')
    if (!Number.isFinite(kcal) || kcal < 0 || kcal > 5000) return setErr('Calories per serving must be a number from 0 to 5000.')
    setErr('')
    const c: FoodChoice = { item: manualFood(mName.trim(), kcal), state: manualFood(mName.trim(), kcal).states[0] }
    setManual(false); choose(c)
  }

  // ----- edit screen -----
  if (editId) {
    if (existing === undefined) return <p className="muted">Loading...</p>
    if (!existing) return <><ScreenHeader title="Entry not found" /><Button variant="ghost" onClick={back}>Back</Button></>
    return (
      <>
        <ScreenHeader title="Edit food entry" subtitle={`${existing.name} · ${PREP_LABEL[existing.state]}`} />
        <Card>
          {existing.approximate && <p className="hint">This food uses typical values, so calories are approximate.</p>}
          <div className="field">
            <label htmlFor="e-meal">Meal</label>
            <select id="e-meal" value={meal} onChange={(e) => setMeal(e.target.value as MealCategory)}>
              {MEAL_CATEGORIES.map((m) => <option key={m} value={m}>{MEAL_LABEL[m]}</option>)}
            </select>
          </div>
          <PortionForm units={supportedUnits(existing.basis)} basis={existing.basis} value={value} unit={unit} onChange={(v, u) => { setValue(v); setUnit(u); setErr('') }} />
          <div className="field">
            <label htmlFor="e-note">Note (optional)</label>
            <input id="e-note" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} />
          </div>
          <p className="hint">Source: {existing.source}</p>
          {err && <p className="error" role="alert">{err}</p>}
          <Button onClick={() => void save()}>Save changes</Button>
        </Card>
      </>
    )
  }

  // ----- add screen -----
  return (
    <>
      <ScreenHeader title="Add food" subtitle={formatDay(date)} />
      <Card>
        <div className="field">
          <label htmlFor="a-meal">Meal</label>
          <select id="a-meal" value={meal} onChange={(e) => setMeal(e.target.value as MealCategory)}>
            {MEAL_CATEGORIES.map((m) => <option key={m} value={m}>{MEAL_LABEL[m]}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="a-date">Day</label>
          <input id="a-date" type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
      </Card>

      {!picked && !manual && (
        <>
          <Card>
            <OnlineSearchSwitch />
            <div className="field">
              <label htmlFor="a-search">Search foods</label>
              <input id="a-search" type="search" value={query} placeholder="For example: rice, idli, dal, banana" onChange={(e) => setQuery(e.target.value)} />
              <p className="hint">Pick the exact version you ate. Raw and cooked foods have very different calories per gram.</p>
            </div>
            {searching && <p className="muted" role="status">Searching...</p>}
            {reports.filter((r) => r.status !== 'disabled' && (r.status !== 'ok' || r.provider !== 'local')).map((r) => <p key={r.provider} className="hint" role="status">{r.name}: {r.message}</p>)}
            <ul className="history">
              {shown.map((c) => (
                <li key={`${c.item.provider}-${c.item.providerId}-${c.state.state}`}>
                  <button type="button" className="alt" onClick={() => choose(c)}>
                    <strong>{choiceTitle(c)}{c.item.brand ? ` · ${c.item.brand}` : ''}</strong>
                    {lang === 'te' && c.item.nameTe && <span className="muted" lang="te">{c.item.nameTe}</span>}
                    <span className="muted">{Math.round(c.state.kcalPer100)} kcal per {c.state.basis === 'serving' ? 'serving' : `100 ${c.state.basis}`} · {PREP_LABEL[c.state.state]}{c.item.approximate ? ' · approx.' : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
            {query.trim().length >= 2 && !searching && shown.length === 0 && <p className="muted">No match. You can add it yourself below.</p>}
            {onlineOn && shown.some((c) => c.item.provider === 'openfoodfacts') && <p className="hint">{off.attribution}</p>}
            <Button variant="ghost" onClick={() => setManual(true)}>Add my own food</Button>
          </Card>

          {recents.length > 0 && (
            <Card title="Recent foods">
              <ul className="history">
                {recents.map((e) => (
                  <li key={e.id}>
                    <button type="button" className="alt" onClick={() => choose(choiceFromEntry(e))}>
                      <strong>{e.name} ({PREP_LABEL[e.state].split(' ')[0].toLowerCase()})</strong>
                      <span className="muted">Last time: {e.portionValue} {PORTION_LABEL[e.portionUnit]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {manual && (
        <Card title="Your own food">
          <p className="hint">Calories per serving, as written on the label or worked out yourself. It is saved as entered by you.</p>
          <div className="field"><label htmlFor="m-name">Name</label><input id="m-name" value={mName} maxLength={80} onChange={(e) => setMName(e.target.value)} /></div>
          <div className="field"><label htmlFor="m-kcal">Calories per serving</label><input id="m-kcal" inputMode="decimal" value={mKcal} onChange={(e) => setMKcal(e.target.value)} /></div>
          {err && <p className="error" role="alert">{err}</p>}
          <Button onClick={saveManual}>Continue</Button>
          <Button variant="ghost" onClick={() => { setManual(false); setErr('') }}>Cancel</Button>
        </Card>
      )}

      {picked && (
        <Card title={choiceTitle(picked)}>
          {picked.item.approximate && <p className="hint">Typical values, so the calories are approximate.</p>}
          <PortionForm units={units} basis={basisOf(picked.state)} value={value} unit={unit} onChange={(v, u) => { setValue(v); setUnit(u); setErr('') }} />
          <div className="field">
            <label htmlFor="p-note">Note (optional)</label>
            <input id="p-note" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} />
          </div>
          <p className="hint">Source: {picked.item.source}</p>
          {err && <p className="error" role="alert">{err}</p>}
          <Button onClick={() => void save()}>Add to {MEAL_LABEL[meal].toLowerCase()}</Button>
          <Button variant="ghost" onClick={() => { setPicked(null); setErr('') }}>Choose a different food</Button>
        </Card>
      )}
    </>
  )
}
