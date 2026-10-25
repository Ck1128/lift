import { useState } from 'react'
import { Card, Dialog, Button } from './ui'
import { dayNutrition, scoreDay, SCORE_UNLOCK_KCAL, SODIUM_LIMIT_MG, type Part } from '../engine/nutrition'
import { GROUP_LABEL, type FoodGroup } from '../engine/foodGroups'
import type { FoodLogEntry } from '../engine/food'

const ICON: Record<FoodGroup, string> = {
  vegetables: '🥬', fruit: '🍓', whole_grains: '🌾', healthy_oils: '🥑', nuts_legumes: '🥜', fish: '🐟', red_meat: '🥩', processed_meat: '🌭', alcohol: '🍷',
}
const GROUP_ORDER: FoodGroup[] = ['vegetables', 'fruit', 'whole_grains', 'healthy_oils', 'nuts_legumes', 'fish', 'red_meat', 'processed_meat', 'alcohol']

function Ring({ value, locked }: { value: number | null; locked?: boolean }) {
  const R = 54, C = 2 * Math.PI * R
  return (
    <svg className="nut-ring" viewBox="0 0 130 130" role="img" aria-label={locked ? 'Nutrition score locked' : value === null ? 'No score yet' : `Nutrition score ${value} out of 100`}>
      <circle cx="65" cy="65" r={R} className="nut-bg" />
      {value !== null && !locked && <circle cx="65" cy="65" r={R} className="nut-fg" strokeDasharray={`${(C * value) / 100} ${C}`} transform="rotate(-90 65 65)" />}
      {locked
        ? <g className="nut-lock"><rect x="52" y="62" width="26" height="22" rx="5" /><path d="M57 62v-7a8 8 0 0 1 16 0v7" fill="none" strokeWidth="4" /></g>
        : <text x="65" y="74" textAnchor="middle" className="nut-num">{value ?? '–'}</text>}
    </svg>
  )
}

function PartRow({ p }: { p: Part }) {
  return (
    <li className="nut-row nut-part">
      <span className="nut-name">{p.label}</span>
      <span className="nut-val">{p.score === null ? 'not enough data' : p.detail}</span>
      <span className="nut-bar" aria-hidden="true"><span style={{ width: `${p.score ?? 0}%` }} /></span>
    </li>
  )
}

/** The day's nutrition: a score that unlocks after 750 kcal, the four measures behind it, and the food groups eaten. */
export function NutritionCard({ entries }: { entries: FoodLogEntry[] }) {
  const [info, setInfo] = useState(false)
  const n = dayNutrition(entries)
  const s = scoreDay(n)
  if (entries.length === 0) return null
  const grams = (g: FoodGroup) => Math.round(n.groups[g])
  return (
    <Card title="Nutrition">
      <div className="nut-top">
        <Ring value={s.locked ? null : s.score} locked={s.locked} />
        <div>
          {s.locked
            ? <p className="big">Log <strong>{Math.max(0, s.needed - s.kcal)} more kcal</strong> to unlock today's Nutrition score.</p>
            : <p className="big">{s.score === null ? 'Not enough data for a score' : `Score ${s.score} of 100`}</p>}
          <p className="hint">{s.locked ? `${s.kcal} of ${SCORE_UNLOCK_KCAL} kcal logged. A half-logged day is not scored.` : 'Lift\'s own simple score from four guideline targets.'}</p>
          <button type="button" className="link-btn" onClick={() => setInfo(true)}>How is this worked out?</button>
        </div>
      </div>
      {!s.locked && <ul className="nut-list" aria-label="What the score is made of">{s.parts.map((p) => <PartRow key={p.id} p={p} />)}</ul>}

      <p className="label-like">Food groups today</p>
      <ul className="nut-list" aria-label="Food groups">
        {GROUP_ORDER.map((g) => (
          <li key={g} className="nut-row">
            <span className="nut-icon" aria-hidden="true">{ICON[g]}</span>
            <span className="nut-name">{GROUP_LABEL[g]}</span>
            <span className="nut-val">{grams(g) > 0 ? `${grams(g)} g` : '0 g'}</span>
          </li>
        ))}
      </ul>
      <p className="label-like">Also today</p>
      <ul className="nut-list" aria-label="Other nutrients">
        <li className="nut-row"><span className="nut-name">Sodium</span><span className="nut-val">{n.measures.sodiumMg.coverage > 0 ? `${Math.round(n.measures.sodiumMg.total)} mg` : 'no data'}</span></li>
        <li className="nut-row"><span className="nut-name">Fibre</span><span className="nut-val">{n.measures.fiber.coverage > 0 ? `${Math.round(n.measures.fiber.total)} g` : 'no data'}</span></li>
        <li className="nut-row"><span className="nut-name">Sugars (total, includes natural)</span><span className="nut-val">{n.measures.sugars.coverage > 0 ? `${Math.round(n.measures.sugars.total)} g` : 'no data'}</span></li>
        <li className="nut-row"><span className="nut-name">Saturated fat</span><span className="nut-val">{n.measures.satFat.coverage > 0 ? `${Math.round(n.measures.satFat.total)} g` : 'no data'}</span></li>
      </ul>
      <p className="hint">Only foods that have these values are counted. Foods without them (most Indian dishes, foods you typed yourself, and anything logged before this update) are left out, never guessed.</p>
      {info && (
        <Dialog title="How the Nutrition score works" onClose={() => setInfo(false)}>
          <div className="dialog-body">
            <p>The score is the average of up to four parts, each from 0 to 100:</p>
            <ul className="plain">
              <li>Sodium: full marks under {SODIUM_LIMIT_MG} mg a day.</li>
              <li>Fibre: full marks at 14 g for every 1,000 kcal.</li>
              <li>Saturated fat: full marks under 10% of calories.</li>
              <li>Fruit and vegetables: full marks at 400 g a day.</li>
            </ul>
            <p>The first three targets are from the U.S. Dietary Guidelines for Americans, the last from the World Health Organization. A part is only used when at least 80% of your logged calories come from foods that have its value, and the score needs at least two parts.</p>
            <p>Sugars are shown but not scored: the data has total sugars only, and cannot tell fruit and milk sugar from added sugar. Food values come from the USDA Standard Reference database stored on this phone. This is a guide, not medical advice.</p>
          </div>
          <div className="dialog-actions"><Button onClick={() => setInfo(false)}>Close</Button></div>
        </Dialog>
      )}
    </Card>
  )
}
