import { updateExclusions } from '../db/repo'
import { ALL_MUSCLES, MUSCLE_LABEL, type Profile } from '../engine/types'

/** Tap the areas that are injured or recovering. Used on Home and in Settings, so nobody has to dig for it. */
export function InjuredAreas({ profile }: { profile: Profile }) {
  const hurt = profile.injuredMuscles ?? []
  const toggle = (m: (typeof ALL_MUSCLES)[number]) => void updateExclusions({ injuredMuscles: hurt.includes(m) ? hurt.filter((x) => x !== m) : [...hurt, m] })
  return (
    <>
      <p className="hint">Marked areas recover about 50% slower, get one fewer set, and are never the first choice for Today's Call. This is a rule of thumb. For any injury, follow the advice of a qualified professional.</p>
      <div className="chips" role="group" aria-label="Injured areas">
        {ALL_MUSCLES.map((m) => (
          <button key={m} type="button" className={hurt.includes(m) ? 'chip on' : 'chip'} aria-label={`${MUSCLE_LABEL[m]}, injured area`} aria-pressed={hurt.includes(m)} onClick={() => toggle(m)}>{MUSCLE_LABEL[m]}</button>
        ))}
      </div>
    </>
  )
}
