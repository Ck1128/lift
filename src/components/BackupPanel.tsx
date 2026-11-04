import { useEffect, useRef, useState } from 'react'
import {
  backupFilename, CATEGORIES, CATEGORY_LABEL, DEFAULT_CATEGORIES, deviceSummary, encryptedBackupFilename, exportBackup, importBackup, MAX_IMPORT_BYTES,
  parseBackup, previewBackup, type BackupFile, type BackupPreview, type Category, type ImportReport,
} from '../db/backup'
import { CryptoError, decryptEnvelope, encryptText, looksEncrypted, parseEnvelope, passwordProblem, type EncryptedEnvelope } from '../db/crypto'
import { deliverFile } from '../export/deliver'
import { Button, Dialog } from './ui'

type Msg = { kind: 'ok' | 'error'; text: string } | null

export function ExportPanel() {
  const [cats, setCats] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [encrypted, setEncrypted] = useState(true)
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [warnPlain, setWarnPlain] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  const toggle = (c: Category) => setCats((list) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]))
  const problem = encrypted ? passwordProblem(password) ?? (password !== again ? 'The two passwords do not match.' : null) : null
  const blocked = cats.length === 0 || !!problem

  const run = async () => {
    if (busy) return
    setBusy(true)
    setMsg(null)
    try {
      const file = await exportBackup({ categories: CATEGORIES.filter((c) => cats.includes(c)) })
      const text = JSON.stringify(file)
      const out = encrypted ? JSON.stringify(await encryptText(text, password)) : text
      const result = await deliverFile(encrypted ? encryptedBackupFilename() : backupFilename(), out, 'application/json')
      setMsg(result === 'cancelled'
        ? { kind: 'ok', text: 'Export cancelled. Nothing was changed.' }
        : { kind: 'ok', text: `Backup ${result === 'shared' ? 'shared' : 'downloaded'}${encrypted ? ' and encrypted. Keep the password: it cannot be recovered' : '. It is not encrypted, so keep it somewhere private'}.` })
    } catch (e) {
      setMsg({ kind: 'error', text: `Could not create the backup. Your data on this device is unchanged. (${e instanceof CryptoError || e instanceof Error ? e.message : 'unknown error'})` })
    } finally {
      // The password never stays in the page once the export is done.
      setPassword('')
      setAgain('')
      setBusy(false)
      setWarnPlain(false)
    }
  }

  return (
    <div>
      <p className="notice">A backup holds personal health information. Never upload it to GitHub or a public place.</p>
      <fieldset className="field">
        <legend>What to include</legend>
        {CATEGORIES.map((c) => (
          <label key={c} className="check">
            <input type="checkbox" checked={cats.includes(c)} onChange={() => toggle(c)} />
            <span>{CATEGORY_LABEL[c]}{c === 'food' ? ' (off by default, because it is personal)' : ''}</span>
          </label>
        ))}
        {cats.length === 0 && <p className="error" role="alert">Choose at least one thing to include.</p>}
      </fieldset>

      <fieldset className="field">
        <legend>Protection</legend>
        <label className="check"><input type="radio" name="enc" checked={encrypted} onChange={() => setEncrypted(true)} /><span><strong>Encrypted export (recommended):</strong> locked with a password you choose.</span></label>
        <label className="check"><input type="radio" name="enc" checked={!encrypted} onChange={() => setEncrypted(false)} /><span>Plain file: anyone who finds it can read it.</span></label>
      </fieldset>

      {encrypted ? (
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="field">
            <label htmlFor="exp-pass">Password (at least 8 characters)</label>
            <input id="exp-pass" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="exp-pass2">Type the password again</label>
            <input id="exp-pass2" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
          </div>
          {password.length > 0 && problem && <p className="hint" role="status">{problem}</p>}
          <p className="hint">The password is never saved or put in the file. If you forget it, the backup cannot be opened by anyone, including us. Encryption cannot protect a file if the password is shared or guessed.</p>
        </form>
      ) : (
        <p className="notice" role="note">A plain backup is readable by anyone who gets the file. Use it only if you will keep the file somewhere private.</p>
      )}

      <p className="hint">This file will include: {cats.length ? CATEGORIES.filter((c) => cats.includes(c)).map((c) => CATEGORY_LABEL[c]).join('; ') : 'nothing yet'}.</p>
      <Button disabled={blocked || busy} onClick={() => (encrypted ? void run() : setWarnPlain(true))}>{encrypted ? 'Export encrypted backup' : 'Export plain backup...'}</Button>
      {msg && <p className={msg.kind === 'error' ? 'error' : 'ok'} role={msg.kind === 'error' ? 'alert' : 'status'}>{msg.text}</p>}
      {warnPlain && (
        <Dialog title="Export without a password?" onClose={() => setWarnPlain(false)}>
          <p>This file will not be encrypted. Anyone who finds it can read your profile, body weight and history.</p>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => setWarnPlain(false)}>Cancel</Button>
            <Button variant="danger" disabled={busy} onClick={() => void run()}>Export without a password</Button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

const REPLACE_PHRASE = 'REPLACE MY DATA'

export function ImportPanel() {
  const [msg, setMsg] = useState<Msg>(null)
  const [locked, setLocked] = useState<{ env: EncryptedEnvelope; name: string } | null>(null)
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState<{ backup: BackupFile; preview: BackupPreview; here: Awaited<ReturnType<typeof deviceSummary>> } | null>(null)
  const [confirmMerge, setConfirmMerge] = useState(false)
  const [replaceOpen, setReplaceOpen] = useState(false)
  const [understood, setUnderstood] = useState(false)
  const [typed, setTyped] = useState('')
  const [report, setReport] = useState<ImportReport | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const input = useRef<HTMLInputElement>(null)

  const reset = () => {
    setLocked(null); setPending(null); setPassword(''); setConfirmMerge(false); setReplaceOpen(false); setUnderstood(false); setTyped('')
    if (input.current) input.current.value = ''
  }
  // The password is wiped if this panel goes away.
  useEffect(() => () => setPassword(''), [])

  const show = async (b: BackupFile) => setPending({ backup: b, preview: previewBackup(b), here: await deviceSummary() })

  const pick = async (f: File | undefined) => {
    setMsg(null); setReport(null); reset()
    if (!f) return
    if (f.size > MAX_IMPORT_BYTES) return setMsg({ kind: 'error', text: 'That file is too large to be a Lift backup.' })
    let text: string
    try {
      text = await f.text()
    } catch {
      return setMsg({ kind: 'error', text: 'Could not read that file.' })
    }
    if (looksEncrypted(text)) {
      try {
        setLocked({ env: parseEnvelope(text), name: f.name })
      } catch (e) {
        setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'The encrypted file is damaged.' })
      }
      return
    }
    const parsed = parseBackup(text)
    if (!parsed.ok) return setMsg({ kind: 'error', text: parsed.error })
    await show(parsed.backup)
  }

  const unlock = async () => {
    if (!locked || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setMsg(null)
    try {
      const plain = await decryptEnvelope(locked.env, password)
      const parsed = parseBackup(plain)
      if (!parsed.ok) { setMsg({ kind: 'error', text: parsed.error }); return }
      setPassword('')
      setLocked(null)
      await show(parsed.backup)
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof CryptoError ? e.message : 'Could not open the file.' })
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const run = async (mode: 'merge' | 'replace') => {
    if (!pending || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setConfirmMerge(false)
    setReplaceOpen(false)
    try {
      const r = await importBackup(pending.backup, mode)
      setReport(r)
      setMsg({ kind: 'ok', text: mode === 'replace' ? 'Backup restored for the categories in the file.' : 'Backup merged. Nothing already on this device was overwritten.' })
      reset()
    } catch (e) {
      setMsg({ kind: 'error', text: `The import failed, so nothing was changed. (${e instanceof Error ? e.message : 'unknown error'})` })
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const p = pending?.preview
  return (
    <div>
      <div className="field">
        <label htmlFor="backup-file">Import data from a backup file</label>
        <input id="backup-file" ref={input} type="file" accept="application/json,.json" onChange={(e) => void pick(e.target.files?.[0])} />
        <p className="hint">Picking a file only shows a preview. Nothing changes until you choose Merge or Replace.</p>
      </div>

      {locked && (
        <form className="notice" onSubmit={(e) => { e.preventDefault(); void unlock() }}>
          <p><strong>This backup is password-protected.</strong></p>
          <div className="field">
            <label htmlFor="imp-pass">Password for {locked.name}</label>
            <input id="imp-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="dialog-actions">
            <Button variant="ghost" type="button" onClick={() => { reset(); setMsg(null) }}>Cancel</Button>
            <Button type="submit" disabled={busy || password.length === 0}>{busy ? 'Opening...' : 'Open file'}</Button>
          </div>
        </form>
      )}

      {pending && p && (
        <div className="notice" role="region" aria-label="Preview of the backup file">
          <p><strong>Preview of the file. Nothing has been imported yet.</strong></p>
          <ul className="plain">
            <li>Made on {p.exportedAt ? new Date(p.exportedAt).toLocaleString() : 'an unknown date'} (file format v{p.formatVersion}{p.appVersion ? `, app ${p.appVersion}` : ''})</li>
            {p.profileName && <li>Profile: {p.profileName}</li>}
            <li>Contains: {p.includes.map((c) => CATEGORY_LABEL[c]).join('; ')}</li>
            <li>In the file: {p.workouts} workouts, {p.sets} logged sets, {p.yogaSessions} yoga sessions, {p.bodyWeights} body weight entries{p.includesFood ? `, ${p.foodEntries} food entries` : ''}</li>
            {p.firstDate && <li>Workout dates: {p.firstDate} to {p.lastDate}</li>}
          </ul>
          {p.recent.length > 0 && (
            <>
              <p className="label-like">Most recent workouts in the file</p>
              <ul className="plain">{p.recent.map((r, i) => <li key={`${r.date}-${i}`}>{r.date}: {r.title}</li>)}</ul>
            </>
          )}
          <p className="hint">Already on this device: {pending.here.workouts} workouts, {pending.here.yogaSessions} yoga sessions, {pending.here.bodyWeights} body weight entries, {pending.here.foodEntries} food entries.</p>
          <p className="hint">Anything the file does not contain is left exactly as it is. Make a backup of this device first if you are unsure.</p>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => { reset(); setMsg({ kind: 'ok', text: 'Cancelled. Nothing was changed.' }) }}>Cancel</Button>
            <Button disabled={busy} onClick={() => setConfirmMerge(true)}>Merge into this device</Button>
          </div>
          <details>
            <summary>Replace instead (erases data here)</summary>
            <p className="hint">Replace erases the matching categories on this device and uses the file. Merge is almost always what you want.</p>
            <Button variant="danger" disabled={busy} onClick={() => { setUnderstood(false); setTyped(''); setReplaceOpen(true) }}>Replace this device's data...</Button>
          </details>
        </div>
      )}

      {report && (
        <div className="notice" role="status" aria-label="Import result">
          <p><strong>Import finished</strong></p>
          <ul className="plain">
            <li>Added: {report.added}</li>
            <li>Already here, kept as they were: {report.skipped}</li>
            <li>Failed: {report.failed}</li>
          </ul>
          <p className="hint">An import is all or nothing, so a failure never leaves a half-finished import.</p>
        </div>
      )}
      {msg && <p className={msg.kind === 'error' ? 'error' : 'ok'} role={msg.kind === 'error' ? 'alert' : 'status'}>{msg.text}</p>}

      {confirmMerge && (
        <Dialog title="Merge this backup?" onClose={() => setConfirmMerge(false)}>
          <p>Nothing on this device is removed or overwritten. Records from the file that are not already here (matched by their id) are added.</p>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => setConfirmMerge(false)}>Cancel</Button>
            <Button disabled={busy} onClick={() => void run('merge')}>Merge</Button>
          </div>
        </Dialog>
      )}
      {replaceOpen && (
        <Dialog title="Replace the data on this device?" onClose={() => setReplaceOpen(false)}>
          <form onSubmit={(e) => e.preventDefault()}>
            <p><strong>This erases the matching data on this device and cannot be undone.</strong> Export a backup of this device first if you might want it.</p>
            <label className="check"><input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} /><span>I understand the current data in these categories will be erased.</span></label>
            <div className="field">
              <label htmlFor="replace-phrase">Type {REPLACE_PHRASE} to continue</label>
              <input id="replace-phrase" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={typed} onChange={(e) => setTyped(e.target.value)} />
            </div>
            <div className="dialog-actions">
              <Button variant="ghost" type="button" onClick={() => setReplaceOpen(false)}>Cancel</Button>
              <Button variant="danger" type="button" disabled={busy || !understood || typed.trim() !== REPLACE_PHRASE} onClick={() => void run('replace')}>Erase and restore</Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}

export function BackupPanel() {
  return (
    <div>
      <h3 className="card-subtitle">Export</h3>
      <ExportPanel />
      <hr />
      <h3 className="card-subtitle">Import</h3>
      <ImportPanel />
    </div>
  )
}
