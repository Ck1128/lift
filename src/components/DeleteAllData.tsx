import { useRef, useState } from 'react'
import { deleteAllData } from '../db/repo'
import { DELETE_PHRASE, deletePhraseOk, makeMathChallenge, mathAnswerOk, type MathChallenge } from '../engine/deleteChallenge'
import { Button, Dialog } from './ui'

type Step = 'closed' | 'warn' | 'phrase' | 'math' | 'working' | 'failed'

export const DELETE_CATEGORIES = [
  'Your profile, height, weight and settings',
  'Your equipment lists',
  'Workout plans, saved workouts and every logged set',
  'Yoga sessions and saved yoga plans',
  'Your food log and saved online food results',
  'Body weight entries and soreness notes',
]

/**
 * Delete everything saved on this device, in three different steps:
 *  1. read the warning and continue,
 *  2. type the exact phrase,
 *  3. answer a fresh arithmetic question, then press a separate final button.
 * Pressing Enter never moves a step forward, and the final action ignores a second tap. The arithmetic question
 * only slows a hurried tap down. It is not security.
 */
export function DeleteAllData({ onDeleted }: { onDeleted: () => void }) {
  const [step, setStep] = useState<Step>('closed')
  const [typed, setTyped] = useState('')
  const [answer, setAnswer] = useState('')
  const [challenge, setChallenge] = useState<MathChallenge | null>(null)
  const [error, setError] = useState('')
  // Refs, not state, so a double-click or a replayed handler sees the latest value at once.
  const stepRef = useRef<Step>('closed')
  const busy = useRef(false)
  const go = (s: Step) => { stepRef.current = s; setStep(s) }

  const open = () => {
    setTyped(''); setAnswer(''); setChallenge(null); setError('')
    go('warn')
  }
  const close = () => {
    if (busy.current) return
    setTyped(''); setAnswer(''); setChallenge(null)
    go('closed')
  }
  const toMath = () => {
    if (stepRef.current !== 'phrase' || !deletePhraseOk(typed)) return
    setChallenge(makeMathChallenge())
    setAnswer('')
    go('math')
  }
  const run = async () => {
    // Only the final step, with the right answer, and only once.
    if (stepRef.current !== 'math' || busy.current || !challenge || !mathAnswerOk(answer, challenge) || !deletePhraseOk(typed)) return
    busy.current = true
    go('working')
    try {
      const r = await deleteAllData()
      if (r.ok) {
        setTyped(''); setAnswer(''); setChallenge(null)
        go('closed')
        onDeleted()
      } else {
        setError(`The deletion did not finish (${r.error}). ${r.remaining} records are still on this device. Nothing was half-deleted: you can try again.`)
        go('failed')
      }
    } finally {
      busy.current = false
    }
  }
  const retry = () => { setChallenge(makeMathChallenge()); setAnswer(''); setError(''); go('math') }

  return (
    <>
      <Button variant="danger" onClick={open}>Delete all data on this device...</Button>

      {step === 'warn' && (
        <Dialog title="Delete all data on this device? (step 1 of 3)" onClose={close}>
          <p><strong>This is permanent on this device.</strong> Unless you made a backup, it cannot be recovered. It does not touch anything on other devices.</p>
          <p>These will be deleted:</p>
          <ul className="plain">{DELETE_CATEGORIES.map((c) => <li key={c}>{c}</li>)}</ul>
          <p className="hint">Not affected: other websites, other apps, and the app files already saved for offline use. Make a backup first in Backup and restore if you might want your data back.</p>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button variant="danger" onClick={() => go('phrase')}>I understand, continue</Button>
          </div>
        </Dialog>
      )}

      {step === 'phrase' && (
        <Dialog title="Type to confirm (step 2 of 3)" onClose={close}>
          <form onSubmit={(e) => e.preventDefault()}>
            <p>Type <strong>{DELETE_PHRASE}</strong> exactly, in capitals.</p>
            <div className="field">
              <label htmlFor="delete-phrase">Confirmation phrase</label>
              <input id="delete-phrase" autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} value={typed} onChange={(e) => setTyped(e.target.value)} />
            </div>
            <div className="dialog-actions">
              <Button variant="ghost" type="button" onClick={close}>Cancel</Button>
              <Button variant="danger" type="button" disabled={!deletePhraseOk(typed)} onClick={toMath}>Continue</Button>
            </div>
          </form>
        </Dialog>
      )}

      {(step === 'math' || step === 'working' || step === 'failed') && challenge && (
        <Dialog title="Last check (step 3 of 3)" onClose={close}>
          <form onSubmit={(e) => e.preventDefault()}>
            {step === 'failed' ? (
              <p className="error" role="alert">{error}</p>
            ) : (
              <p>Answer this to enable the final button. It is only here to slow a hurried tap down.</p>
            )}
            <div className="field">
              <label htmlFor="delete-math">{challenge.question}</label>
              <input id="delete-math" inputMode="numeric" autoComplete="off" value={answer} disabled={step === 'working'} onChange={(e) => setAnswer(e.target.value)} />
            </div>
            <div className="dialog-actions">
              <Button variant="ghost" type="button" disabled={step === 'working'} onClick={close}>Keep my data</Button>
              {step === 'failed'
                ? <Button variant="danger" type="button" onClick={retry}>Try again</Button>
                : <Button variant="danger" type="button" disabled={step === 'working' || !mathAnswerOk(answer, challenge)} onClick={() => void run()}>{step === 'working' ? 'Deleting...' : 'Delete everything permanently'}</Button>}
            </div>
          </form>
        </Dialog>
      )}
    </>
  )
}
