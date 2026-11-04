import { useId } from 'react'

/** What the session ring shows, worked out from plain numbers so it can be tested without a screen. */
export function ringState(elapsedMs: number, plannedMinutes: number, setsDone: number, setsTotal: number) {
  const totalMs = Math.max(1, plannedMinutes) * 60_000
  const remainingMs = totalMs - elapsedMs
  return {
    /** 1 at the start, 0 when the planned time is used up. The ring closes as time passes. */
    timeLeft: Math.min(1, Math.max(0, remainingMs / totalMs)),
    over: remainingMs < 0,
    /** Seconds left, or seconds over once the plan time has passed. */
    seconds: Math.floor(Math.abs(remainingMs) / 1000),
    setsFill: setsTotal > 0 ? Math.min(1, setsDone / setsTotal) : 0,
  }
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * The workout disk. The outer ring starts full and closes as the planned time runs out. The inner ring fills as sets
 * are done. In the middle: time left, or time over once the plan has run out.
 */
export function SessionRing({
  elapsedMs, plannedMinutes, setsDone, setsTotal, paused,
}: { elapsedMs: number; plannedMinutes: number; setsDone: number; setsTotal: number; paused: boolean }) {
  const id = useId().replace(/:/g, '')
  const st = ringState(elapsedMs, plannedMinutes, setsDone, setsTotal)
  const size = 232, c = size / 2
  const r1 = 100, r2 = 78
  const circ = (r: number) => 2 * Math.PI * r
  const a1 = circ(r1), a2 = circ(r2)
  const angle = st.timeLeft * 2 * Math.PI - Math.PI / 2
  return (
    <div className={`session-ring${paused ? ' paused' : ''}${st.over ? ' over' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={setsTotal} aria-valuenow={setsDone} aria-label="Workout progress">
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--ac)" /><stop offset="1" stopColor="var(--ac-2)" /></linearGradient>
          <linearGradient id={`${id}b`} x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--ac-2)" /><stop offset="1" stopColor="var(--ac)" /></linearGradient>
          <filter id={`${id}g`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5" /></filter>
        </defs>
        <circle className="sr-track" cx={c} cy={c} r={r1} />
        <circle className="sr-track" cx={c} cy={c} r={r2} />
        {/* outer: time left. It closes clockwise from the top. */}
        <circle className="sr-glow" cx={c} cy={c} r={r1} stroke={`url(#${id}a)`} strokeDasharray={a1} strokeDashoffset={a1 * (1 - st.timeLeft)} transform={`rotate(-90 ${c} ${c})`} filter={`url(#${id}g)`} />
        <circle className="sr-arc" cx={c} cy={c} r={r1} stroke={`url(#${id}a)`} strokeDasharray={a1} strokeDashoffset={a1 * (1 - st.timeLeft)} transform={`rotate(-90 ${c} ${c})`} />
        {st.timeLeft > 0 && <circle className="sr-head" cx={c + r1 * Math.cos(angle)} cy={c + r1 * Math.sin(angle)} r="6" />}
        {/* inner: sets done. It fills. */}
        <circle className="sr-arc sr-inner" cx={c} cy={c} r={r2} stroke={`url(#${id}b)`} strokeDasharray={a2} strokeDashoffset={a2 * (1 - st.setsFill)} transform={`rotate(-90 ${c} ${c})`} />
      </svg>
      <div className="sr-center">
        <span className="sr-label">{paused ? 'Paused' : st.over ? 'Over plan' : 'Time left'}</span>
        <span className="sr-time">{st.over ? '+' : ''}{mmss(st.seconds)}</span>
        <span className="sr-sub">{setsDone} / {setsTotal} sets</span>
      </div>
    </div>
  )
}

/** A small ring for a single 0 to 1 value, for example this week's workouts. */
export function MiniRing({ value, size = 64, label, children }: { value: number; size?: number; label: string; children?: React.ReactNode }) {
  const id = useId().replace(/:/g, '')
  const r = 26, c = 32, circ = 2 * Math.PI * r
  const v = Math.min(1, Math.max(0, value))
  return (
    <div className="mini-ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--ac)" /><stop offset="1" stopColor="var(--ac-2)" /></linearGradient></defs>
        <circle className="sr-track" cx={c} cy={c} r={r} strokeWidth="7" />
        <circle className="sr-arc" cx={c} cy={c} r={r} strokeWidth="7" stroke={`url(#${id})`} strokeDasharray={circ} strokeDashoffset={circ * (1 - v)} transform={`rotate(-90 ${c} ${c})`} />
      </svg>
      <span className="mini-ring-in">{children}</span>
    </div>
  )
}
