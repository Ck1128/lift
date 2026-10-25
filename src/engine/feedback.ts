/**
 * Feedback reports (US-01, US-02, US-10). Everything is built on this device and handed to the person to send.
 *
 * What this module will NOT do:
 *  - It never contains a built-in email address, phone number or WhatsApp account. The person types a destination, or
 *    the person who builds the app sets one at build time (VITE_FEEDBACK_EMAIL / VITE_FEEDBACK_PHONE), outside the source.
 *  - It never includes workout, food, body or profile data unless the person ticks the box that attaches it.
 *  - It never says feedback was "sent" or "delivered". Opening the Mail, Messages or WhatsApp app is all it can know.
 */

export type FeedbackCategory = 'general' | 'bug' | 'feature' | 'ui' | 'incorrect_data' | 'mapping' | 'other'

export const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  general: 'General feedback', bug: 'Bug report', feature: 'Feature request', ui: 'UI / design',
  incorrect_data: 'Incorrect data', mapping: 'Incorrect muscle mapping or recovery calculation', other: 'Other',
}
/** Categories offered in Settings. */
export const SETTINGS_CATEGORIES: FeedbackCategory[] = ['general', 'bug', 'feature', 'ui', 'other']
/** Categories offered from the small F button next to an element. */
export const ELEMENT_CATEGORIES: FeedbackCategory[] = ['bug', 'ui', 'feature', 'incorrect_data', 'other']
/** Extra choice on the recovery dashboard and muscle map. */
export const MUSCLE_CATEGORIES: FeedbackCategory[] = ['mapping', 'bug', 'ui', 'feature', 'other']

export type Channel = 'share' | 'email' | 'sms' | 'whatsapp' | 'copy' | 'file'
export const CHANNEL_LABEL: Record<Channel, string> = {
  share: 'Share (pick Messages, WhatsApp or Mail; attaches the file)', email: 'Email (message text only)', sms: 'SMS / text (message text only)',
  whatsapp: 'WhatsApp (message text only)', copy: 'Copy the message', file: 'Save a file',
}

export interface FeedbackContext {
  screen: string
  component?: string
  element?: string
}

export interface FeedbackInput {
  category: FeedbackCategory
  message: string
  context: FeedbackContext
  includeDiagnostics: boolean
  /** Optional extra information the person chose to attach, with the label they saw next to the checkbox. */
  attached?: { label: string; data: unknown }
  now?: Date
}

export interface Diagnostics {
  appVersion: string
  databaseSchema: number
  catalogVersion: string
  platform: string
  language: string
  viewport: string
  displayMode: 'standalone' | 'browser'
  online: boolean
  colorScheme: 'dark' | 'light'
  reducedMotion: boolean
  tracks?: string[]
}

export interface FeedbackReport {
  /** Human-readable message, also used as the body of an email, text or WhatsApp message. */
  text: string
  /** The attachment, as JSON text. */
  json: string
  /** The file that is attached: the readable message followed by the JSON. Plain text, so every app accepts it. */
  fileText: string
  filename: string
  subject: string
}

export const MAX_MESSAGE = 2000
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024
export const SCREENSHOT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/heic']

export function feedbackProblem(message: string): string | null {
  const t = message.trim()
  if (t.length === 0) return 'Write a few words about what you would like to tell us.'
  if (t.length > MAX_MESSAGE) return `Please keep it under ${MAX_MESSAGE} characters.`
  return null
}

export function screenshotProblem(file: { type: string; size: number }): string | null {
  if (!SCREENSHOT_TYPES.includes(file.type)) return 'Please choose a PNG, JPEG, WebP or HEIC image.'
  if (file.size > MAX_SCREENSHOT_BYTES) return 'That image is larger than 5 MB. Choose a smaller one.'
  return null
}

