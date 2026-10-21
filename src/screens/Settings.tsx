import { useState } from 'react'
import { CATALOG } from '../data/catalog'
import { profileToForm, rebuildPlan, resetAllData, saveProfile, setLocation, updateExclusions } from '../db/repo'
import { APP_VERSION, DB_SCHEMA_VERSION } from '../db/schema'
import { BackupPanel } from '../components/BackupPanel'
import { EquipmentEditor } from '../components/EquipmentEditor'
import { ProfileFormView } from '../components/ProfileFormView'
import { Button, Card, Chips, ConfirmDialog, ScreenHeader } from '../components/ui'
import type { LocationType, Pattern, Profile } from '../engine/types'

const PATTERNS: { id: Pattern; label: string }[] = [
  { id: 'push', label: 'Pushing' }, { id: 'pull', label: 'Pulling' }, { id: 'squat', label: 'Squats' },
  { id: 'hinge', label: 'Hip hinges' }, { id: 'lunge', label: 'Lunges' }, { id: 'core', label: 'Core' }, { id: 'isolation', label: 'Single-muscle accessories' },
]

export function Settings({ profile, onReset }: { profile: Profile; onReset: () => void }) {
  const [editLocation, setEditLocation] = useState<LocationType>(profile.preferredLocation)
  const [search, setSearch] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [note, setNote] = useState(profile.limitationNote ?? '')

  const matches = search.trim().length < 2 ? [] : CATALOG.filter((e) => e.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 25)
  const excluded = profile.excludedExerciseIds
  const toggleEx = (id: string) =>
    updateExclusions({ excludedExerciseIds: excluded.includes(id) ? excluded.filter((x) => x !== id) : [...excluded, id] })
  const togglePattern = (p: Pattern) =>
    updateExclusions({ excludedPatterns: profile.excludedPatterns.includes(p) ? profile.excludedPatterns.filter((x) => x !== p) : [...profile.excludedPatterns, p] })

  return (
    <>
      <ScreenHeader title="Settings" subtitle="Profile, equipment, backup" />

      <Card title="Profile and goals">
        <details open>
          <summary>Edit profile, training days and units</summary>
          <ProfileFormView
            initial={profileToForm(profile)}
            initialExtra={{ preferredLocation: profile.preferredLocation, gymType: profile.gymType }}
            showLocation={false}
            submitLabel="Save profile"
            onSubmit={(form) => void saveProfile(form, { preferredLocation: profile.preferredLocation, gymType: profile.gymType })}
          />
        </details>
      </Card>

      <Card title="Where you train">
        <Chips label="Training location" options={['gym', 'home'] as const} value={profile.preferredLocation} onChange={(v) => { void setLocation(v); setEditLocation(v) }} format={(v) => (v === 'gym' ? 'Gym' : 'Home')} />
        {profile.preferredLocation === 'gym' && (
          <Chips label="Which gym" options={['planet_fitness', 'generic'] as const} value={profile.gymType} onChange={(v) => void setLocation('gym', v)} format={(v) => (v === 'planet_fitness' ? 'Planet Fitness' : 'Another gym')} />
        )}
        <p className="hint">Home and gym each keep their own equipment list.</p>
      </Card>

      <Card title="Equipment">
        <Chips label="Which list to edit" options={['gym', 'home'] as const} value={editLocation} onChange={setEditLocation} format={(v) => (v === 'gym' ? 'Gym list' : 'Home list')} />
        <EquipmentEditor location={editLocation} gymType={profile.gymType} unit={profile.weightUnit} />
      </Card>

      <Card title="Exercises to avoid">
        <p className="hint">Excluded exercises and movement types are never chosen or offered as replacements. This app cannot tell you what is safe for your body. If something hurts or you have a medical concern, please talk to a qualified professional.</p>
        <p className="label-like">Movement types to avoid</p>
        <div className="chips">
          {PATTERNS.map((p) => (
            <button key={p.id} type="button" className={profile.excludedPatterns.includes(p.id) ? 'chip on' : 'chip'} aria-pressed={profile.excludedPatterns.includes(p.id)} onClick={() => void togglePattern(p.id)}>{p.label}</button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="ex-search">Find an exercise to exclude</label>
          <input id="ex-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type at least 2 letters" />
        </div>
        {matches.map((e) => (
          <label key={e.id} className="check"><input type="checkbox" checked={excluded.includes(e.id)} onChange={() => void toggleEx(e.id)} /><span>{e.name}</span></label>
        ))}
        {excluded.length > 0 && (
          <>
            <p className="label-like">Currently excluded</p>
            <ul className="plain">
              {excluded.map((id) => (
                <li key={id}>{CATALOG.find((e) => e.id === id)?.name ?? id}{' '}<button type="button" className="link-btn" onClick={() => void toggleEx(id)}>Remove</button></li>
              ))}
            </ul>
          </>
        )}
        <div className="field">
          <label htmlFor="limit-note">Private note (optional)</label>
          <textarea id="limit-note" rows={2} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} onBlur={() => void updateExclusions({ limitationNote: note.trim() || undefined })} />
          <p className="hint">Only for your own reference. The app does not use it to make medical decisions.</p>
        </div>
      </Card>

      <Card title="Weekly schedule">
        <p className="hint">Training days are set in your profile above. If your plan looks out of date, rebuild it. Finished and skipped days are never changed.</p>
        <Button variant="ghost" onClick={() => void rebuildPlan(profile)}>Rebuild upcoming plan</Button>
      </Card>

      <Card title="Backup and restore"><BackupPanel /></Card>

      <Card title="Delete my data">
        <p className="hint">Removes your profile, plans and history from this phone only.</p>
        <Button variant="danger" onClick={() => setConfirmReset(true)}>Delete all data on this phone</Button>
      </Card>

      <Card title="About and privacy">
        <p className="muted">Lift version {APP_VERSION} · database v{DB_SCHEMA_VERSION}</p>
        <p className="hint">Your data is stored only on this phone, in the browser's local database. There is no account and no server. If you clear Safari's website data or delete the app, it is gone, so export a backup now and then.</p>
        <p className="hint">Exercise names, steps and photos come from the public-domain free-exercise-db project. Time, weight and calorie figures are estimates.</p>
      </Card>

      {confirmReset && (
        <ConfirmDialog
          title="Delete all data?"
          message="This erases your profile, equipment, plans and every saved workout on this phone. It cannot be undone. Export a backup first if you might want it back."
          confirmLabel="Delete everything"
          danger
          onCancel={() => setConfirmReset(false)}
          onConfirm={async () => { setConfirmReset(false); await resetAllData(); onReset() }}
        />
      )}
    </>
  )
}
