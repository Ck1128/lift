import { useRef, useState } from 'react'
import { backupFilename, exportBackup, importBackup, parseBackup, previewBackup, type BackupFile, type BackupPreview } from '../db/backup'
import { deliverFile } from '../export/deliver'
import { Button, ConfirmDialog } from './ui'

export function BackupPanel() {
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [pending, setPending] = useState<{ backup: BackupFile; preview: BackupPreview } | null>(null)
  const [mode, setMode] = useState<'replace' | 'merge'>('merge')
  const [confirm, setConfirm] = useState(false)
  const [includeFood, setIncludeFood] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const doExport = async () => {
    setMsg(null)
    try {
      const file = await exportBackup({ includeFood })
      const result = await deliverFile(backupFilename(), JSON.stringify(file, null, 2), 'application/json')
      setMsg(result === 'cancelled' ? { kind: 'ok', text: 'Export cancelled. Nothing was changed.' } : { kind: 'ok', text: `Backup ${result === 'shared' ? 'shared' : 'downloaded'}. Keep it somewhere private.` })
    } catch (e) {
      setMsg({ kind: 'error', text: `Could not create the backup. Your data on this phone is unchanged. (${e instanceof Error ? e.message : 'unknown error'})` })
    }
  }

  const pick = async (f: File | undefined) => {
    setMsg(null)
    setPending(null)
    if (!f) return
    if (f.size > 50 * 1024 * 1024) return setMsg({ kind: 'error', text: 'That file is too large to be a Lift backup.' })
    const parsed = parseBackup(await f.text())
    if (!parsed.ok) return setMsg({ kind: 'error', text: parsed.error })
    setPending({ backup: parsed.backup, preview: previewBackup(parsed.backup) })
  }

  const run = async () => {
    if (!pending) return
    setConfirm(false)
    try {
      await importBackup(pending.backup, mode)
      setMsg({ kind: 'ok', text: mode === 'replace' ? 'Backup restored. This phone now matches the backup.' : 'Backup merged. Existing data was kept and missing records were added.' })
      setPending(null)
      if (input.current) input.current.value = ''
    } catch (e) {
      setMsg({ kind: 'error', text: `The import failed, so nothing was changed. (${e instanceof Error ? e.message : 'unknown error'})` })
    }
  }

  return (
    <div>
      <p className="notice">A backup contains your profile, body weight and workout history. Treat it as private health information and store it somewhere safe. Never upload it to GitHub.</p>
      <label className="check">
        <input type="checkbox" checked={includeFood} onChange={(e) => setIncludeFood(e.target.checked)} />
        <span>Include my food log (off by default, because it is personal)</span>
      </label>
      <Button onClick={doExport}>Export backup</Button>
      <hr />
      <div className="field">
        <label htmlFor="backup-file">Restore from a backup file</label>
        <input id="backup-file" ref={input} type="file" accept="application/json,.json" onChange={(e) => void pick(e.target.files?.[0])} />
      </div>
      {pending && (
        <div className="notice" role="status">
          <p><strong>Backup preview</strong></p>
          <ul className="plain">
            <li>Made on {pending.preview.exportedAt ? new Date(pending.preview.exportedAt).toLocaleString() : 'unknown date'}</li>
            {pending.preview.profileName && <li>Profile: {pending.preview.profileName}</li>}
            <li>{pending.preview.workouts} workouts, {pending.preview.sets} logged sets, {pending.preview.yogaSessions} yoga sessions</li>
            <li>{pending.preview.includesFood ? `${pending.preview.foodEntries} food entries` : 'No food log in this file. The food log on this phone is left as it is.'}</li>
            {pending.preview.firstDate && <li>From {pending.preview.firstDate} to {pending.preview.lastDate}</li>}
          </ul>
          <fieldset className="field">
            <legend>How should it be restored?</legend>
            <label className="check"><input type="radio" name="mode" checked={mode === 'merge'} onChange={() => setMode('merge')} /><span><strong>Merge:</strong> keep what is on this phone and add anything missing.</span></label>
            <label className="check"><input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} /><span><strong>Replace:</strong> erase this phone's data and use the backup instead.</span></label>
          </fieldset>
          <Button variant={mode === 'replace' ? 'danger' : 'primary'} onClick={() => setConfirm(true)}>{mode === 'replace' ? 'Replace my data' : 'Merge backup'}</Button>
        </div>
      )}
      {msg && <p className={msg.kind === 'error' ? 'error' : 'ok'} role={msg.kind === 'error' ? 'alert' : 'status'}>{msg.text}</p>}
      {confirm && (
        <ConfirmDialog
          title={mode === 'replace' ? 'Replace all data?' : 'Merge this backup?'}
          message={mode === 'replace' ? 'Everything currently saved on this phone will be erased and replaced by the backup. This cannot be undone.' : 'Nothing on this phone is removed. Records from the backup that are not already here will be added.'}
          confirmLabel={mode === 'replace' ? 'Erase and restore' : 'Merge'}
          danger={mode === 'replace'}
          onCancel={() => setConfirm(false)}
          onConfirm={run}
        />
      )}
    </div>
  )
}
