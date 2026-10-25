import { useState } from 'react'
import { embedUrl, searchUrl, videoFor, watchUrl } from '../data/yogaMedia'
import type { Position } from '../data/yoga'

/** Mistakes that apply to most poses in a body position. These are general, not pose-specific claims. */
const MISTAKES: Record<Position, string[]> = {
  standing: ['Locking the knees straight. Keep a soft bend.', 'Holding your breath. Keep breathing slowly through the nose.', 'Leaning on one hip. Spread weight across both feet.'],
  seated: ['Rounding the lower back. Sit on a folded blanket if your knees are above your hips.', 'Pulling the shoulders up to the ears.', 'Forcing the knees down. Let them rest where they are.'],
  supine: ['Letting the lower back arch off the floor in leg work. Bend the knees if it does.', 'Straining the neck. Rest the head on a folded blanket if it tips back.'],
  prone: ['Pushing the chest up with the arms instead of the back. Keep the lift small.', 'Crunching the back of the neck. Look at the floor.'],
  kneeling: ['Sitting on sore knees. Add a blanket under the knees or between calves and thighs.', 'Sinking into the shoulders in weight-bearing poses.'],
  allfours: ['Dumping weight into the wrists. Spread the fingers and press through the whole hand.', 'Letting the belly sag. Gently draw it in.'],
  chair: ['Perching on the edge so the feet slip. Plant both feet flat.', 'Slumping the chest. Lengthen the spine first.'],
  side: ['Collapsing into the bottom shoulder. Keep it away from the ear.', 'Twisting from the neck. Turn from the ribs.'],
}
export const mistakesFor = (position: Position): string[] => MISTAKES[position] ?? []

export interface PoseHelpInput {
  id: string
  name: string
  sanskrit?: string
  position: Position
  instructions: string[]
  cautions: string[]
  modifications: string[]
}

/**
 * How-to panel for one pose. Order: safety first, then steps, then the reference video.
 * Nothing is fetched from the network until the person taps "Play video", so it works offline and
 * stays out of the way on a slow connection. There is no autoplay, so reduced-motion needs no special case.
 */
export function YogaPoseHelp({ pose }: { pose: PoseHelpInput }) {
  const video = videoFor(pose.id)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const mistakes = mistakesFor(pose.position)
  const online = typeof navigator === 'undefined' ? true : navigator.onLine

  return (
    <div className="pose-help">
      {pose.cautions.length > 0 && (
        <div className="notice" role="note">
          <strong>Safety:</strong> {pose.cautions.join(' ')} Stop if you feel sharp pain, dizziness or numbness.
        </div>
      )}
      <ol className="steps">{pose.instructions.map((x, k) => <li key={k}>{x}</li>)}</ol>
      {pose.modifications.length > 0 && (
        <>
          <p className="label-like">Easier options</p>
          <ul className="steps">{pose.modifications.map((x, k) => <li key={k}>{x}</li>)}</ul>
        </>
      )}
      {mistakes.length > 0 && (
        <details>
          <summary className="muted">Common mistakes</summary>
          <ul className="steps">{mistakes.map((x, k) => <li key={k}>{x}</li>)}</ul>
        </details>
      )}

      {video ? (
        <div className="video-box">
          {!playing && !failed && (
            <button type="button" className="video-play" onClick={() => setPlaying(true)} disabled={!online} aria-label={`Play video: ${video.title}`}>
              <span aria-hidden="true">▶</span> {online ? 'Play video' : 'Video needs internet'}
            </button>
          )}
          {playing && !failed && (
            <iframe
              className="video-frame"
              src={embedUrl(video)}
              title={`${pose.name}: ${video.title}`}
              loading="lazy"
              allow="encrypted-media; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              onError={() => setFailed(true)}
            />
          )}
          {failed && <p className="muted">The video could not load. The steps above still work.</p>}
          <p className="hint">Reference video: {video.title}, by {video.channel}. Checked {video.verifiedOn}. Plays from YouTube, which can see that you opened it. <a className="link" href={watchUrl(video)} target="_blank" rel="noreferrer noopener">Open on YouTube</a></p>
        </div>
      ) : (
        <p className="hint">
          No checked video for this pose yet. <a className="link" href={searchUrl(pose.name, pose.sanskrit)} target="_blank" rel="noreferrer noopener">Search YouTube for this pose</a> (opens a search page; results are not reviewed by this app).
        </p>
      )}
    </div>
  )
}
