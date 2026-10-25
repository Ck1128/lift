import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { deleteFoodEntry, duplicateFoodEntry, foodOnDate } from '../db/foodRepo'
import { addDays, formatDay } from '../engine/dates'
import { MEAL_CATEGORIES, MEAL_LABEL, PORTION_LABEL, PREP_SHORT, summarizeDay, type FoodLogEntry, type MealCategory } from '../engine/food'
import { energyEstimate, nextDayGuidance } from '../engine/guidance'
import type { Profile } from '../engine/types'
import { NutritionCard } from '../components/NutritionCard'
import { Button, Card, ConfirmDialog, Dialog, EmptyState, ScreenHeader } from '../components/ui'
import { queryOf, useRouter } from '../router'
import { useT } from '../i18n'

const INTRO_KEY = 'food.intro'

function Fold({ id, title, meta, children }: { id: string; title: string; meta: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const t = useT()
  return (
    <section className={`fold${open ? ' open' : ''}`}>
      <button type="button" className="fold-head" aria-expanded={open} aria-controls={`fold-${id}`} onClick={() => setOpen(!open)}>
        <span className="fold-title">{t(title)}</span>
        <span className="fold-meta">{t(meta)}</span>
        <span className="fold-chev" aria-hidden="true" />
      </button>
      {open && <div id={`fold-${id}`} className="fold-body">{children}</div>}
    </section>
  )
}

export function Food({ profile, today }: { profile: Profile; today: string }) {
  const { navigate, path } = useRouter()
  const date = queryOf(path).get('date') ?? today
  const entries = useLiveQuery(() => foodOnDate(date), [date], [] as FoodLogEntry[])
  const prev = useLiveQuery(() => foodOnDate(addDays(date, -1)), [date], [] as FoodLogEntry[])
  const sessions = useLiveQuery(() => db.sessions.where('date').equals(addDays(date, -1)).toArray(), [date], [])
  const started = useLiveQuery(async () => (await db.settings.get(INTRO_KEY))?.value === true, [], undefined)
  const [pick, setPick] = useState(false)
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

      <Card className="food-hero">
        {summary.count === 0 ? (
          <p className="muted">Nothing logged this day.</p>
        ) : (
          <p className="big">{Math.round(summary.kcal)} <span className="muted">kcal · {summary.count} entr{summary.count === 1 ? 'y' : 'ies'}</span></p>
        )}
        {energy && <p className="hint">Typical day for you: {energy.low}–{energy.high} kcal. Not a target.</p>}
        <Button onClick={() => setPick(true)}>Log food</Button>
      </Card>

      {guidance && !guidance.empty && date === today && (
        <Card title="Gentle note for today">
          <p className="hint">Based on what you logged on {formatDay(guidance.date)}. Optional, and you can turn it off in Settings.</p>
          <ul className="plain">{guidance.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </Card>
      )}

      {summary.count > 0 && (
        <div className="fold-list">
          <Fold id="nutrition" title="Nutrition today" meta="Vitamins, minerals, groups">
            <NutritionCard entries={entries} />
          </Fold>
          {MEAL_CATEGORIES.map((meal) => {
            const rows = entries.filter((e) => e.mealCategory === meal)
            if (rows.length === 0) return null
            const kcal = rows.reduce((a, e) => a + e.kcal, 0)
            return (
              <Fold key={meal} id={meal} title={MEAL_LABEL[meal]} meta={`${Math.round(kcal)} kcal`}>
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
              </Fold>
            )
          })}
        </div>
      )}

      {pick && (
        <Dialog title="Which meal?" onClose={() => setPick(false)}>
          <div className="meal-pick">
            {MEAL_CATEGORIES.map((meal) => (
              <Button key={meal} variant="ghost" onClick={() => navigate(`/food/add?meal=${meal}&date=${date}`)}>{MEAL_LABEL[meal]}</Button>
            ))}
          </div>
        </Dialog>
      )}

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
