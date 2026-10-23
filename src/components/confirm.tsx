import { useRef, useState, type ReactNode } from 'react'
import { Button, ConfirmDialog, Dialog } from './ui'

/**
 * A button that asks "OK or Cancel?" before it does anything. Use it for every action that changes or removes saved
 * data, or starts or finishes something. Pure navigation and in-workout taps (like marking a set) do not need it.
 */
export function ConfirmButton({
  confirm, onConfirm, children, variant, className, disabled, ...rest
}: {
  confirm: { title: string; message?: ReactNode; confirmLabel?: string; danger?: boolean }
  onConfirm: () => void | Promise<void>
  children: ReactNode
  variant?: 'primary' | 'ghost' | 'danger' | 'small'
  className?: string
  disabled?: boolean
  'aria-label'?: string
}) {
  const [open, setOpen] = useState(false)
  const busy = useRef(false)
  const run = async () => {
    if (busy.current) return
    busy.current = true
    setOpen(false)
    try { await onConfirm() } finally { busy.current = false }
  }
  return (
    <>
      <Button variant={variant} className={className} disabled={disabled} onClick={() => setOpen(true)} {...rest}>{children}</Button>
      {open && (
        <ConfirmDialog
          title={confirm.title} message={confirm.message ?? null} confirmLabel={confirm.confirmLabel ?? 'OK'} danger={confirm.danger}
          onCancel={() => setOpen(false)} onConfirm={() => void run()}
        />
      )}
    </>
  )
}

type DeleteStep = 'warn' | 'type' | 'final'
export const DELETE_WORD = 'DELETE'

/**
 * Deleting something for good takes three separate steps: read the warning, type the word, then press a different
 * final button. Pressing Enter never moves a step forward and the final button ignores a second tap.
 */
export function StepDelete({
  what, consequence, onConfirm, onCancel,
}: { what: string; consequence: ReactNode; onConfirm: () => void | Promise<void>; onCancel: () => void }) {
  const [step, setStep] = useState<DeleteStep>('warn')
  const [typed, setTyped] = useState('')
  const done = useRef(false)
  const ok = typed.trim().toUpperCase() === DELETE_WORD
  const finish = async () => {
    if (done.current || !ok) return
    done.current = true
    await onConfirm()
  }
  return (
    <Dialog title={`Delete ${what}? (step ${step === 'warn' ? 1 : step === 'type' ? 2 : 3} of 3)`} onClose={onCancel}>
      {step === 'warn' && (
        <>
          <div className="dialog-body">{consequence}</div>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button variant="danger" onClick={() => setStep('type')}>Continue</Button>
          </div>
        </>
      )}
      {step === 'type' && (
        <>
          <div className="field">
            <label htmlFor="step-delete-word">Type {DELETE_WORD} to continue</label>
            <input id="step-delete-word" value={typed} autoComplete="off" autoCapitalize="characters" onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }} />
          </div>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button variant="danger" disabled={!ok} onClick={() => ok && setStep('final')}>Continue</Button>
          </div>
        </>
      )}
      {step === 'final' && (
        <>
          <div className="dialog-body"><p><strong>Last chance.</strong> This cannot be undone.</p></div>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button variant="danger" onClick={() => void finish()}>Delete for good</Button>
          </div>
        </>
      )}
    </Dialog>
  )
}

/** Shown while something is changed but not saved. Nothing is applied until Save. */
export function SaveBar({ dirty, onSave, onDiscard, label = 'Save changes' }: { dirty: boolean; onSave: () => void | Promise<void>; onDiscard: () => void; label?: string }) {
  const [busy, setBusy] = useState(false)
  if (!dirty) return null
  return (
    <div className="save-bar" role="region" aria-label="Unsaved changes">
      <span className="save-bar-text">You have unsaved changes</span>
      <Button variant="ghost" disabled={busy} onClick={onDiscard}>Discard</Button>
      <Button disabled={busy} onClick={async () => { setBusy(true); try { await onSave() } finally { setBusy(false) } }}>{label}</Button>
    </div>
  )
}
