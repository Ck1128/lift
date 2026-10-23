import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { deleteFoodEntry, duplicateFoodEntry, foodOnDate } from '../db/foodRepo'
import { addDays, formatDay } from '../engine/dates'
import { MEAL_CATEGORIES, MEAL_LABEL, PORTION_LABEL, PREP_SHORT, summarizeDay, type FoodLogEntry, type MealCategory } from '../engine/food'
import { energyEstimate, nextDayGuidance } from '../engine/guidance'
import type { Profile } from '../engine/types'
import { OnlineSearchSwitch } from '../components/OnlineSearchSwitch'
import { Button, Card, ConfirmDialog, Dialog, EmptyState, ScreenHeader } from '../components/ui'
import { queryOf, useRouter } from '../router'

const INTRO_KEY = 'food.intro'

export function Food({ profile, today }: { profile: Profile; today: string }) {
  const { navigate, path } = useRouter()
  const date = queryOf(path).get('date') ?? today
  const entries = useLiveQuery(() => foodOnDate(date), [date], [] as FoodLogEntry[])
  const prev = useLiveQuery(() => foodOnDate(addDays(date, -1)), [date], [] as FoodLogEntry[])
  const sessions = useLiveQuery(() => db.sessions.where('date').equals(addDays(date, -1)).toArray(), [date], [])
  const started = useLiveQuery(async () => (await db.settings.get(INTRO_KEY))?.value === true, [], undefined)
  const [del, setDel] = useState<FoodLogEntry | null>(null)
  const [copy, setCopy] = useState<FoodLogEntry | null>(null)
  const [copyDate, setCopyDate] = useState(date)
  const [copyMeal, setCopyMeal] = useState<MealCategory>('lunch')

  const goDate = (d: string) => navigate(`/food?date=${d}`)
  const summary = summarizeDay(entries)
  const energy = energyEstimate({ weightKg: profile.weightKg, heightCm: profile.heightCm, age: profile.age, sex: profile.sex })
  const guidance = profile.nutritionGuidance
    ? nextDayGuidance({
        date: addDays(date, -1), entries: prev, trained: sessions.some((s) => s.status === 'completed' || s.status === 'partial'),
        weightKg: profile.weightKg, heightCm: profile.heightCm, age: profile.age, sex: profile.sex,
      })
    : null

  if (started === undefined) return <p className="muted">Loading...</p>
  if (!started && entries.length === 0) {
    return (
      <>
        <ScreenHeader title="Food" subtitle="Log what you eat, privately" />
        <EmptyState title="Nothing logged yet" hint="Add what you eat and drink to see rough daily totals. It stays on this phone, and calories are estimates from the portions you enter.">
          <Button onClick={() => void db.settings.put({ key: INTRO_KEY, value: true })}>Start logging</Button>
        </EmptyState>
      </>
    )
  }

  return (
    <>
      <ScreenHeader title="Food" subtitle={formatDay(date)} />
      <div className="row">
        <Button variant="small" onClick={() => goDate(addDays(date, -1))} aria-label="Previous day">‹ Prev</Button>
        <input type="date" aria-label="Choose a date" value={date} max={today} onChange={(e) => e.target.value && goDate(e.target.value)} className="date-input" />
        <Button variant="small" onClick={() => goDate(addDays(date, 1))} disabled={date >= today} aria-label="Next day">Next ›</Button>
      </div>

      <Card className="switch-card"><OnlineSearchSwitch /></Card>

      <Card title="Daily summary">
        {summary.count === 0 ? (
          <p className="muted">Nothing logged for this day. That is different from zero calories: it just means no entries.</p>
        ) : (
          <>
            <p className="big">{Math.round(summary.kcal)} kcal <span className="muted">logged</span></p>
            <p className="muted">{summary.count} entr{summary.count === 1 ? 'y' : 'ies'}</p>
          </>
        )}
        {energy
          ? <p className="hint">A rough range for a day with light to moderate activity is {energy.low} to {energy.high} kcal (Mifflin-St Jeor estimate). It is not a target.</p>
          : <p className="hint">Add your height, weight, age and sex in Settings (all optional) to see a rough daily energy range.</p>}
      </Card>

      {guidance && !guidance.empty && date === today && (
        <Card title="Gentle note for today">
          <p className="hint">Based on what you logged on {formatDay(guidance.date)}. Optional, and you can turn it off in Settings.</p>
          <ul className="plain">{guidance.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </Card>
      )}

      {MEAL_CATEGORIES.map((meal) => {
        const rows = entries.filter((e) => e.mealCategory === meal)
        const kcal = rows.reduce((a, e) => a + e.kcal, 0)
        return (
          <Card key={meal} title={`${MEAL_LABEL[meal]}${rows.length ? ` · ${Math.round(kcal)} kcal` : ''}`}>
            {rows.length === 0 && <p className="hint">Nothing here yet.</p>}
            <ul className="history">
              {rows.map((e) => (
                <li key={e.id} className="food-row">
                  <button type="button" className="alt" onClick={() => navigate(`/food/edit/${e.id}`)}>
                    <strong>{e.name}{e.brand ? ` · ${e.brand}` : ''}</strong>
                    <span className="muted">{e.portionValue} {PORTION_LABEL[e.portionUnit]} · {PREP_SHORT[e.state]} · {Math.round(e.kcal)} kcal{e.approximate ? ' (approx.)' : ''}</span>
                  </button>
                  <div className="inline">
                    <Button variant="small" onClick={() => { setCopy(e); setCopyDate(date); setCopyMeal(e.mealCategory) }} aria-label={`Duplicate ${e.name}`}>Duplicate</Button>
                    <Button variant="small" onClick={() => setDel(e)} aria-label={`Delete ${e.name}`}>Delete</Button>
                  </div>
                </li>
              ))}
            </ul>
            <Button variant="ghost" onClick={() => navigate(`/food/add?meal=${meal}&date=${date}`)}>Add to {MEAL_LABEL[meal].toLowerCase()}</Button>
          </Card>
        )
      })}


      {del && (
        <ConfirmDialog title="Delete this entry?" message={`${del.name} (${Math.round(del.kcal)} kcal) will be removed from ${formatDay(del.date)}.`} confirmLabel="Delete" danger
          onCancel={() => setDel(null)} onConfirm={async () => { await deleteFoodEntry(del.id); setDel(null) }} />
      )}
      {copy && (
        <Dialog title="Duplicate entry" onClose={() => setCopy(null)}>
          <p>{copy.name}</p>
          <div className="field">
            <label htmlFor="copy-date">Day</label>
            <input id="copy-date" type="date" value={copyDate} onChange={(e) => setCopyDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="copy-meal">Meal</label>
            <select id="copy-meal" value={copyMeal} onChange={(e) => setCopyMeal(e.target.value as MealCategory)}>
              {MEAL_CATEGORIES.map((m) => <option key={m} value={m}>{MEAL_LABEL[m]}</option>)}
            </select>
          </div>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => setCopy(null)}>Cancel</Button>
            <Button disabled={!copyDate} onClick={async () => { await duplicateFoodEntry(copy.id, copyDate, copyMeal); setCopy(null) }}>Duplicate</Button>
          </div>
        </Dialog>
      )}
    </>
  )
}
