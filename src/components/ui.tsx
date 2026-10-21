import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="card">
      {title && <h2 className="card-title">{title}</h2>}
      {children}
    </section>
  )
}

export function Button({
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  return <button {...props} className={`btn btn-${variant} ${props.className ?? ''}`} />
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="empty" role="status">
      <strong>{title}</strong>
      <p>{hint}</p>
    </div>
  )
}

export function MockBadge() {
  return (
    <span className="mock-badge" title="Placeholder data, not real">
      Sample data
    </span>
  )
}

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="screen-header">
      <h1>{title}</h1>
      {subtitle && <p className="muted">{subtitle}</p>}
    </header>
  )
}
