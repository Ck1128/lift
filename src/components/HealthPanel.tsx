import { useState } from 'react'
import { ConfirmButton } from './confirm'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { applyImport, clearSent, DEFAULT_PREFS, getHealthPrefs, getSent, markSent, previewImport, saveHealthPrefs, type HealthPrefs } from '../db/healthRepo'
import {
  batchesOf, DEFAULT_SHORTCUT_READ, DEFAULT_SHORTCUT_SEND, foodItems, parseHealthText, runShortcutUrl, unsentOnly, weightItem, workoutItem, yogaItem,
  type HealthBatch, type MergePlan, type SendItem,
} from '../engine/health'
import { readHealthExport } from '../engine/healthXml'
import { estimateCalories } from '../engine/calories'
import { activeMinutes } from '../engine/history'
import { yogaCalories } from '../engine/yoga'
import type { Profile, WorkoutSession, SetLog } from '../engine/types'
import { Button } from './ui'

/** Opening a shortcuts:// link hands off to the Shortcuts app. It does nothing on a computer. */
export function openShortcut(url: string): void { window.location.href = url }

/** Rough kcal for one session, only used when the person turned calorie estimates on. */
export function workoutKcal(s: WorkoutSession, logs: SetLog[], profile: Profile): number | undefined {
  const efforts = logs.filter((l) => l.sessionId === s.id && l.completed && l.effortRating).map((l) => l.effortRating!)
  const est = estimateCalories({ weightKg: profile.weightKg, activeMinutes: activeMinutes(s), averageEffort: efforts.length ? efforts.reduce((a, b) => a + b, 0) / efforts.length : undefined })
  return est ? Math.round((est.low + est.high) / 2) : undefined
}

const usePrefs = () => useLiveQuery(getHealthPrefs, [], DEFAULT_PREFS)
const useSent = () => useLiveQuery(getSent, [], {} as Record<string, string>)

const RANGES = [{ k: '90', label: '90 days', days: 90 }, { k: '365', label: '1 year', days: 365 }, { k: 'all', label: 'All time', days: 0 }] as const
const sinceDate = (k: string, today: string): string | undefined => {
  const r = RANGES.find((x) => x.k === k)
  if (!r || !r.days) return undefined
  const d = new Date(`${today}T12:00:00`)
  d.setDate(d.getDate() - r.days)
  return d.toISOString().slice(0, 10)
}

/** A button on a finished session that hands that one session to the Shortcut. */
export function SendToHealthButton({ build }: { build: (includeKcal: boolean) => SendItem | null }) {
  const prefs = usePrefs()
  const sent = useSent()
  const item = build(prefs.includeKcal)
  if (!item) return null
  const done = Boolean(sent[item.id])
  return (
    <Button variant="small" aria-label={done ? 'Send to Apple Health again' : 'Add to Apple Health'} onClick={async () => { await markSent([item]); openShortcut(runShortcutUrl(prefs.sendName, item.line)) }}>
      {done ? 'Sent to Apple Health ✓' : 'Add to Apple Health'}
    </Button>
  )
}

