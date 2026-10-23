import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { CATALOG_VERSION } from '../data/catalog'
import { APP_VERSION, DB_SCHEMA_VERSION } from '../db/schema'
import {
  buildReport, CATEGORY_LABEL, CHANNEL_LABEL, collectDiagnostics, configuredDestinations, ELEMENT_CATEGORIES, feedbackProblem, MAX_MESSAGE,
  performShare, screenshotProblem, SETTINGS_CATEGORIES, type Channel, type FeedbackCategory, type FeedbackContext,
} from '../engine/feedback'
import { tracksOf } from '../engine/tracks'
import { useProfile } from '../hooks/app'
import { clearDraft, loadDraft, saveDraft } from '../hooks/drafts'
import { Dialog } from './ui'

/* ---------- show/hide the small F buttons (a per-device preference, off the data model) ---------- */
const KEY = 'lift.feedbackIcons'
const listeners = new Set<() => void>()
const readIcons = (): boolean => { try { return localStorage.getItem(KEY) !== 'off' } catch { return true } }
export const setFeedbackIcons = (on: boolean) => { try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* private mode: the choice lasts until reload */ } listeners.forEach((l) => l()) }
export const useFeedbackIcons = (): boolean => useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb) } }, readIcons, () => true)

/* ---------- scope: which screen we are on, and how to open the dialog ---------- */
export interface FeedbackOptions { categories?: FeedbackCategory[]; attach?: { label: string; data: unknown } }
interface Scope { screen: string; open: (ctx: FeedbackContext, opts?: FeedbackOptions) => void }
const ScopeCtx = createContext<Scope | null>(null)
export const useFeedbackScope = () => useContext(ScopeCtx)

const SCREEN_NAME: Record<string, string> = { home: 'Home', plan: 'Plan', workout: 'Workout', food: 'Food', progress: 'Progress', settings: 'Settings', yoga: 'Yoga', session: 'Session' }
export const screenNameOf = (path: string): string => SCREEN_NAME[path.split('?')[0].split('/')[1] ?? 'home'] ?? 'App'

export function FeedbackHost({ path, children }: { path: string; children: ReactNode }) {
  const [state, setState] = useState<{ ctx: FeedbackContext; opts?: FeedbackOptions } | null>(null)
  const screen = screenNameOf(path)
  const scope = useMemo<Scope>(() => ({ screen, open: (ctx, opts) => setState({ ctx, opts }) }), [screen])
  return (
    <ScopeCtx.Provider value={scope}>
      {children}
      {state && (
        <Dialog title="Send feedback" onClose={() => setState(null)}>
          <FeedbackForm context={state.ctx} categories={state.opts?.categories ?? ELEMENT_CATEGORIES} attach={state.opts?.attach} onDone={() => setState(null)} />
        </Dialog>
      )}
    </ScopeCtx.Provider>
  )
}

/** The small, unobtrusive "F" next to an element. The letter is decoration; the accessible name says what it does. */
export function FeedbackButton({ component, element, options }: { component: string; element?: string; options?: FeedbackOptions }) {
  const scope = useFeedbackScope()
  const on = useFeedbackIcons()
  if (!scope || !on) return null
  const what = element ?? component
  return (
    <button type="button" className="icon-btn fb" aria-label={`Send feedback about ${what}`} title="Send feedback" onClick={() => scope.open({ screen: scope.screen, component, element }, options)}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 12a7.500 7.500 0 0 1-10.800 6.700L4 20l1.400-4.300A7.500 7.500 0 1 1 20 12Z" /></svg>
    </button>
  )
}

const CHANNEL_ICONS: { id: Channel; label: string; icon: ReactNode }[] = [
  { id: 'sms', label: 'Message', icon: <path d="M21 12a8 8 0 0 1-11.500 7.200L4 20.500l1.400-4.800A8 8 0 1 1 21 12Z" /> },
  { id: 'whatsapp', label: 'WhatsApp', icon: <><path d="M4 20l1.200-4A8.500 8.500 0 1 1 8.200 18.900L4 20Z" /><path d="M9 9c0 3 3 6 6 6l1-1.500-2-1-1 .8c-.8-.4-1.600-1.200-2-2l.8-1-1-2L9 9Z" /></> },
  { id: 'email', label: 'Email', icon: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></> },
  { id: 'copy', label: 'Copy', icon: <><rect x="8" y="8" width="12" height="12" rx="3" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></> },
]

