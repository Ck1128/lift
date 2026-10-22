import { useEffect, useLayoutEffect, useState } from 'react'
import { BottomNav, tabOf } from './components/BottomNav'
import { FeedbackHost } from './components/Feedback'
import { DbGate } from './components/DbGate'
import { OfflineBanner, UpdateBanner } from './components/Banners'
import { ConfirmDialog } from './components/ui'
import { useOnline, useProfile, useToday } from './hooks/app'
import { registerPwa } from './pwa'
import { matchPath, RouterProvider, useRouter } from './router'
import type { Profile } from './engine/types'
import { Home } from './screens/Home'
import { Onboarding } from './screens/Onboarding'
import { Progress } from './screens/Progress'
import { Settings } from './screens/Settings'
import { WeeklyPlan } from './screens/WeeklyPlan'
import { Workout } from './screens/Workout'
import { SessionPage } from './screens/SessionDetail'
import { Food } from './screens/Food'
import { FoodEntry } from './screens/FoodEntry'
import { Yoga } from './screens/Yoga'
import { YogaSessionPage } from './screens/YogaSession'

function Routes({ profile, today, onReset }: { profile: Profile; today: string; onReset: () => void }) {
  const { path } = useRouter()
  const p = path.split('?')[0]
  const session = matchPath('/session/:id', p)
  if (session) return <SessionPage sessionId={session.id} profile={profile} today={today} />
  const yogaSession = matchPath('/yoga/session/:id', p)
  if (yogaSession) return <YogaSessionPage sessionId={yogaSession.id} profile={profile} today={today} />
  if (p === '/yoga') return <Yoga profile={profile} today={today} />
  const editFood = matchPath('/food/edit/:id', p)
  if (editFood) return <FoodEntry profile={profile} today={today} editId={editFood.id} />
  if (p === '/food/add') return <FoodEntry profile={profile} today={today} />
  if (p === '/food') return <Food profile={profile} today={today} />
  if (p === '/plan') return <WeeklyPlan profile={profile} today={today} />
  if (p === '/workout') return <Workout profile={profile} today={today} />
  if (p === '/progress') return <Progress profile={profile} today={today} />
  if (p === '/settings') return <Settings profile={profile} onReset={onReset} />
  return <Home profile={profile} today={today} />
}

function Shell() {
  const profile = useProfile()
  const today = useToday()
  const online = useOnline()
  const { navigate, replace, path } = useRouter()
  // A new screen starts at the top, never where the last one was scrolled to.
  useLayoutEffect(() => { document.documentElement.scrollTop = 0; document.body.scrollTop = 0 }, [path])
  // Each tab has its own colour mood; the root attribute also tints overscroll and the status bar.
  const tab = tabOf(path)
  useEffect(() => {
    document.documentElement.dataset.tab = tab
    const hue = getComputedStyle(document.documentElement).getPropertyValue('--bar').trim()
    if (hue) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', hue)
  }, [tab])
  const [onboarding, setOnboarding] = useState(false)
  const [deletedNotice, setDeletedNotice] = useState(false)
  const [update, setUpdate] = useState<(() => void) | null>(null)
  const [offlineReady, setOfflineReady] = useState(false)

  useEffect(() => {
    registerPwa({ onNeedRefresh: (fn) => setUpdate(() => fn), onOfflineReady: () => setOfflineReady(true) })
  }, [])
  // The offline note is a passing toast, not a bar that waits to be dismissed.
  useEffect(() => {
    if (!offlineReady) return
    const t = setTimeout(() => setOfflineReady(false), 3500)
    return () => clearTimeout(t)
  }, [offlineReady])

  if (profile === undefined) return <div className="app"><main className="content"><p className="muted">Loading...</p></main></div>

  if (profile === null || onboarding) {
    return (
      <div className="app">
        <OfflineBanner online={online} />
        <main className="content">
          <Onboarding deletedNotice={deletedNotice} onDismissNotice={() => setDeletedNotice(false)} onBegin={() => setOnboarding(true)} onDone={() => { setOnboarding(false); replace('/home') }} />
        </main>
      </div>
    )
  }

  return (
    <div className="app" data-tab={tab}>
      <OfflineBanner online={online} />
      {update && <UpdateBanner onUpdate={update} onDismiss={() => setUpdate(null)} />}
      {offlineReady && !update && <div className="toast" role="status">Ready to use offline</div>}
      <FeedbackHost path={path}>
        <main className="content" key={tab}>
          <Routes profile={profile} today={today} onReset={() => { setDeletedNotice(true); navigate('/home') }} />
        </main>
      </FeedbackHost>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <RouterProvider
      confirmLeave={({ stay, leave }) => (
        <ConfirmDialog
          title="Leave without saving?"
          message="You have changes on this page that are not saved. If you leave now they will be lost."
          confirmLabel="Leave"
          danger
          onCancel={stay}
          onConfirm={leave}
        />
      )}
    >
      <DbGate>
        <Shell />
      </DbGate>
    </RouterProvider>
  )
}
