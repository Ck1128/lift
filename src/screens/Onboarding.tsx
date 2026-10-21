import { useState } from 'react'
import { profileToForm, saveProfile } from '../db/repo'
import { EquipmentEditor } from '../components/EquipmentEditor'
import { ProfileFormView, type ProfileExtra } from '../components/ProfileFormView'
import { ImportPanel } from '../components/BackupPanel'
import { Button, Card, ScreenHeader } from '../components/ui'
import type { ProfileForm } from '../engine/validateProfile'
import type { GymType, LocationType } from '../engine/types'

export function Onboarding({ onBegin, onDone, deletedNotice, onDismissNotice }: { onBegin: () => void; onDone: () => void; deletedNotice?: boolean; onDismissNotice?: () => void }) {
  const [step, setStep] = useState<'profile' | 'equipment'>('profile')
  const [chosen, setChosen] = useState<{ location: LocationType; gymType: GymType; unit: 'lb' | 'kg' }>({ location: 'gym', gymType: 'planet_fitness', unit: 'lb' })

  const submit = async (form: ProfileForm, extra: ProfileExtra) => {
    onBegin() // keep onboarding on screen even though a profile now exists
    await saveProfile(form, { preferredLocation: extra.preferredLocation, gymType: extra.gymType })
    setChosen({ location: extra.preferredLocation, gymType: extra.gymType, unit: form.weightUnit })
    setStep('equipment')
  }

  if (step === 'equipment') {
    return (
      <>
        <ScreenHeader title="Confirm your equipment" subtitle="Step 2 of 2" />
        <Card>
          <EquipmentEditor location={chosen.location} gymType={chosen.gymType} unit={chosen.unit} />
        </Card>
        <Button onClick={onDone}>Looks right, build my plan</Button>
      </>
    )
  }
  return (
    <>
      {deletedNotice && (
        <div className="notice" role="status">
          <p><strong>All data on this device was deleted.</strong> You are back at first-run setup. Start fresh below, or restore a backup at the bottom of this page.</p>
          <Button variant="small" onClick={onDismissNotice}>OK</Button>
        </div>
      )}
      <ScreenHeader title="Welcome" subtitle="Step 1 of 2. A few questions so your workouts fit you. No account needed, and nothing leaves this phone." />
      <Card>
        <ProfileFormView
          initial={profileToForm()}
          initialExtra={{ preferredLocation: 'gym', gymType: 'planet_fitness' }}
          showLocation
          submitLabel="Continue"
          onSubmit={submit}
        />
      </Card>
      <Card title="Already have a backup?">
        <ImportPanel />
      </Card>
    </>
  )
}
