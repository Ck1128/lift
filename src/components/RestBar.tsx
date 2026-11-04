import { useNow } from '../hooks/app'
import { rest, useRest } from '../hooks/restStore'
import { formatClock, isPaused, remainingMs, type RestTimer } from '../engine/restTimer'

/** The rest timer, shown above the tab bar on every screen until the rest ends. */
export function RestBar() {
  const t = useRest()
  return t ? <Running t={t} /> : null
}

// Mounted only while a rest runs, so its clock always starts fresh.
function Running({ t }: { t: RestTimer }) {
  const now = useNow(250)
  return (
    <div className="rest-bar" role="timer" aria-label="Rest timer">
      <span>{isPaused(t) ? 'Rest paused' : 'Rest'} {formatClock(remainingMs(t, now))}</span>
      <span>
        {isPaused(t)
          ? <button type="button" onClick={rest.resume}>Resume</button>
          : <button type="button" onClick={rest.pause}>Pause</button>}
        <button type="button" onClick={() => rest.add(15)}>+15s</button>
        <button type="button" onClick={rest.skip}>Skip</button>
      </span>
    </div>
  )
}
