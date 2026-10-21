import { EmptyState, ScreenHeader } from '../components/ui'

export function Progress() {
  return (
    <>
      <ScreenHeader title="Progress" subtitle="Your training history" />
      <EmptyState
        title="Nothing to show yet"
        hint="Once you log workouts, your history and trends will appear here."
      />
    </>
  )
}