/* ---------- the form (used in the dialog and in Settings) ---------- */
export function FeedbackForm({ context, categories = SETTINGS_CATEGORIES, attach, onDone, defaultCategory }: {
  context: FeedbackContext
  categories?: FeedbackCategory[]
  attach?: { label: string; data: unknown }
  onDone?: () => void
  defaultCategory?: FeedbackCategory
}) {
  const profile = useProfile()
  const cfg = useMemo(() => configuredDestinations(), [])
  const [category, setCategory] = useState<FeedbackCategory>(defaultCategory ?? categories[0])
  const [message, setMessageRaw] = useState(() => loadDraft<string>('feedback.message') ?? '')
  const setMessage = (m: string) => { setMessageRaw(m); if (m) saveDraft('feedback.message', m); else clearDraft('feedback.message') }
  const [diag, setDiag] = useState(false)
  const [attachOn, setAttachOn] = useState(false)
  const [shot, setShot] = useState<File | null>(null)
  const [channel, setChannel] = useState<Channel>('sms')
  const [dest, setDest] = useState(cfg.phone || '+1 ')
  const [step, setStep] = useState<'edit' | 'preview'>('edit')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [sentNote, setSentNote] = useState('')

  const needsDest = channel === 'email' || channel === 'sms' || channel === 'whatsapp'
  const diagnostics = () => collectDiagnostics({ appVersion: APP_VERSION, databaseSchema: DB_SCHEMA_VERSION, catalogVersion: CATALOG_VERSION, tracks: profile ? tracksOf(profile).list : undefined })
  const report = () => buildReport({ category, message, context, includeDiagnostics: diag, attached: attach && attachOn ? attach : undefined }, diagnostics())

  const pickChannel = (c: Channel) => {
    setChannel(c)
    if (c === 'email') setDest(cfg.email)
    // US country code to start with. It can be edited.
    else if (c === 'sms' || c === 'whatsapp') setDest(cfg.phone || '+1 ')
    else setDest('')
  }
  const preview = () => {
    const p = feedbackProblem(message)
    if (p) { setError(p); return }
    setError('')
    setResult(null)
    setStep('preview')
  }
  const share = async () => {
    setBusy(true)
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
    const r = await performShare({ channel, destination: dest, report: report(), screenshot: shot, ios })
    setResult(r)
    setBusy(false)
    if (r.ok) clearDraft('feedback.message')
    // Once Messages, WhatsApp or Mail has opened with the text, this sheet has done its job.
    if (r.ok && (channel === 'sms' || channel === 'whatsapp' || channel === 'email')) {
      if (onDone) onDone()
      else { setMessageRaw(''); setStep('edit'); setSentNote(r.message) } // inline form in Settings: start fresh and keep the note
    }
  }

  const previewDialog = step === 'preview' && (() => {
    const rep = report()
    return (
      <Dialog title="Review before sharing" onClose={() => setStep('edit')}>
        <p className="hint">This is exactly what will be put in the message and the file. Nothing has been sent.</p>
        <pre className="preview" aria-label="Message preview">{rep.text}</pre>
        <details>
          <summary className="muted">Attachment file ({rep.filename})</summary>
          <pre className="preview" aria-label="Attachment preview">{rep.fileText}</pre>
        </details>
        {shot && <p className="hint">Screenshot: {shot.name}. {channel === 'share' ? 'It goes with the share sheet where your device allows.' : 'Only Share can include it. Choose Share, or attach it yourself afterwards.'}</p>}
        <ul className="plain hint">
          <li>Diagnostics: {diag ? 'included' : 'not included'}</li>
          <li>{attach ? `${attach.label}: ${attachOn ? 'included' : 'not included'}` : 'No workout, food or body data is included.'}</li>
        </ul>
        <p className="hint">Sending via: {CHANNEL_LABEL[channel]}{needsDest ? ` to ${dest || '(no destination)'}` : ''}.</p>
        {result && <p className={result.ok ? 'notice' : 'error'} role={result.ok ? 'status' : 'alert'}>{result.message}</p>}
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setStep('edit')}>Back</button>
          <button type="button" className="btn" disabled={busy} onClick={() => void share()}>{channel === 'file' ? 'Save file' : channel === 'copy' ? 'Copy message' : 'Confirm and share'}</button>
        </div>
        {result?.ok && onDone && <button type="button" className="btn btn-ghost" onClick={onDone}>Close</button>}
      </Dialog>
    )
  })()

  const id = (s: string) => `fb-${context.component ?? 'g'}-${s}`.replace(/\s+/g, '-')
  return (
    <>
    {previewDialog}
    <form onSubmit={(e) => { e.preventDefault(); preview() }} noValidate>
      {sentNote && <p className="notice" role="status">{sentNote}</p>}
      {(context.component || context.element) && (
        <p className="hint">About: <strong>{[context.screen, context.component, context.element].filter(Boolean).join(' › ')}</strong></p>
      )}
      <div className="field">
        <label htmlFor={id('cat')}>What kind of feedback?</label>
        <select id={id('cat')} value={category} onChange={(e) => setCategory(e.target.value as FeedbackCategory)}>
          {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor={id('msg')}>Your feedback</label>
        <textarea id={id('msg')} rows={4} maxLength={MAX_MESSAGE} value={message} onChange={(e) => setMessage(e.target.value)} aria-invalid={!!error} aria-describedby={error ? id('err') : undefined} />
        {error && <p id={id('err')} className="error" role="alert">{error}</p>}
      </div>
      <label className="check"><input type="checkbox" checked={diag} onChange={(e) => setDiag(e.target.checked)} /><span>Include a diagnostic report (app version, device type, screen size, online or offline). No workout or health data.</span></label>
      {attach && (
        <label className="check"><input type="checkbox" checked={attachOn} onChange={(e) => setAttachOn(e.target.checked)} /><span>Also attach: {attach.label}</span></label>
      )}
      <div className="field">
        <label htmlFor={id('shot')}>Screenshot (optional)</label>
        <input id={id('shot')} type="file" accept="image/*" onChange={(e) => {
          const f = e.target.files?.[0] ?? null
          if (!f) { setShot(null); return }
          const p = screenshotProblem(f)
          if (p) { setError(p); setShot(null); e.target.value = ''; return }
          setError(''); setShot(f)
        }} />
        {shot && <p className="hint">{shot.name} ({Math.round(shot.size / 1024)} KB) <button type="button" className="link-btn" onClick={() => setShot(null)}>Remove</button></p>}
      </div>
      <div className="field">
        <span className="label-like" id={id('chan')}>How do you want to send it?</span>
        <div className="channel-icons" role="radiogroup" aria-labelledby={id('chan')}>
          {CHANNEL_ICONS.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={channel === c.id} aria-label={c.label} className={`channel-icon${channel === c.id ? ' on' : ''}`} onClick={() => pickChannel(c.id)}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{c.icon}</svg>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>
      {needsDest && (
        <div className="field">
          <label htmlFor={id('dest')}>{channel === 'email' ? 'Send to (email address)' : 'Send to (phone number with country code)'}</label>
          <input id={id('dest')} value={dest} inputMode={channel === 'email' ? 'email' : 'tel'} autoComplete="off" onChange={(e) => setDest(e.target.value)} />
          <p className="hint">You choose where it goes. This app has no built-in address.</p>
        </div>
      )}
      <p className="hint">Message, WhatsApp and Email open that app with your text ready to send. A screenshot cannot ride along; attach it yourself in the app.</p>
      <button type="submit" className="btn">Preview</button>
    </form>
    </>
  )
}
