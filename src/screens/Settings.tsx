import { useState, type ReactNode } from 'react'
import { CATALOG } from '../data/catalog'
import { profileToForm, rebuildPlan, saveProfile, setLocation, setNutritionGuidance, setYogaLevel, updateExclusions } from '../db/repo'
import { APP_VERSION, DB_SCHEMA_VERSION } from '../db/schema'
import { ExportPanel } from '../components/ExportPanel'
import { BackupPanel } from '../components/BackupPanel'
import { DeleteAllData, DELETE_CATEGORIES } from '../components/DeleteAllData'
import { EquipmentEditor } from '../components/EquipmentEditor'
import { ProfileFormView } from '../components/ProfileFormView'
import { Button, Chips, Dialog, ScreenHeader } from '../components/ui'
import { LEVEL_LABEL, type LocationType, type Pattern, type Profile, type TrainingLevel } from '../engine/types'
import { HealthPanel } from '../components/HealthPanel'
import { FeedbackButton, FeedbackForm, setFeedbackIcons, useFeedbackIcons } from '../components/Feedback'
import { SETTINGS_CATEGORIES } from '../engine/feedback'

const PATTERNS: { id: Pattern; label: string }[] = [
  { id: 'push', label: 'Pushing' }, { id: 'pull', label: 'Pulling' }, { id: 'squat', label: 'Squats' },
  { id: 'hinge', label: 'Hip hinges' }, { id: 'lunge', label: 'Lunges' }, { id: 'core', label: 'Core' }, { id: 'isolation', label: 'Single-muscle accessories' },
]

/**
 * A collapsible group. It is a native <details>, so keyboards and screen readers get the open/closed state for free.
 * It is never given an `open` attribute: every section starts closed on every load, and the open state is not saved (US-04).
 */
