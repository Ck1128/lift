import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useT } from '../i18n'
import { createPortal } from 'react-dom'
import { useRouter } from '../router'
import { FeedbackButton, type FeedbackOptions } from './Feedback'

export function Card({ title, children, className, feedback }: { title?: string; children: ReactNode; className?: string; feedback?: false | FeedbackOptions }) {
  const t = useT()
  return (
    <section className={`card ${className ?? ''}`}>
      {title && (
        <div className="card-head">
          <h2 className="card-title">{t(title)}</h2>
          {feedback !== false && <FeedbackButton component={title} options={feedback || undefined} />}
        </div>
      )}
      {children}
    </section>
  )
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'small' }) {
  const t = useT()
  const { children, ...rest } = props
  return <button type="button" {...rest} className={`btn btn-${variant} ${className ?? ''}`}>{typeof children === 'string' ? t(children) : children}</button>
}

/** A calm placeholder while something loads. It announces itself to screen readers and does not animate for people who ask for less motion. */
export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="skeleton" aria-hidden="true" />
      <span className="sr-only">{label}...</span>
    </div>
  )
}

/** A thin progress bar with a text alternative. */
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Something went wrong, with a way to recover. */
export function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <p className="big">{title}</p>
      <p className="muted">{message}</p>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  )
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
  const t = useT()
  const { path, back: goBack } = useRouter()
  // Every page has Back except Home, where there is nowhere to go back to.
  const showBack = back ?? path.split('?')[0] !== '/home'
  return (
    <header className="screen-header">
      {showBack && (
        <button type="button" className="back-btn" onClick={goBack} aria-label={t('Back')}>
          <span aria-hidden="true">‹</span> {t('Back')}
        </button>
      )}
      <h1>{t(title)}</h1>
      {subtitle && <p className="muted">{t(subtitle)}</p>}
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
export function Dialog({ title: rawTitle, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const title = useT()(rawTitle)
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
  // Rendered on the page itself, not inside the screen, so it always sits above the navigation bar.
  return createPortal(
    <div className="backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
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
