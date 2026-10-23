import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { dismissWeighIn, getWeighInDismissed, logWeighIn } from '../db/storyRepo'
import { toDateKey } from '../engine/dates'
import { weighInDue } from '../engine/weighIn'
import { convertWeight, tidy1 } from '../engine/units'
import type { Profile, WeightUnit } from '../engine/types'
import { Button, Dialog } from './ui'
import { WeightField } from './WeightField'

/**
 * A weekly weigh-in. It appears from Monday and returns each day until this week has a weight.
 * Closing it hides it for the rest of that day only; nothing is lost and nothing is required.
 */
export function WeighInPrompt({ profile, today }: { profile: Profile; today: string }) {
  const weights = useLiveQuery(() => db.bodyWeights.toArray(), [], undefined)
  const dismissed = useLiveQuery(() => getWeighInDismissed(), [], undefined)
  const [hidden, setHidden] = useState(false)
  const [text, setText] = useState('')
  const [unit, setUnit] = useState<WeightUnit>(profile.weightUnit)
  const [error, setError] = useState('')

  if (weights === undefined || dismissed === undefined || hidden) return null
  const startedOn = toDateKey(new Date(profile.createdAt))
  if (!weighInDue({ today, weights, dismissedOn: dismissed || undefined, startedOn })) return null

  const last = [...weights].sort((a, b) => b.date.localeCompare(a.date))[0]
  const lastText = last ? `${tidy1(convertWeight(last.value, last.unit, unit))} ${unit}` : ''
  const lastDate = last ? last.date : ''

  const close = () => { setHidden(true); void dismissWeighIn(today) }
  const save = async () => {
    const n = Number(text)
    const kg = convertWeight(n, unit, 'kg')
    if (text.trim() === '' || !Number.isFinite(n) || kg < 20 || kg > 400) { setError(`Enter your weight in ${unit}, for example ${unit === 'lb' ? '165' : '75'}.`); return }
    await logWeighIn(n, unit, today)
    setHidden(true)
  }

  return (
    <Dialog title="Weekly weigh-in" onClose={close}>
      <p>Log this week's body weight so your Body Story and progress stay accurate.</p>
      {last && <p className="hint">Last time: {lastText} on {lastDate}.</p>}
      <WeightField
        id="weigh-in" label="Your weight today" value={text} unit={unit} error={error} placeholder={last ? lastText.split(' ')[0] : undefined}
        onChange={(v, u) => { setText(v); setUnit(u); setError('') }}
      />
      <div className="dialog-actions">
        <Button onClick={() => void save()}>Save weight</Button>
        <Button variant="ghost" onClick={close}>Not now</Button>
      </div>
      <p className="hint">Not now hides this until tomorrow. It keeps asking once a day until this week has a weight.</p>
    </Dialog>
  )
}
