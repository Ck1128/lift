import { useState } from 'react'
import { previewResetDay, resetDay, type ResetPreview } from '../db/repo'
import { formatDay } from '../engine/dates'
import { phraseMatches, resetPhrase } from '../engine/resetPhrase'
import { Button, Dialog } from './ui'

type Step = 'closed' | 'review' | 'type' | 'final'

/**
 * A three-step reset for one day: review what will be removed, type a phrase, then press a separate final button.
 * It sits in its own "danger zone" so it is never next to a normal action.
 */
export function ResetDay({ date, today, onDone }: { date: string; today: string; onDone?: () => void }) {
  const [step, setStep] = useState<Step>('closed')
  const [preview, setPreview] = useState<ResetPreview | null>(null)
  const [understood, setUnderstood] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const phrase = resetPhrase(date, today)

  const open = async () => {
    setResult(null)
    setUnderstood(false)
    setTyped('')
    setPreview(await previewResetDay(date))
    setStep('review')
  }
  const close = () => setStep('closed')
  const run = async () => {
    setBusy(true)
    try {
      const r = await resetDay(date)
      setStep('closed')
      setResult(`Reset done. Removed ${r.sessions} workout${r.sessions === 1 ? '' : 's'} and ${r.sets} logged set${r.sets === 1 ? '' : 's'} for ${formatDay(date)}. Nothing else was changed.`)
      onDone?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card danger-zone" aria-label="Danger zone">
      <h2 className="card-title">Danger zone</h2>
      <p className="hint">Start this one day over. Your profile, other days, yoga, food and settings are not touched.</p>
      <Button variant="danger" onClick={() => void open()}>Reset {date === today ? 'today' : formatDay(date)}...</Button>
      {result && <p className="ok" role="status">{result}</p>}

      {step === 'review' && preview && (
        <Dialog title="Reset this day? (step 1 of 3)" onClose={close}>
          <p>This will remove for <strong>{formatDay(date)}</strong>:</p>
          <ul className="plain">
            <li>{preview.sessions} saved workout{preview.sessions === 1 ? '' : 's'}</li>
            <li>{preview.sets} logged set{preview.sets === 1 ? '' : 's'}</li>
          </ul>
          <p className="hint">The day goes back to "not started". It cannot be undone. Export a backup first in Settings if you might want it.</p>
          <label className="check">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
            <span>I understand this removes the logged work for this day.</span>
          </label>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button variant="danger" disabled={!understood} onClick={() => setStep('type')}>Continue</Button>
          </div>
        </Dialog>
      )}

      {step === 'type' && (
        <Dialog title="Type to confirm (step 2 of 3)" onClose={close}>
          <p>Type <strong>{phrase}</strong> to go on.</p>
          <div className="field">
            <label htmlFor="reset-phrase">Confirmation phrase</label>
            <input id="reset-phrase" autoCapitalize="characters" autoComplete="off" autoCorrect="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
          </div>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button variant="danger" disabled={!phraseMatches(typed, phrase)} onClick={() => setStep('final')}>Continue</Button>
          </div>
        </Dialog>
      )}

      {step === 'final' && (
        <Dialog title="Last check (step 3 of 3)" onClose={close}>
          <p>Reset <strong>{formatDay(date)}</strong> now? This is the final step.</p>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={close}>Keep my workout</Button>
            <Button variant="danger" disabled={busy} onClick={() => void run()}>{busy ? 'Resetting...' : 'Reset this day now'}</Button>
          </div>
        </Dialog>
      )}
    </section>
  )
}
