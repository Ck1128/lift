import { useProfile } from '../hooks/app'
import { tracksOf } from '../engine/tracks'
import { useRouter } from '../router'

export type ScreenId = 'home' | 'plan' | 'workout' | 'yoga' | 'food' | 'progress' | 'settings'

export const SCREENS: { id: ScreenId; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'plan', label: 'Plan', icon: '📅' },
  { id: 'workout', label: 'Workout', icon: '🏋️' },
  { id: 'yoga', label: 'Yoga', icon: '🧘' },
  { id: 'food', label: 'Food', icon: '🍽️' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]


const ICON: Record<ScreenId, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h4.5v-5.5h4v5.5h4.5V10',
  plan: 'M4 6.5h16v13H4zM4 10.5h16M8.5 3.5v5M15.5 3.5v5',
  workout: 'M2.5 9.5v5M5.5 7v10M18.5 7v10M21.5 9.5v5M5.5 12h13',
  yoga: 'M12 21c-4.5-1.5-7-5-7-9.5 3 .2 5.5 1.7 7 4.2 1.5-2.5 4-4 7-4.2 0 4.5-2.5 8-7 9.5ZM12 15.7C10.7 11.5 11 8 12 4c1 4 1.3 7.500 0 11.700Z',
  food: 'M7 3v8M4.5 3v5.500a2.500 2.500 0 0 0 5 0V3M7 11v10M16.500 21V3c-2.500 1.500-3.500 4.500-3.500 8h3.500',
  progress: 'M4 19.500h16M5.500 15l4-4.500 3.500 3L19 6.500M15 6.500h4V10.500',
  settings: 'M4 7h10M18 7h2M4 17h2M10 17h10M16 4.500v5M8 14.500v5',
}
function Icon({ id }: { id: ScreenId }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON[id]} />
    </svg>
  )
}

/** The tab a path belongs to, so a sub-page keeps its tab highlighted. */
export function tabOf(path: string): ScreenId {
  const p = path.split('?')[0]
    if (p.startsWith('/session')) return 'progress'
  if (p === '/privacy') return 'settings'
  const first = p.split('/')[1] as ScreenId
  return SCREENS.some((s) => s.id === first) ? first : 'home'
}

export function BottomNav() {
  const { path, navigate } = useRouter()
  const current = tabOf(path)
  const profile = useProfile()
  const { workout, yoga } = tracksOf(profile)
  // Plan and Workout only make sense when Workout is on. Their history stays in Progress.
  const screens = SCREENS.filter((s) => (workout || (s.id !== 'plan' && s.id !== 'workout')) && (yoga || s.id !== 'yoga'))
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {screens.map((s) => (
        <button
          key={s.id}
          type="button"
          className={current === s.id ? 'nav-item on' : 'nav-item'}
          data-tab={s.id}
          aria-current={current === s.id ? 'page' : undefined}
          onClick={() => navigate(`/${s.id}`)}
        >
          <Icon id={s.id} />
          <span>{s.label}</span>
        </button>
      ))}
    </nav>
  )
}