export function HealthPanel({ profile, today }: { profile: Profile; today: string }) {
  const prefs = usePrefs()
  const sent = useSent()
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [] as WorkoutSession[])
  const logs = useLiveQuery(() => db.setLogs.toArray(), [], [] as SetLog[])
  const yoga = useLiveQuery(() => db.yogaSessions.toArray(), [], [])
  const weights = useLiveQuery(() => db.bodyWeights.toArray(), [], [])
  const food = useLiveQuery(() => db.foodLog.toArray(), [], [])
  const imported = useLiveQuery(() => db.healthWorkouts.count(), [], 0)

  const [text, setText] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [batch, setBatch] = useState<{ b: HealthBatch; source: string } | null>(null)
  const [since, setSince] = useState<'90' | '365' | 'all'>('90')
  const [plan, setPlan] = useState<MergePlan | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState('')

  const setPrefs = (p: Partial<HealthPrefs>) => void saveHealthPrefs({ ...prefs, ...p })

  /* ---- sending ---- */
  const items: SendItem[] = [
    ...sessions.map((s) => workoutItem(s, prefs.includeKcal, prefs.includeKcal ? workoutKcal(s, logs, profile) : undefined)),
    ...yoga.map((y) => yogaItem(y, prefs.includeKcal, prefs.includeKcal ? (() => { const k = yogaCalories(y.style, y.durationSeconds, profile.weightKg); return k ? Math.round((k.low + k.high) / 2) : undefined })() : undefined)),
    ...weights.map(weightItem),
    ...(prefs.includeFood ? foodItems(food) : []),
  ].filter((i): i is SendItem => i !== null)
  const unsent = unsentOnly(items, sent)
  const next = batchesOf(unsent)[0] ?? []

  const send = async () => {
    if (next.length === 0) return
    await markSent(next)
    openShortcut(runShortcutUrl(prefs.sendName, next.map((i) => i.line).join('\n')))
  }
  const copyLines = async () => {
    try { await navigator.clipboard.writeText(next.map((i) => i.line).join('\n')); setCopied('Copied.') } catch { setCopied('Could not copy. Select the text from the share sheet instead.') }
  }

  /* ---- bringing in ---- */
  const show = async (b: HealthBatch, source: string, k = since) => {
    setBatch({ b, source })
    setPlan(await previewImport(b, profile.weightUnit, sinceDate(k, today)))
    setMsg('')
  }
  const fromText = async (t: string) => {
    const b = parseHealthText(t)
    if (b.weights.length + b.workouts.length === 0) { setBatch(null); setPlan(null); setMsg('Nothing readable in that text. It should have lines starting with B| or K|. See the setup steps below.'); return }
    await show(b, 'Shortcut text')
  }
  const paste = async () => {
    setMsg('')
    try {
      // If the phone never answers the paste prompt, fall back to the box instead of waiting forever.
      const t = await Promise.race([navigator.clipboard.readText(), new Promise<string>((_, no) => setTimeout(() => no(new Error('timeout')), 4000))])
      if (!t.trim()) { setShowPaste(true); setMsg('The clipboard is empty. Run the shortcut first, or paste below.'); return }
      setText(t)
      await fromText(t)
    } catch { setShowPaste(true); setMsg('Your phone would not let Lift read the clipboard. Paste below instead.') }
  }
  const chooseFile = async (f: File | undefined) => {
    if (!f) return
    setBusy(true); setProgress(0); setMsg('')
    try {
      const b = await readHealthExport(f, setProgress)
      if (b.weights.length + b.workouts.length === 0) setMsg('No body weight or workouts were found in that file.')
      else await show(b, f.name)
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not read that file.') } finally { setBusy(false) }
  }
  const changeSince = async (k: '90' | '365' | 'all') => { setSince(k); if (batch) await show(batch.b, batch.source, k) }
  const add = async () => {
    if (!plan) return
    await applyImport(plan)
    setMsg(`Added ${plan.newWeights.length} weight${plan.newWeights.length === 1 ? '' : 's'} and ${plan.newWorkouts.length} workout${plan.newWorkouts.length === 1 ? '' : 's'}.`)
    setBatch(null); setPlan(null); setText(''); setShowPaste(false)
  }

  const copy = async (label: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(`${label} copied.`) } catch { setCopied('Could not copy.') }
  }

  return (
    <div className="health">
      <p className="notice" role="note">
        Lift talks to Apple Health through the Shortcuts app on your iPhone, because a web app cannot reach Health directly.
        It needs a one-time setup, takes a few minutes, costs nothing and sends nothing to a server.
      </p>

      <h3 className="h-sub">Send to Apple Health</h3>
      <p className="hint">
        {unsent.length === 0 ? 'Everything is already sent.' : `${unsent.length} new item${unsent.length === 1 ? '' : 's'} ready: workouts, yoga and body weight${prefs.includeFood ? ', food days' : ''}.`}
        {prefs.lastSendAt ? ` Last sent ${new Date(prefs.lastSendAt).toLocaleDateString()}.` : ''}
      </p>
      <label className="check">
        <input type="checkbox" checked={prefs.includeKcal} onChange={(e) => setPrefs({ includeKcal: e.target.checked })} />
        <span>Include calorie estimates with workouts</span>
      </label>
      <p className="hint">Off by default. These are rough estimates, not measurements, and Health will treat them as real.</p>
      <label className="check">
        <input type="checkbox" checked={prefs.includeFood} onChange={(e) => setPrefs({ includeFood: e.target.checked })} />
        <span>Include daily food calories</span>
      </label>
      <ConfirmButton disabled={next.length === 0} confirm={{ title: 'Send to Apple Health?', message: `${next.length} item${next.length === 1 ? '' : 's'} will be handed to your "${prefs.sendName}" shortcut. Health will treat them as real records.` }} onConfirm={send}>{next.length === 0 ? 'Nothing to send' : `Send ${next.length}${unsent.length > next.length ? ` of ${unsent.length}` : ''} to Apple Health`}</ConfirmButton>
      {unsent.length > next.length && <p className="hint">Long lists go in batches. Tap again after the shortcut finishes.</p>}
      <div className="inline">
        <Button variant="small" disabled={next.length === 0} onClick={() => void copyLines()}>Copy the lines instead</Button>
        {sent && Object.keys(sent).length > 0 && <ConfirmButton variant="small" confirm={{ title: 'Forget what was sent?', message: 'Everything becomes sendable again. Sending it twice can create duplicates in Health.' }} onConfirm={() => clearSent()}>Forget what was sent</ConfirmButton>}
      </div>
      {copied && <p className="hint" role="status">{copied}</p>}
      <p className="hint">Lift cannot see whether the shortcut finished. "Sent" means the lines were handed to it. If something is missing in Health, use "Forget what was sent" and send again.</p>

      <h3 className="h-sub">Bring in from Apple Health</h3>
      <p className="hint">Body weight and workouts from your Watch or other apps. {imported > 0 ? `${imported} workout${imported === 1 ? '' : 's'} imported so far.` : ''} {prefs.lastImportAt ? `Last import ${new Date(prefs.lastImportAt).toLocaleDateString()}.` : ''}</p>
      <div className="stack">
        <Button onClick={() => openShortcut(runShortcutUrl(prefs.readName))}>1. Run “{prefs.readName}”</Button>
        <Button variant="ghost" onClick={() => void paste()}>2. Paste what it copied</Button>
      </div>
      {showPaste && (
        <div className="field">
          <label htmlFor="health-paste">Pasted text</label>
          <textarea id="health-paste" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={'B|2026-10-21T07:30|172.4|lb\nK|2026-10-21T18:05|Running|32|310'} />
          <Button variant="small" disabled={!text.trim()} onClick={() => void fromText(text)}>Read it</Button>
        </div>
      )}
      <div className="field">
        <label htmlFor="health-file">Or choose a Health export (export.zip)</label>
        <input id="health-file" type="file" accept=".zip,.xml,application/zip,text/xml" disabled={busy} onChange={(e) => void chooseFile(e.target.files?.[0])} />
        {busy && <p className="hint" role="status">Reading… {Math.round(progress * 100)}%. Big files take a minute. Keep this screen open.</p>}
        <p className="hint">In Health: tap your picture, then Export All Health Data. The file is read on this phone and is not uploaded.</p>
      </div>

      {plan && batch && (
        <div className="notice" role="region" aria-label="Health import preview">
          <p><strong>From {batch.source}</strong></p>
          <div className="chips" role="group" aria-label="How far back">
            {RANGES.map((r) => <button key={r.k} type="button" className={since === r.k ? 'chip on' : 'chip'} aria-pressed={since === r.k} onClick={() => void changeSince(r.k)}>{r.label}</button>)}
          </div>
          <ul className="plain">
            <li>{plan.newWeights.length} new body weight entr{plan.newWeights.length === 1 ? 'y' : 'ies'}</li>
            <li>{plan.newWorkouts.length} new workout{plan.newWorkouts.length === 1 ? '' : 's'}</li>
            {plan.alreadyHere > 0 && <li>{plan.alreadyHere} already in Lift</li>}
            {plan.overlapLift > 0 && <li>{plan.overlapLift} skipped because you logged that session in Lift</li>}
            {plan.ignored > 0 && <li>{plan.ignored} could not be read</li>}
          </ul>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => { setBatch(null); setPlan(null) }}>Cancel</Button>
            <Button disabled={plan.newWeights.length + plan.newWorkouts.length === 0} onClick={() => void add()}>Add to Lift</Button>
          </div>
        </div>
      )}
      {msg && <p className={msg.startsWith('Added') ? 'ok' : 'hint'} role="status">{msg}</p>}

      <details className="optional">
        <summary>Set up the two shortcuts (once)</summary>
        <p className="hint">Open the Shortcuts app, tap +, and build these. Apple renames actions now and then. If one is called something slightly different, pick the closest. The names must match what is below, or change the names here.</p>
        <div className="inline">
          <input aria-label="Name of the send shortcut" value={prefs.sendName} onChange={(e) => setPrefs({ sendName: e.target.value })} />
          <input aria-label="Name of the read shortcut" value={prefs.readName} onChange={(e) => setPrefs({ readName: e.target.value })} />
          <Button variant="small" onClick={() => setPrefs({ sendName: DEFAULT_SHORTCUT_SEND, readName: DEFAULT_SHORTCUT_READ })}>Reset names</Button>
        </div>

        <h4 className="h-sub">“{prefs.sendName}” writes to Health</h4>
        <ol className="steps">
          <li>Add <strong>Split Text</strong>: Shortcut Input, separated by New Lines.</li>
          <li>Add <strong>Repeat with Each</strong> over that. Inside it:</li>
          <li>Add <strong>Split Text</strong>: Repeat Item, separated by Custom, and type a vertical bar |.</li>
          <li>Add <strong>Get Item from List</strong> four times, for item 1, 2, 3 and 4 (and 5 if you send calories).</li>
          <li>Add <strong>If</strong> item 1 is K: then <strong>If</strong> item 3 is Yoga, <strong>Log Workout</strong> as Yoga, otherwise <strong>Log Workout</strong> as Traditional Strength Training. Use item 4 as the duration in minutes, item 2 (turned into a date with <strong>Get Dates from Input</strong>) as the start, and item 5 as calories if you have it.</li>
          <li>Add <strong>If</strong> item 1 is B: <strong>Log Health Sample</strong>, type Body Mass, value item 3, unit item 4, date item 2.</li>
          <li>Add <strong>If</strong> item 1 is F: <strong>Log Health Sample</strong>, type Dietary Energy, value item 3, date item 2.</li>
          <li>The first time you run it, allow the Health permissions it asks for.</li>
        </ol>

        <h4 className="h-sub">“{prefs.readName}” reads from Health (5 actions)</h4>
        <ol className="steps">
          <li><strong>Find Health Samples</strong>: Type is Body Mass, Start Date is in the last 90 days.</li>
          <li><strong>Repeat with Each</strong> over the samples. Inside it add one <strong>Text</strong> action. Type <code>B|</code>, then tap the Repeat Item and choose <strong>Start Date</strong>, type <code>|</code>, Repeat Item, <strong>Value</strong>, type <code>|</code>, Repeat Item, <strong>Unit</strong>.</li>
          <li>After the loop add <strong>Combine Text</strong> on <strong>Repeat Results</strong>, joined with New Lines.</li>
          <li>Add <strong>Copy to Clipboard</strong>.</li>
          <li>Run it once and allow Health access. No date formatting is needed: Lift reads dates the way your iPhone writes them.</li>
        </ol>
        <p className="hint">Want workouts too? Add a second Find Health Samples (Workouts) and Repeat with Each before the Combine Text, with the text <code>K|</code> Start Date <code>|</code> Workout Type <code>|</code> Duration <code>|</code> Active Energy.</p>
        <p className="hint">Example of what ends up on the clipboard (the | is a vertical bar):</p>
        <pre className="code">{'B|Oct 21, 2026 at 7:30 AM|172.4|lb\nK|Oct 21, 2026 at 6:05 PM|Running|32 min|310 kcal'}</pre>
        <Button variant="small" onClick={() => void copy('Example lines', 'B|2026-10-21T07:30|172.4|lb\nK|2026-10-21T18:05|Running|32|310')}>Copy the example lines</Button>
        <p className="hint">Not sure about the shortcuts? The export.zip file above works without any setup, and reads your full history.</p>
      </details>
    </div>
  )
}
