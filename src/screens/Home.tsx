import { useState } from 'react'
import { Button, Card, MockBadge, ScreenHeader } from '../components/ui'
import { DURATION_OPTIONS, MOCK_WEEK } from '../data/mock'
import type { ScreenId } from '../components/BottomNav'

export function Home({ onNavigate }: { onNavigate: (id: ScreenId) => void }) {
  const [minutes, setMinutes] = useState<number>(45)
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const sample = MOCK_WEEK[0]

  return (
    <>
      <ScreenHeader title="Today" subtitle={today} />
      <Card title="Today's focus">
        <MockBadge />
        <p className="big">{sample.focus}</p>
        <p className="muted">{sample.muscles.join(' · ')}</p>
      </Card>
      <Card title="How much time do you have?">
        <div role="group" aria-label="Available minutes" className="chips">
          {DURATION_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              className={minutes === m ? 'chip on' : 'chip'}
              aria-pressed={minutes === m}
              onClick={() => setMinutes(m)}
            >
              {m} min
            </button>
          ))}
        </div>
        <Button onClick={() => onNavigate('workout')}>View workout ({minutes} min)</Button>
      </Card>
      <Card title="Recent progress">
        <p className="muted">No workouts logged yet. Progress will appear here once logging exists.</p>
      </Card>
    </>
  )
}
