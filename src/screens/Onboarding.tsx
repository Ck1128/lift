import { useState } from 'react'
import { profileToForm, saveProfile } from '../db/repo'
import { useProfile } from '../hooks/app'
import { EquipmentEditor } from '../components/EquipmentEditor'
import { ProfileFormView, type ProfileExtra } from '../components/ProfileFormView'
import { ImportPanel } from '../components/BackupPanel'
import { Button, Card, ScreenHeader } from '../components/ui'
import type { ProfileForm } from '../engine/validateProfile'
import type { GymType, LocationType } from '../engine/types'

export function Onboarding({ onBegin, onDone, deletedNotice, onDismissNotice }: { onBegin: () => void; onDone: () => void; deletedNotice?: boolean; onDismissNotice?: () => void }) {
  const [step, setStep] = useState<'profile' | 'equipment'>('profile')
  const [formStep, setFormStep] = useState(0)
  const saved = useProfile()
  const [chosen, setChosen] = useState<{ location: LocationType; gymType: GymType; unit: 'lb' | 'kg' }>({ location: 'gym', gymType: 'standard', unit: 'lb' })

  const submit = async (form: ProfileForm, extra: ProfileExtra) => {
    onBegin() // keep onboarding on screen even though a profile now exists
    await saveProfile(form, { preferredLocation: extra.preferredLocation, gymType: extra.gymType })
    setChosen({ location: extra.preferredLocation, gymType: extra.gymType, unit: form.weightUnit })
    // Equipment only matters for workouts. A yoga-only start goes straight to the app.
    if (!form.tracks.includes('workout')) { onDone(); return }
    setStep('equipment')
  }

  if (step === 'equipment') {
    return (
      <>
        <ScreenHeader title="Confirm your equipment" subtitle="Step 2 of 2" back={false} />
        <button type="button" className="back-btn" onClick={() => setStep('profile')}><span aria-hidden="true">‹</span> Back</button>
        <Card>
          <EquipmentEditor location={chosen.location} gymType={chosen.gymType} unit={chosen.unit} />
        </Card>
        <Button onClick={onDone}>Looks right, build my plan</Button>
      </>
    )
  }
  return (
    <>
      {deletedNotice && formStep === 0 && (
        <div className="notice" role="status">
          <p><strong>All data on this device was deleted.</strong> You are back at first-run setup. Start fresh below, or restore a backup at the bottom of this page.</p>
          <Button variant="small" onClick={onDismissNotice}>OK</Button>
        </div>
      )}
      {formStep === 0 && <ScreenHeader title="Welcome" subtitle="No account needed, and nothing leaves this phone." />}
      <Card className="step-card">
        <ProfileFormView
          initial={profileToForm(saved ?? undefined)}
          initialExtra={{ preferredLocation: 'gym', gymType: 'standard' }}
          showLocation
          submitLabel="Continue"
          stepped
          draftKey="profile.onboarding"
          onStepChange={setFormStep}
          onSubmit={submit}
        />
      </Card>
      {formStep === 0 && (
        <Card title="Already have a backup?">
          <ImportPanel />
        </Card>
      )}
    </>
  )
}
