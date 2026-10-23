import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getPain, savePain, updateExclusions } from '../db/repo'
import { ConfirmButton } from './confirm'
import { MUSCLE_LABEL, type Profile } from '../engine/types'
import { PAIN_AREAS, PAIN_LEVEL_LABEL, painSummary, type PainArea, type PainLevel, type PainReport } from '../engine/pain'
import { Button, Card } from './ui'
import { useT } from '../i18n'

/**
 * Asked before every workout. "No pain" is one tap; otherwise pick the areas and how bad. Today's workout is rebuilt
 * around the answer. The answer is only for today.
 */
export function PainCheck({ today, profile, onSaved }: { today: string; profile?: Profile; onSaved: () => void | Promise<void> }) {
  const t = useT()
  const saved = useLiveQuery(() => getPain(today), [today])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<PainReport>({})
  const [busy, setBusy] = useState(false)
  if (saved === undefined) return null

  const commit = async (r: PainReport) => {
    setBusy(true)
    try { await savePain(today, r); setEditing(false); await onSaved() } finally { setBusy(false) }
  }
  const answered = saved !== null
  // Areas marked injured in Settings stay here every day until they are unmarked, here or in Settings.
  const injured = profile?.injuredMuscles ?? []
  const recovering = injured.length > 0 && (
    <div className="recovering" role="group" aria-label="Injured or recovering areas">
      <p className="label-like">{t('Still recovering')}</p>
      <div className="chips">
        {injured.map((m) => (
          <ConfirmButton key={m} variant="small" confirm={{ title: `Mark ${MUSCLE_LABEL[m].toLowerCase()} as healed?`, message: 'It goes back to normal training. You can mark it again in Settings.' }} onConfirm={() => updateExclusions({ injuredMuscles: injured.filter((x) => x !== m) })}>
            {MUSCLE_LABEL[m]} ✕
          </ConfirmButton>
        ))}
      </div>
      <p className="hint">These recover slower and get one fewer set. Tap one when it has healed.</p>
    </div>
  )
  if (answered && !editing) {
    const any = Object.keys(saved).length > 0
    return (
      <Card title="Pain check">
        <p>{any ? <><strong>{t('Pain today')}:</strong> {painSummary(saved)}</> : injured.length > 0 ? t('No new pain today.') : t('No pain today. Nice.')}</p>
        {recovering}
        <Button variant="ghost" onClick={() => { setDraft(saved); setEditing(true) }}>{t('Change')}</Button>
      </Card>
    )
  }

  const toggle = (a: PainArea) => setDraft((d) => {
    const n = { ...d }
    if (n[a]) delete n[a]
    else n[a] = 1
    return n
  })
  const setLevel = (a: PainArea, l: PainLevel) => setDraft((d) => ({ ...d, [a]: l }))
  const picked = Object.keys(draft) as PainArea[]

  return (
    <Card title="Pain check" className="pain-check">
      {recovering}
      <p className="big">{t('Do you have any pain or discomfort today?')}</p>
      <Button disabled={busy} onClick={() => void commit({})}>{t('No pain, I feel good')}</Button>
      <p className="label-like">{t('Tap the places that hurt')}</p>
      <div className="chips" role="group" aria-label={t('Tap the places that hurt')}>
        {PAIN_AREAS.map((a) => (
          <button key={a.id} type="button" className={draft[a.id] ? 'chip on' : 'chip'} aria-pressed={!!draft[a.id]} onClick={() => toggle(a.id)}>{t(a.label)}</button>
        ))}
      </div>
      {picked.map((a) => (
        <div key={a} className="field">
          <span className="label-like">{t(PAIN_AREAS.find((x) => x.id === a)!.label)}</span>
          <div className="chips" role="radiogroup" aria-label={`${PAIN_AREAS.find((x) => x.id === a)!.label} ${t('Mild')}`}>
            {([1, 2, 3] as PainLevel[]).map((l) => (
              <button key={l} type="button" role="radio" aria-checked={draft[a] === l} className={draft[a] === l ? 'chip on' : 'chip'} onClick={() => setLevel(a, l)}>{t(PAIN_LEVEL_LABEL[l])}</button>
            ))}
          </div>
        </div>
      ))}
      {picked.some((a) => draft[a] === 3) && <p className="error" role="alert">Severe pain is a reason to rest. Please do not train through it. If it does not settle, ask a qualified professional.</p>}
      {picked.length > 0 && <Button disabled={busy} onClick={() => void commit(draft)}>{t('Build my workout')}</Button>}
      <p className="hint">Pain is only used to choose gentler exercises for today. It is not a diagnosis.</p>
    </Card>
  )
}
