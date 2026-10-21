import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { isRoot, useRouter } from '../router'

export function Card({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className ?? ''}`}>
      {title && <h2 className="card-title">{title}</h2>}
      {children}
    </section>
  )
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'small' }) {
  return <button type="button" {...props} className={`btn btn-${variant} ${className ?? ''}`} />
}

export function EmptyState({ title, hint, children }: { title: string; hint: string; children?: ReactNode }) {
  return (
    <div className="empty" role="status">
      <strong>{title}</strong>
      <p>{hint}</p>
      {children}
    </div>
  )
}

/** A page title. Every page that is not a main tab shows a Back control above it. */
export function ScreenHeader({ title, subtitle, back }: { title: string; subtitle?: string; back?: boolean }) {
  const { path, back: goBack } = useRouter()
  const showBack = back ?? !isRoot(path)
  return (
    <header className="screen-header">
      {showBack && (
        <button type="button" className="back-btn" onClick={goBack} aria-label="Back">
          <span aria-hidden="true">‹</span> Back
        </button>
      )}
      <h1>{title}</h1>
      {subtitle && <p className="muted">{subtitle}</p>}
    </header>
  )
}

export function Chips<T extends string | number>({
  label, options, value, onChange, format,
}: {
  label: string
  options: readonly T[]
  value: T
  onChange: (v: T) => void
  format?: (v: T) => string
}) {
  return (
    <div role="group" aria-label={label} className="chips">
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          className={value === o ? 'chip on' : 'chip'}
          aria-pressed={value === o}
          onClick={() => onChange(o)}
        >
          {format ? format(o) : String(o)}
        </button>
      ))}
    </div>
  )
}

export function Field({
  label, hint, error, children,
}: { label: string; hint?: string; error?: string; children: (id: string, describedBy: string | undefined) => ReactNode }) {
  const id = useId()
  const hid = `${id}-h`
  const eid = `${id}-e`
  const described = [hint ? hid : '', error ? eid : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children(id, described)}
      {hint && <p id={hid} className="hint">{hint}</p>}
      {error && <p id={eid} className="error" role="alert">{error}</p>}
    </div>
  )
}

/** Simple modal. Closes on Escape and when the backdrop is tapped. */
export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })
  // Focus moves into the dialog once, when it opens. It must not move again while the person types in a field inside it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    document.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  title, message, confirmLabel, danger, onConfirm, onCancel,
}: { title: string; message: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Dialog title={title} onClose={onCancel}>
      <div className="dialog-body">{message}</div>
      <div className="dialog-actions">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Dialog>
  )
}