export function collectDiagnostics(base: { appVersion: string; databaseSchema: number; catalogVersion: string; tracks?: string[] }): Diagnostics {
  const w = typeof window === 'undefined' ? undefined : window
  const mm = (q: string) => !!w?.matchMedia?.(q).matches
  return {
    ...base,
    platform: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
    language: typeof navigator === 'undefined' ? 'unknown' : navigator.language,
    viewport: w ? `${w.innerWidth}x${w.innerHeight}` : 'unknown',
    displayMode: mm('(display-mode: standalone)') || (typeof navigator !== 'undefined' && (navigator as { standalone?: boolean }).standalone === true) ? 'standalone' : 'browser',
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    colorScheme: mm('(prefers-color-scheme: dark)') ? 'dark' : 'light',
    reducedMotion: mm('(prefers-reduced-motion: reduce)'),
  }
}

export function buildReport(input: FeedbackInput, diagnostics: Diagnostics): FeedbackReport {
  const now = input.now ?? new Date()
  const stamp = now.toISOString()
  const ctx = input.context
  const where = [ctx.screen, ctx.component, ctx.element].filter(Boolean).join(' > ')
  const msg = input.message.trim()
  const doc = {
    format: 'lift-feedback',
    version: 1,
    category: input.category,
    categoryLabel: CATEGORY_LABEL[input.category],
    message: msg,
    context: ctx,
    createdAt: stamp,
    appVersion: diagnostics.appVersion,
    diagnostics: input.includeDiagnostics ? diagnostics : undefined,
    attached: input.attached ? { label: input.attached.label, data: input.attached.data } : undefined,
  }
  const lines = [
    `Lift feedback: ${CATEGORY_LABEL[input.category]}`,
    where ? `Where: ${where}` : '',
    '',
    msg,
    '',
    `App version ${diagnostics.appVersion} · ${stamp}`,
    input.includeDiagnostics ? `Device: ${diagnostics.platform} · ${diagnostics.viewport}` : '',
    input.attached ? `Attached by me: ${input.attached.label}` : '',
  ].filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== ''))
  return {
    text: lines.join('\n').trim(),
    json: JSON.stringify(doc, null, 2),
    fileText: `${lines.join('\n').trim()}\n\n---- details (JSON) ----\n${JSON.stringify(doc, null, 2)}\n`,
    filename: `lift-feedback-${stamp.slice(0, 10)}.txt`,
    subject: `Lift feedback: ${CATEGORY_LABEL[input.category]}`,
  }
}

/** Destination the person typed. Returns the cleaned value or a problem. */
export function parseDestination(channel: Channel, raw: string): { value: string } | { problem: string } {
  const v = raw.trim()
  if (channel === 'email') {
    return /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(v) ? { value: v } : { problem: 'Enter a valid email address.' }
  }
  if (channel === 'sms' || channel === 'whatsapp') {
    const digits = v.replace(/[^\d]/g, '')
    if (digits.length < 7 || digits.length > 15 || /[^\d\s()+.-]/.test(v)) return { problem: 'Enter a phone number with country code, for example +1 555 123 4567.' }
    // A US number typed without the country code (10 digits) gets 1 in front.
    return { value: digits.length === 10 && !v.startsWith('+') ? `1${digits}` : digits }
  }
  return { value: '' }
}

/**
 * Link that opens the chosen app with the message filled in. A link cannot carry a file, so the whole report goes in the
 * text itself (trimmed if it is too long for the app to accept).
 */
export function buildLink(channel: 'email' | 'sms' | 'whatsapp', destination: string, report: FeedbackReport, ios = false): string {
  const limit = channel === 'email' ? 1800 : 1200
  const body = report.text.length > limit ? `${report.text.slice(0, limit - 40)}\n[trimmed]` : report.text
  if (channel === 'email') return `mailto:${encodeURIComponent(destination).replace(/%40/g, '@')}?subject=${encodeURIComponent(report.subject)}&body=${encodeURIComponent(body)}`
  if (channel === 'sms') return `sms:${destination}${ios ? '&' : '?'}body=${encodeURIComponent(body)}`
  return `https://wa.me/${destination}?text=${encodeURIComponent(body)}`
}

