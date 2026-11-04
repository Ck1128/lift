import { useEffect, useMemo, useState } from 'react'
import { exerciseById, imageUrls } from '../data/catalog'

/**
 * Two-frame "clip": flips between the start and end photos every second.
 * Photos come from the public-domain free-exercise-db and are cached by the service worker after first view.
 * If a photo cannot load (offline and not cached yet) the text instructions are still shown.
 */
export function ExerciseMedia({ exerciseId }: { exerciseId: string }) {
  const ex = exerciseById(exerciseId)
  const [frame, setFrame] = useState(0)
  const [failed, setFailed] = useState(false)
  // The pair of photos must keep the same identity between renders. The workout screen re-renders four times a second,
  // and a new array each time restarted the one second timer before it could ever fire, so the clip never moved.
  const urls = useMemo(() => (ex ? imageUrls(ex) : null), [ex])
  const playing = urls !== null && !failed
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [playing])
  if (!ex) return null
  const q = encodeURIComponent(`${ex.name} proper form`)
  return (
    <div className="media">
      {urls && !failed && (
        <img
          className="media-img"
          src={urls[frame]}
          alt={`${ex.name}: ${frame === 0 ? 'start' : 'end'} position`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
      {urls && failed && <p className="muted">Photos load when you are online. The steps below still work offline.</p>}
      <ol className="steps">
        {ex.instructions.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      <a className="link" href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noreferrer">
        Watch form video (opens YouTube)
      </a>
    </div>
  )
}
