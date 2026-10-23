import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { getSetting, SETTING } from '../db/settings'
import { Card, ScreenHeader } from '../components/ui'

const ROWS: [string, () => Promise<number>][] = [
  ['Workouts', () => db.sessions.count()], ['Sets logged', () => db.setLogs.count()], ['Yoga sessions', () => db.yogaSessions.count()],
  ['Food entries', () => db.foodLog.count()], ['Weigh-ins', () => db.bodyWeights.count()], ['Apple Health workouts', () => db.healthWorkouts.count()],
]

/** What Lift keeps, where, and the only things that can leave the phone. */
export function Privacy() {
  const counts = useLiveQuery(async () => Promise.all(ROWS.map(([, f]) => f())), [], undefined)
  const stories = useLiveQuery(() => db.settings.where('key').startsWith('story.').count(), [], 0)
  const online = useLiveQuery(() => getSetting<boolean>(SETTING.foodOnlineSearch, false), [], false)
  return (
    <>
      <ScreenHeader title="Privacy" subtitle="What Lift keeps, and where" />
      <Card title="Stored on this phone only">
        <p>There is no account and no Lift server. Everything below lives in this phone's browser storage and goes nowhere on its own.</p>
        <ul className="story-list" aria-label="What is stored">
          {ROWS.map(([label], i) => <li key={label}>{label}: <strong>{counts ? counts[i] : '…'}</strong></li>)}
          <li>Saved Body Stories: <strong>{stories}</strong></li>
        </ul>
        <p className="hint">If you delete the app's data or clear this site's data in Safari, it is gone. Make a backup in Settings to keep it.</p>
      </Card>
      <Card title="What can leave, and only when you ask">
        <ul className="story-list">
          <li><strong>Share, email, text:</strong> only the message you write or the story you choose to share, through your own apps. Lift stores no email address or phone number for you.</li>
          <li><strong>Apple Health:</strong> moves through the Shortcuts app on this phone. Lift does not contact Apple.</li>
          <li><strong>Food search:</strong> {online ? 'On. Your search words go to Open Food Facts when you search. Turn it off in Settings > Yoga and food.' : 'Off. Nothing is sent. You can switch on Open Food Facts search in Settings > Yoga and food.'}</li>
          <li><strong>Getting the app:</strong> the app's files are downloaded from GitHub Pages when you open or update it, like any website. After that it works offline, and your data is not part of that download.</li>
        </ul>
      </Card>
    </>
  )
}