export interface ShareOutcome { ok: boolean; message: string }

/** What an honest result looks like. "Opened" is not "delivered". */
export const OPENED = (app: string) => `${app} should now be open with your message ready. Press Send there. This app cannot see whether it was sent or delivered.`

export async function performShare(opts: {
  channel: Channel
  destination: string
  report: FeedbackReport
  screenshot?: File | null
  ios?: boolean
  nav?: Partial<Navigator>
  open?: (url: string) => void
  save?: (name: string, text: string) => void
}): Promise<ShareOutcome> {
  const { channel, report, screenshot } = opts
  const nav = (opts.nav ?? (typeof navigator === 'undefined' ? {} : navigator)) as Partial<Navigator>
  const open = opts.open ?? ((u: string) => { window.location.href = u })
  const save = opts.save ?? defaultSave

  if (channel === 'file') {
    save(report.filename, report.fileText)
    return { ok: true, message: `Saved ${report.filename}. Nothing was sent anywhere.` }
  }
  if (channel === 'copy') {
    try {
      await nav.clipboard?.writeText(report.text)
      if (!nav.clipboard) throw new Error('no clipboard')
      return { ok: true, message: 'Copied. Paste it into any app. Nothing was sent.' }
    } catch {
      return { ok: false, message: 'Copying is not allowed here. Choose Share or Save a file instead.' }
    }
  }
  if (channel === 'share') {
    if (typeof nav.share !== 'function') return { ok: false, message: 'This browser has no share sheet. Choose Email, SMS, WhatsApp, Copy or Save a file instead.' }
    const file = new File([report.fileText], report.filename, { type: 'text/plain' })
    const withShot = screenshot ? [file, screenshot] : [file]
    // Try the most complete version first and step down, telling the person what was left out.
    const attempts: { data: ShareData; note: string }[] = [
      { data: { title: report.subject, text: report.text, files: withShot }, note: '' },
      ...(screenshot ? [{ data: { title: report.subject, text: report.text, files: [file] }, note: ' The screenshot could not be included; attach it yourself.' }] : []),
      { data: { title: report.subject, text: report.text }, note: ' The file could not be attached on this device, so the message text was shared instead.' },
    ]
    for (const a of attempts) {
      const hasFiles = !!a.data.files?.length
      if (hasFiles && typeof nav.canShare === 'function' && !nav.canShare({ files: a.data.files })) continue
      try {
        await nav.share(a.data)
        return { ok: true, message: `The share sheet closed. This app cannot see whether you sent it or where it went.${a.note}` }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return { ok: false, message: 'Sharing was cancelled. Nothing was sent.' }
      }
    }
    return { ok: false, message: 'Sharing did not work on this device. Choose Copy, Email, SMS or Save a file instead.' }
  }
  const parsed = parseDestination(channel, opts.destination)
  if ('problem' in parsed) return { ok: false, message: parsed.problem }
  try {
    open(buildLink(channel, parsed.value, report, opts.ios))
  } catch {
    return { ok: false, message: `Could not open ${channel === 'email' ? 'Mail' : channel === 'sms' ? 'Messages' : 'WhatsApp'}. Choose Share or Copy instead.` }
  }
  const app = channel === 'email' ? 'Your mail app' : channel === 'sms' ? 'Your messages app' : 'WhatsApp'
  return { ok: true, message: `${OPENED(app)} The whole message is in the text. A link cannot attach files or a screenshot; use Share for that.` }
}

function defaultSave(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Optional destinations set when the app is built (not in source control). Empty when not configured. */
export function configuredDestinations(env: Record<string, unknown> = (import.meta as unknown as { env: Record<string, unknown> }).env): { email: string; phone: string } {
  const s = (k: string) => (typeof env[k] === 'string' ? (env[k] as string).trim() : '')
  return { email: s('VITE_FEEDBACK_EMAIL'), phone: s('VITE_FEEDBACK_PHONE') }
}
