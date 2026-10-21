export type ScreenId = 'home' | 'plan' | 'workout' | 'progress' | 'settings'

export const SCREENS: { id: ScreenId; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'plan', label: 'Plan', icon: '📅' },
  { id: 'workout', label: 'Workout', icon: '🏋️' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export function BottomNav({
  current,
  onSelect,
}: {
  current: ScreenId
  onSelect: (id: ScreenId) => void
}) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {SCREENS.map((s) => (
        <button
          key={s.id}
          type="button"
          className={current === s.id ? 'nav-item on' : 'nav-item'}
          aria-current={current === s.id ? 'page' : undefined}
          onClick={() => onSelect(s.id)}
        >
          <span aria-hidden="true">{s.icon}</span>
          <span>{s.label}</span>
        </button>
      ))}
    </nav>
  )
}
