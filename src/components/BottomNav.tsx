import { useProfile } from '../hooks/app'
import { tracksOf } from '../engine/tracks'
import { useRouter } from '../router'

export type ScreenId = 'home' | 'plan' | 'workout' | 'food' | 'progress' | 'settings'

export const SCREENS: { id: ScreenId; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'plan', label: 'Plan', icon: '📅' },
  { id: 'workout', label: 'Workout', icon: '🏋️' },
  { id: 'food', label: 'Food', icon: '🍽️' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

/** The tab a path belongs to, so a sub-page keeps its tab highlighted. */
export function tabOf(path: string): ScreenId {
  const p = path.split('?')[0]
  if (p.startsWith('/yoga')) return 'home'
  if (p.startsWith('/session')) return 'progress'
  const first = p.split('/')[1] as ScreenId
  return SCREENS.some((s) => s.id === first) ? first : 'home'
}

export function BottomNav() {
  const { path, navigate } = useRouter()
  const current = tabOf(path)
  const profile = useProfile()
  const workout = tracksOf(profile).workout
  // Plan and Workout only make sense when Workout is on. Their history stays in Progress.
  const screens = SCREENS.filter((s) => workout || (s.id !== 'plan' && s.id !== 'workout'))
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {screens.map((s) => (
        <button
          key={s.id}
          type="button"
          className={current === s.id ? 'nav-item on' : 'nav-item'}
          aria-current={current === s.id ? 'page' : undefined}
          onClick={() => navigate(`/${s.id}`)}
        >
          <span aria-hidden="true">{s.icon}</span>
          <span>{s.label}</span>
        </button>
      ))}
    </nav>
  )
}