const ROW_ICON: Record<string, { c: string; d: string }> = {
  'Profile and goals': { c: '#e5480f', d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.500 20a7.500 7.500 0 0 1 15 0' },
  'Yoga and food': { c: '#6d4fc7', d: 'M12 21c-4.500-1.500-7-5-7-9.500 3 .2 5.500 1.700 7 4.200 1.500-2.500 4-4 7-4.200 0 4.500-2.500 8-7 9.500Z' },
  'Where you train': { c: '#0b7f8a', d: 'M12 21s-6.500-5.500-6.500-11a6.500 6.500 0 0 1 13 0c0 5.500-6.500 11-6.500 11ZM12 12a2.200 2.200 0 1 0 0-4.400 2.200 2.200 0 0 0 0 4.400Z' },
  'Equipment': { c: '#d62f35', d: 'M2.500 9.500v5M5.500 7v10M18.500 7v10M21.500 9.500v5M5.500 12h13' },
  'Exercises to avoid': { c: '#b45309', d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM5.600 5.600l12.800 12.800' },
  'Weekly schedule': { c: '#2b63d9', d: 'M4 6.500h16v13H4zM4 10.500h16M8.500 3.500v5M15.500 3.500v5' },
  'Apple Health': { c: '#d6336c', d: 'M12 20s-7.500-4.500-7.500-10A4.200 4.200 0 0 1 12 7.600 4.200 4.200 0 0 1 19.500 10c0 5.500-7.500 10-7.500 10Z' },
  'Feedback and support': { c: '#25813a', d: 'M20 12a7.500 7.500 0 0 1-10.800 6.700L4 20l1.400-4.300A7.500 7.500 0 1 1 20 12Z' },
  'Help': { c: '#566073', d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.500 9.500a2.500 2.500 0 1 1 3.500 2.300c-.7.400-1 .9-1 1.700M12 16.800v.01' },
  'Export your data': { c: '#2b63d9', d: 'M12 15V4M8 8l4-4 4 4M5 14v5.500h14V14' },
  'Backup and restore': { c: '#0b7f8a', d: 'M4 7h16v4H4zM5.500 11v8h13v-8M10 15h4' },
  'Delete all data on this device': { c: '#d92d20', d: 'M5 7h14M10 7V4.500h4V7M7 7l1 13h8l1-13' },
  'About and privacy': { c: '#566073', d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v6M12 7.500v.01' },
}
function Section({ title, children, danger }: { title: string; children: ReactNode; danger?: boolean }) {
  const ic = ROW_ICON[title]
  return (
    <details className={`card section${danger ? ' danger-zone' : ''}`}>
      <summary className="section-head">
        {ic && <span className="row-icon" style={{ background: ic.c }} aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={ic.d} /></svg></span>}
        <span className="card-title">{title}</span><span className="chev" aria-hidden="true" />
      </summary>
      <div className="section-body"><div className="section-fb"><FeedbackButton component={title} /></div>{children}</div>
    </details>
  )
}

export function Settings({ profile, today, onReset }: { profile: Profile; today: string; onReset: () => void }) {
  const [editLocation, setEditLocation] = useState<LocationType>(profile.preferredLocation)
  const [search, setSearch] = useState('')
  const [note, setNote] = useState(profile.limitationNote ?? '')
  const [levelAsk, setLevelAsk] = useState<{ proceed: (m: 'update' | 'keep') => void } | null>(null)

  const matches = search.trim().length < 2 ? [] : CATALOG.filter((e) => e.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 25)
  const excluded = profile.excludedExerciseIds
  const toggleEx = (id: string) =>
    updateExclusions({ excludedExerciseIds: excluded.includes(id) ? excluded.filter((x) => x !== id) : [...excluded, id] })
  const togglePattern = (p: Pattern) =>
    updateExclusions({ excludedPatterns: profile.excludedPatterns.includes(p) ? profile.excludedPatterns.filter((x) => x !== p) : [...profile.excludedPatterns, p] })

  return (
    <>
      <ScreenHeader title="Settings" subtitle="Profile, equipment, backup" />

      <div className="group">
      <Section title="Profile and goals">
        <div>
          <ProfileFormView
            initial={profileToForm(profile)}
            initialExtra={{ preferredLocation: profile.preferredLocation, gymType: profile.gymType }}
            showLocation={false}
            submitLabel="Save profile"
            onLevelChange={(_from, _to, proceed) => setLevelAsk({ proceed })}
            onSubmit={async (form, _extra, opts) => { await saveProfile(form, { preferredLocation: profile.preferredLocation, gymType: profile.gymType }, new Date(), { levelChange: opts?.levelChange }) }}
          />
        </div>
      </Section>

      <Section title="Yoga and food">
        <div className="field">
          <label htmlFor="yoga-level">Yoga level</label>
          <select id="yoga-level" value={profile.yogaLevel ?? ''} onChange={(e) => void setYogaLevel(e.target.value as TrainingLevel)}>
            <option value="" disabled>Choose when you plan your first yoga session</option>
            {(['beginner', 'intermediate', 'regular'] as const).map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
          </select>
          <p className="hint">Separate from your lifting level. A beginner lifter can be an experienced yogi.</p>
        </div>
        <label className="check">
          <input type="checkbox" checked={profile.nutritionGuidance} onChange={(e) => void setNutritionGuidance(e.target.checked)} />
          <span>Show gentle next-day food guidance after I log food</span>
        </label>
        <p className="hint">Optional and off by default. It is never a diet plan and never tells you to make up for what you ate.</p>
      </Section>

      <Section title="Where you train">
        <Chips label="Training location" options={['gym', 'home'] as const} value={profile.preferredLocation} onChange={(v) => { void setLocation(v); setEditLocation(v) }} format={(v) => (v === 'gym' ? 'Gym' : 'Home')} />
        {profile.preferredLocation === 'gym' && (
          <Chips label="Which gym" options={['planet_fitness', 'generic'] as const} value={profile.gymType} onChange={(v) => void setLocation('gym', v)} format={(v) => (v === 'planet_fitness' ? 'Planet Fitness' : 'Another gym')} />
        )}
        <p className="hint">Home and gym each keep their own equipment list.</p>
      </Section>

      <Section title="Equipment">
        <Chips label="Which list to edit" options={['gym', 'home'] as const} value={editLocation} onChange={setEditLocation} format={(v) => (v === 'gym' ? 'Gym list' : 'Home list')} />
        <EquipmentEditor location={editLocation} gymType={profile.gymType} unit={profile.weightUnit} />
      </Section>

      <Section title="Exercises to avoid">
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
      </Section>

      <Section title="Weekly schedule">
        <p className="hint">Training days are set in your profile above. If your plan looks out of date, rebuild it. Finished and skipped days are never changed.</p>
        <Button variant="ghost" onClick={() => void rebuildPlan(profile)}>Rebuild upcoming plan</Button>
      </Section>

      <Section title="Apple Health">
        <HealthPanel profile={profile} today={today} />
      </Section>

      <Section title="Feedback and support">
        <FeedbackIconsToggle />
        <FeedbackForm context={{ screen: 'Settings', component: 'Feedback and support' }} categories={SETTINGS_CATEGORIES} />
      </Section>

      <Section title="Help">
        <ul className="list-tight">
          <li><strong>Back:</strong> use the Back button at the top of any screen. Unsaved changes ask before you leave.</li>
          <li><strong>Units:</strong> pick kg or lb at the top of a page; change one field with the selector beside it.</li>
          <li><strong>Finish a workout:</strong> use Finish at the top or bottom. You can reopen it later to edit sets.</li>
          <li><strong>Reset a day:</strong> from the day's page. It asks three separate times.</li>
          <li><strong>Food and yoga:</strong> general wellness guidance, not medical advice. Online food search is off unless you turn it on.</li>
          <li><strong>Export:</strong> Settings, then Export your data, for CSV or JSON.</li>
        </ul>
      </Section>
      <Section title="Export your data">
        <ExportPanel profile={profile} />
      </Section>

      <Section title="Backup and restore"><BackupPanel /></Section>

      </div>

      <div className="group">
      <Section title="Delete all data on this device" danger>
        <p className="hint">Permanently removes everything the app saved on this device. It asks three different questions first. Make a backup first if you might want it.</p>
        <ul className="plain hint">{DELETE_CATEGORIES.map((c) => <li key={c}>{c}</li>)}</ul>
        <DeleteAllData onDeleted={onReset} />
      </Section>

      <Section title="About and privacy">
        <p className="muted">Lift version {APP_VERSION} · database v{DB_SCHEMA_VERSION}</p>
        <p className="hint">Your data is stored only on this phone, in the browser's local database. There is no account and no server. If you clear Safari's website data or delete the app, it is gone, so export a backup now and then.</p>
        <p className="hint">Exercise names, steps and photos come from the public-domain free-exercise-db project. Time, weight and calorie figures are estimates.</p>
      </Section>
      </div>

      {levelAsk && (
        <Dialog title="Training level changed" onClose={() => setLevelAsk(null)}>
          <p>What should happen to workouts that are already planned?</p>
          <p className="hint">Workouts you already did are never changed.</p>
          <div className="stack">
            <Button onClick={() => { const a = levelAsk; setLevelAsk(null); a.proceed('update') }}>Rebuild upcoming workouts for the new level</Button>
            <Button variant="ghost" onClick={() => { const a = levelAsk; setLevelAsk(null); a.proceed('keep') }}>Keep upcoming workouts as they are</Button>
            <Button variant="ghost" onClick={() => setLevelAsk(null)}>Cancel, do not save</Button>
          </div>
        </Dialog>
      )}

    </>
  )
}

function FeedbackIconsToggle() {
  const on = useFeedbackIcons()
  return (
    <label className="check">
      <input type="checkbox" checked={on} onChange={(e) => setFeedbackIcons(e.target.checked)} />
      <span>Show the small F feedback buttons next to screens and cards (this device only)</span>
    </label>
  )
}
