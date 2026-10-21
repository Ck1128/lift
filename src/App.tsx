import { useEffect, useState } from 'react'
import { BottomNav, type ScreenId } from './components/BottomNav'
import { OfflineBanner, UpdateBanner } from './components/Banners'
import { useOnline, useProfile, useToday } from './hooks/app'
import { registerPwa } from './pwa'
import { Home } from './screens/Home'
import { Onboarding } from './screens/Onboarding'
import { Progress } from './screens/Progress'
import { Settings } from './screens/Settings'
import { WeeklyPlan } from './screens/WeeklyPlan'
import { Workout } from './screens/Workout'

export default function App() {
  const profile = useProfile()
  const today = useToday()
  const online = useOnline()
  const [screen, setScreen] = useState<ScreenId>('home')
  const [onboarding, setOnboarding] = useState(false)
  const [openSession, setOpenSession] = useState<string | null>(null)
  const [update, setUpdate] = useState<(() => void) | null>(null)
  const [offlineReady, setOfflineReady] = useState(false)

  useEffect(() => {
    registerPwa({ onNeedRefresh: (fn) => setUpdate(() => fn), onOfflineReady: () => setOfflineReady(true) })
  }, [])

  if (profile === undefined) return <div className="app"><main className="content"><p className="muted">Loading...</p></main></div>

  if (profile === null || onboarding) {
    return (
      <div className="app">
        <OfflineBanner online={online} />
        <main className="content">
          <Onboarding onBegin={() => setOnboarding(true)} onDone={() => { setOnboarding(false); setScreen('home') }} />
        </main>
      </div>
    )
  }

  const openFromPlan = (id: string) => { setOpenSession(id); setScreen('progress') }

  return (
    <div className="app">
      <OfflineBanner online={online} />
      {update && <UpdateBanner onUpdate={update} onDismiss={() => setUpdate(null)} />}
      {offlineReady && !update && (
        <div className="banner update" role="status">
          <span>Ready to use offline.</span>
          <button type="button" onClick={() => setOfflineReady(false)}>OK</button>
        </div>
      )}
      <main className="content">
        {screen === 'home' && <Home profile={profile} today={today} onNavigate={setScreen} />}
        {screen === 'plan' && <WeeklyPlan profile={profile} today={today} onOpenSession={openFromPlan} />}
        {screen === 'workout' && <Workout profile={profile} today={today} onNavigate={setScreen} />}
        {screen === 'progress' && <Progress profile={profile} today={today} openSessionId={openSession} onOpenSession={setOpenSession} />}
        {screen === 'settings' && <Settings profile={profile} onReset={() => { setScreen('home'); setOpenSession(null) }} />}
      </main>
      <BottomNav current={screen} onSelect={(id) => { if (id !== 'progress') setOpenSession(null); setScreen(id) }} />
    </div>
  )
}
