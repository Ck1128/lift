import { describe, it, expect, vi } from 'vitest'
import { buildLink, buildReport, collectDiagnostics, configuredDestinations, feedbackProblem, parseDestination, performShare, screenshotProblem } from './feedback'

const diag = collectDiagnostics({ appVersion: '9.9.9', databaseSchema: 4, catalogVersion: 'c1' })
const input = { category: 'bug' as const, message: '  The map is wrong  ', context: { screen: 'Progress', component: 'Muscle recovery' }, includeDiagnostics: false, now: new Date('2026-10-21T12:00:00Z') }

describe('feedback report', () => {
  it('has the category, message, context, version and timestamp, and no diagnostics unless asked', () => {
    const r = buildReport(input, diag)
    expect(r.text).toContain('Bug report')
    expect(r.text).toContain('Progress > Muscle recovery')
    expect(r.text).toContain('The map is wrong')
    expect(r.text).toContain('9.9.9')
    expect(r.text).toContain('2026-10-21T12:00:00.000Z')
    const j = JSON.parse(r.json)
    expect(j.diagnostics).toBeUndefined()
    expect(j.attached).toBeUndefined()
    expect(r.filename).toBe('lift-feedback-2026-10-21.json')
  })
  it('adds diagnostics and attached data only when chosen, and says so', () => {
    const r = buildReport({ ...input, includeDiagnostics: true, attached: { label: 'Recovery status', data: { chest: 'recent' } } }, diag)
    const j = JSON.parse(r.json)
    expect(j.diagnostics.appVersion).toBe('9.9.9')
    expect(j.attached.data.chest).toBe('recent')
    expect(r.text).toContain('Attached by me: Recovery status')
  })
  it('diagnostics hold device facts only, never health or personal fields', () => {
    expect(Object.keys(diag).sort()).toEqual(['appVersion', 'catalogVersion', 'colorScheme', 'databaseSchema', 'displayMode', 'language', 'online', 'platform', 'reducedMotion', 'viewport'])
  })
  it('validates the message and screenshot', () => {
    expect(feedbackProblem('   ')).toMatch(/few words/)
    expect(feedbackProblem('ok')).toBeNull()
    expect(feedbackProblem('x'.repeat(2001))).toMatch(/under/)
    expect(screenshotProblem({ type: 'application/pdf', size: 1 })).toMatch(/image/)
    expect(screenshotProblem({ type: 'image/png', size: 6 * 1024 * 1024 })).toMatch(/5 MB/)
    expect(screenshotProblem({ type: 'image/png', size: 1000 })).toBeNull()
  })
})

describe('destinations and links', () => {
  it('validates what the person types', () => {
    expect(parseDestination('email', 'a@b.co')).toEqual({ value: 'a@b.co' })
    expect('problem' in parseDestination('email', 'nope')).toBe(true)
    expect(parseDestination('sms', '+1 (555) 123-4567')).toEqual({ value: '15551234567' })
    expect('problem' in parseDestination('whatsapp', 'abc')).toBe(true)
    expect('problem' in parseDestination('sms', '123')).toBe(true)
  })
  it('builds links that carry the message, encoded', () => {
    const r = buildReport(input, diag)
    expect(buildLink('email', 'a@b.co', r)).toMatch(/^mailto:a@b\.co\?subject=.*&body=/)
    expect(buildLink('sms', '15551234567', r, true)).toContain('sms:15551234567&body=')
    expect(buildLink('sms', '15551234567', r, false)).toContain('sms:15551234567?body=')
    expect(buildLink('whatsapp', '15551234567', r)).toMatch(/^https:\/\/wa\.me\/15551234567\?text=/)
  })
  it('the source contains no hardcoded email address, phone number or WhatsApp account', () => {
    const files = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
    const names = Object.keys(files).filter((f) => !/\.test\./.test(f))
    expect(names.length).toBeGreaterThan(20)
    for (const f of names) {
      const t = files[f]
      expect(t, f).not.toMatch(/[\w.+-]+@(gmail|yahoo|outlook|icloud|hotmail)\.[a-z]+/i)
      expect(t, f).not.toMatch(/wa\.me\/\d{7,}/)
    }
  })
  it('reads optional destinations only from build-time env', () => {
    expect(configuredDestinations({})).toEqual({ email: '', phone: '' })
    expect(configuredDestinations({ VITE_FEEDBACK_EMAIL: ' x@y.io ' }).email).toBe('x@y.io')
  })
})

describe('sharing is honest', () => {
  const report = buildReport(input, diag)
  it('opens the app with the message and never claims delivery', async () => {
    const open = vi.fn(); const save = vi.fn()
    const r = await performShare({ channel: 'email', destination: 'a@b.co', report, open, save })
    expect(open).toHaveBeenCalledOnce()
    expect(save).toHaveBeenCalledOnce()
    expect(r.ok).toBe(true)
    expect(r.message).toMatch(/cannot see whether/i)
    expect(r.message).not.toMatch(/delivered successfully|has been sent/i)
  })
  it('a bad destination opens nothing', async () => {
    const open = vi.fn()
    const r = await performShare({ channel: 'email', destination: 'nope', report, open, save: vi.fn() })
    expect(r.ok).toBe(false)
    expect(open).not.toHaveBeenCalled()
  })
  it('uses the native share sheet with the file when the device supports it', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const r = await performShare({ channel: 'share', destination: '', report, nav: { share, canShare: () => true } })
    expect(share).toHaveBeenCalledOnce()
    expect(share.mock.calls[0][0].files[0].name).toBe(report.filename)
    expect(r.ok).toBe(true)
  })
  it('explains clearly when sharing is unavailable, cancelled or fails', async () => {
    expect((await performShare({ channel: 'share', destination: '', report, nav: {} })).message).toMatch(/no share sheet/)
    expect((await performShare({ channel: 'share', destination: '', report, nav: { share: vi.fn(), canShare: () => false } })).message).toMatch(/cannot share files/)
    const abort = vi.fn().mockRejectedValue(new DOMException('x', 'AbortError'))
    expect((await performShare({ channel: 'share', destination: '', report, nav: { share: abort, canShare: () => true } })).message).toMatch(/cancelled/)
    const boom = vi.fn().mockRejectedValue(new Error('x'))
    expect((await performShare({ channel: 'share', destination: '', report, nav: { share: boom, canShare: () => true } })).ok).toBe(false)
  })
  it('reports when the app link cannot be opened', async () => {
    const r = await performShare({ channel: 'whatsapp', destination: '15551234567', report, open: () => { throw new Error('blocked') }, save: vi.fn() })
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/could not open/i)
  })
  it('saving a file says nothing was sent', async () => {
    const save = vi.fn()
    expect((await performShare({ channel: 'file', destination: '', report, save })).message).toMatch(/nothing was sent/i)
    expect(save).toHaveBeenCalled()
  })
})
