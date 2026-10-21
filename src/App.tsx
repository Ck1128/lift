import { useState } from 'react'
import { BottomNav, type ScreenId } from './components/BottomNav'
import { Home } from './screens/Home'
import { WeeklyPlan } from './screens/WeeklyPlan'
import { Workout } from './screens/Workout'
import { Progress } from './screens/Progress'
import { Settings } from './screens/Settings'

export default function App() {
  const [screen, setScreen] = useState<ScreenId>('home')

  return (
    <div className="app">
      <main className="content">
        {screen === 'home' && <Home onNavigate={setScreen} />}
        {screen === 'plan' && <WeeklyPlan />}
        {screen === 'workout' && <Workout />}
        {screen === 'progress' && <Progress />}
        {screen === 'settings' && <Settings />}
      </main>
      <BottomNav current={screen} onSelect={setScreen} />
    </div>
  )
}
