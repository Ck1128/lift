import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { getSeen, getShareWeight, listStories, liveStory, markStorySeen, setShareWeight } from '../db/storyRepo'
import { hasActivity, storyShareText, type Story, type StoryKind } from '../engine/bodyStory'
import { Button, Card, EmptyState, ScreenHeader } from '../components/ui'
import type { Profile } from '../engine/types'

function StoryCard({ story, shareWeight }: { story: Story; shareWeight: boolean }) {
  const [note, setNote] = useState('')
  const share = async () => {
    const text = storyShareText(story, shareWeight)
    try {
      if (navigator.share) { await navigator.share({ text }); return }
      await navigator.clipboard.writeText(text)
      setNote('Copied. Paste it anywhere you like.')
    } catch { /* the share sheet was closed */ }
  }
  return (
    <Card className="story-card">
      <p className="eyebrow">{story.final ? (story.kind === 'week' ? 'Weekly Body Story' : 'Monthly Body Story') : `${story.kind === 'week' ? 'This week' : 'This month'} so far`}</p>
      <h2 className="hero-title">{story.title}</h2>
      <p className="muted">{story.headline}</p>
      <div className="story-stats">
        <div><strong>{story.workouts}</strong><span>workout{story.workouts === 1 ? '' : 's'}</span></div>
        <div><strong>{story.yogaMinutes}</strong><span>yoga min</span></div>
        <div><strong>{story.activeDays}</strong><span>active day{story.activeDays === 1 ? '' : 's'}</span></div>
      </div>
      {story.topMuscles.length > 0 && <p><strong>Most worked:</strong> {story.topMuscles.map((m) => `${m.muscle} (${m.sets} sets)`).join(', ')}</p>}
      {story.lifts.length > 0 && (
        <ul className="story-list" aria-label="Strongest lifts">
          {story.lifts.map((l) => <li key={l.name}>{l.name}: {l.weight} {l.unit} × {l.reps}{l.pr ? <span className="pr"> New best</span> : null}</li>)}
        </ul>
      )}
      {story.weight && (
        <p><strong>Body weight:</strong> {story.weight.end} {story.weight.unit}{story.weight.change !== 0 ? ` (${story.weight.change > 0 ? '+' : ''}${story.weight.change} ${story.weight.unit} from ${story.weight.start})` : ' (steady)'}</p>
      )}
      {story.highlights.some((h) => !h.startsWith('Body weight')) && (
        <ul className="story-list">{story.highlights.filter((h) => !h.startsWith('Body weight')).map((h, i) => <li key={i}>{h}</li>)}</ul>
      )}
      <Button variant="ghost" onClick={() => void share()}>Share this story</Button>
      {note && <p className="ok" role="status">{note}</p>}
    </Card>
  )
}

/** Weekly and monthly recaps, kept on this phone. A finished one is saved on Sunday and on the last day of the month. */
export function BodyStory({ profile, today }: { profile: Profile; today: string }) {
  const [kind, setKind] = useState<StoryKind>('week')
  const saved = useLiveQuery(() => listStories(), [], undefined)
  const shareWeight = useLiveQuery(() => getShareWeight(), [], true)
  const [live, setLive] = useState<Story | null>(null)
  // Recomputed when anything it reads changes.
  const stamp = useLiveQuery(async () => [await db.sessions.count(), await db.yogaSessions.count(), await db.bodyWeights.count(), await db.healthWorkouts.count(), await db.setLogs.count()].join('-'), [], '')

  useEffect(() => {
    let alive = true
    void liveStory(kind, today).then((s) => { if (alive) setLive(s) })
    return () => { alive = false }
  }, [kind, today, stamp, profile.weightUnit])

  const mine = (saved ?? []).filter((s) => s.kind === kind)
  // Opening this page marks the saved stories as seen.
  useEffect(() => {
    void (async () => {
      const seen = await getSeen()
      for (const s of saved ?? []) if (!seen.includes(s.id)) await markStorySeen(s.id)
    })()
  }, [saved])

  return (
    <>
      <ScreenHeader title="Body Story" subtitle="Your week and month, in plain words" />
      <div className="seg seg-wide" role="group" aria-label="Story length">
        <button type="button" aria-pressed={kind === 'week'} onClick={() => setKind('week')}>Weekly</button>
        <button type="button" aria-pressed={kind === 'month'} onClick={() => setKind('month')}>Monthly</button>
      </div>
      <label className="check-row">
        <input type="checkbox" checked={shareWeight} onChange={(e) => void setShareWeight(e.target.checked)} />
        <span>Include body weight when I share a story</span>
      </label>

      {live && hasActivity(live) ? <StoryCard story={live} shareWeight={shareWeight} /> : (
        <EmptyState title={`Nothing yet ${kind === 'week' ? 'this week' : 'this month'}`} hint="Finish a workout or a yoga session, or log your weight, and it shows up here." />
      )}

      <h2 className="section-label">Past {kind === 'week' ? 'weeks' : 'months'}</h2>
      {saved === undefined ? null : mine.length === 0 ? (
        <p className="muted">Finished stories appear here. A weekly one is saved each Sunday and a monthly one on the last day of the month, the next time you open Lift.</p>
      ) : mine.slice(0, 24).map((s) => <StoryCard key={s.id} story={s} shareWeight={shareWeight} />)}
      <p className="hint">Stories are built on this phone from your own log. Nothing is uploaded.</p>
    </>
  )
}
