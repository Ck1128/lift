import { useProfile } from '../hooks/app'
import { useT } from '../i18n'
import { tracksOf } from '../engine/tracks'
import { useRouter } from '../router'

export type ScreenId = 'home' | 'plan' | 'workout' | 'yoga' | 'food' | 'activity' | 'progress' | 'settings'

export const SCREENS: { id: ScreenId; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'plan', label: 'Plan', icon: '📅' },
  { id: 'workout', label: 'Workout', icon: '🏋️' },
  { id: 'yoga', label: 'Yoga', icon: '🧘' },
  { id: 'food', label: 'Food', icon: '🍽️' },
  { id: 'activity', label: 'Activity', icon: '🔥' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]


/**
 * A two-tone icon set drawn for Lift: a soft outline in the text colour and one bright shape in the tab colour.
 * `line` is the outline, `spark` is the bright part (a dot, a bolt, a leaf), so every icon has the same rhythm.
 */
const ICON: Record<ScreenId, { line: string; spark: string }> = {
  home: { line: 'M4 11 12 4.500 20 11v8a1.500 1.500 0 0 1-1.500 1.500h-13A1.500 1.500 0 0 1 4 19Z', spark: 'M12 17.200a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z' },
  plan: { line: 'M5 5.500h14A1.500 1.500 0 0 1 20.500 7v12a1.500 1.500 0 0 1-1.500 1.500H5A1.500 1.500 0 0 1 3.500 19V7A1.500 1.500 0 0 1 5 5.500ZM3.500 10h17M8 3v4M16 3v4', spark: 'M15.500 16.300a1.800 1.800 0 1 0 0-3.600 1.800 1.800 0 0 0 0 3.600Z' },
  workout: { line: 'M12 3.500a8.500 8.500 0 1 0 0 17 8.500 8.500 0 0 0 0-17Z', spark: 'M13.200 7 8.800 13h3l-.9 4 4.300-6h-3Z' },
  yoga: { line: 'M5 13c3 .2 5 1.200 7 3.200 2-2 4-3 7-3.200M12 9v7.200M8.200 20.500 12 16.200l3.800 4.300', spark: 'M12 7.200a2.100 2.100 0 1 0 0-4.200 2.100 2.100 0 0 0 0 4.200Z' },
  food: { line: 'M12 3.500a8.500 8.500 0 1 0 0 17 8.500 8.500 0 0 0 0-17Z', spark: 'M8.200 15.800c0-4 2.800-6.600 7.200-7 0 4.200-2.600 7-7.200 7ZM8.200 15.800l3.800-3.800' },
  activity: { line: 'M12 3.500c.600 3.200 4.500 5 4.500 9.300a4.500 4.500 0 0 1-9 0c0-1.800.800-3 1.800-4 .200 1.300.900 2 1.700 2.300C11 8.500 10.800 6 12 3.500Z', spark: 'M12 19.300a2.200 2.200 0 0 1-2.200-2.200c0-1.300 1.200-2.300 2.200-3.500 1 1.200 2.200 2.200 2.200 3.500a2.200 2.200 0 0 1-2.200 2.200Z' },
  progress: { line: 'M20.200 12A8.200 8.200 0 1 1 12 3.800', spark: 'M8.300 12.500l2.700 2.700 4.700-5.400' },
  settings: { line: 'M4 7.500h9M18 7.500h2M4 16.500h2M11 16.500h9', spark: 'M15.500 9.800a2.300 2.300 0 1 0 0-4.600 2.300 2.300 0 0 0 0 4.600ZM8.500 18.800a2.300 2.300 0 1 0 0-4.600 2.300 2.300 0 0 0 0 4.600Z' },
}
function Icon({ id }: { id: ScreenId }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" width="26" height="26" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path className="i-line" d={ICON[id].line} stroke="currentColor" />
      <path className="i-spark" d={ICON[id].spark} />
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
  const t = useT()
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
          <span>{t(s.label)}</span>
        </button>
      ))}
    </nav>
  )
}
