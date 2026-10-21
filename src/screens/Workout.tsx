import { Card, EmptyState, MockBadge, ScreenHeader } from '../components/ui'
import { MOCK_WORKOUT } from '../data/mock'

export function Workout() {
  return (
    <>
      <ScreenHeader title="Workout" subtitle="Workout generation is not built yet" />
      <MockBadge />
      {MOCK_WORKOUT.map((e) => (
        <Card key={e.id} title={e.name}>
          <p className="muted">
            {e.sets} sets × {e.reps} reps · {e.equipment}
          </p>
        </Card>
      ))}
      <EmptyState
        title="Set logging comes later"
        hint="This screen only shows placeholder exercises for now."
      />
    </>
  )
}
