/**
 * After every session the app looks at how it went (effort ratings and how many sets were finished) and decides how
 * the next workout changes, muscle by muscle. Weights are handled per exercise in progression.ts; this file decides
 * how many sets each muscle gets.
 *
 *  - Very hard (effort 9 or more) or fewer than 70 percent of sets finished  -> one set fewer next time.
 *  - Easy (effort 6.5 or less) twice in a row with every set finished        -> one set more next time.
 *  - Three hard sessions in a row (effort 8.5 or more on average)            -> a lighter "deload" session.
 */
import type { Exercise, Muscle, SetLog, WorkoutSession } from './types'

export interface MuscleAdapt { delta: -1 | 0 | 1; reason: string }
export interface AdaptPlan {
  muscles?: Partial<Record<Muscle, MuscleAdapt>>
  /** A lighter week: every muscle gets one set fewer. */
  deload?: boolean
}

const counted = (s: WorkoutSession) => s.status === 'completed' || s.status === 'partial'
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

interface Stat { effort?: number; done: number; planned: number }

function sessionStats(s: WorkoutSession, logs: SetLog[], muscleOf: (id: string) => Muscle | undefined): Partial<Record<Muscle, Stat>> {
  const out: Partial<Record<Muscle, { efforts: number[]; done: number; planned: number }>> = {}
  for (const l of logs) {
    if (l.sessionId !== s.id) continue
    const m = muscleOf(l.exerciseId)
    if (!m) continue
    const e = (out[m] ??= { efforts: [], done: 0, planned: 0 })
    e.planned += 1
    if (l.completed) { e.done += 1; if (l.effortRating) e.efforts.push(l.effortRating) }
  }
  const res: Partial<Record<Muscle, Stat>> = {}
  for (const [m, v] of Object.entries(out) as [Muscle, { efforts: number[]; done: number; planned: number }][]) {
    res[m] = { effort: v.efforts.length ? avg(v.efforts) : undefined, done: v.done, planned: v.planned }
  }
  return res
}

export function buildAdaptPlan(sessions: WorkoutSession[], logs: SetLog[], muscleOf: (exerciseId: string) => Muscle | undefined): AdaptPlan {
  const recent = sessions.filter(counted).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 3)
  if (recent.length === 0) return {}
  const stats = recent.map((s) => sessionStats(s, logs, muscleOf))
  const plan: AdaptPlan = { muscles: {} }

  // A hard streak: the last three sessions were all hard overall.
  if (recent.length === 3) {
    const overall = stats.map((st) => {
      const e = Object.values(st).map((v) => v?.effort).filter((x): x is number => x !== undefined)
      return e.length ? avg(e) : 0
    })
    if (overall.every((x) => x >= 8.5)) plan.deload = true
  }

  const muscles = new Set<Muscle>(stats.flatMap((st) => Object.keys(st) as Muscle[]))
  for (const m of muscles) {
    const last = stats[0][m]
    if (!last) continue
    const ratio = last.planned > 0 ? last.done / last.planned : 1
    const prev = stats[1]?.[m]
    if ((last.effort !== undefined && last.effort >= 9) || ratio < 0.7) {
      plan.muscles![m] = { delta: -1, reason: ratio < 0.7 ? `only ${Math.round(ratio * 100)}% of the sets were finished` : `it felt very hard (effort ${last.effort!.toFixed(1)})` }
    } else if (
      last.effort !== undefined && last.effort <= 6.5 && ratio >= 0.95 &&
      prev?.effort !== undefined && prev.effort <= 6.5 && prev.planned > 0 && prev.done / prev.planned >= 0.95
    ) {
      plan.muscles![m] = { delta: 1, reason: `it felt easy twice in a row (effort ${last.effort.toFixed(1)})` }
    }
  }
  return plan
}

export function adaptDelta(plan: AdaptPlan | undefined, ex: Pick<Exercise, 'primaryMuscles'>): number {
  if (!plan) return 0
  const d = plan.muscles?.[ex.primaryMuscles[0]]?.delta ?? 0
  return d + (plan.deload ? -1 : 0)
}

const LABEL = (m: string) => m.charAt(0).toUpperCase() + m.slice(1)

/** Plain-language lines for "Why this workout". */
export function adaptNotes(plan: AdaptPlan | undefined): string[] {
  if (!plan) return []
  const out: string[] = []
  if (plan.deload) out.push('Your last three sessions were all hard, so today is a lighter session with one set fewer per exercise. Recovery is when you get stronger.')
  for (const [m, a] of Object.entries(plan.muscles ?? {}) as [Muscle, MuscleAdapt][]) {
    if (a.delta === -1) out.push(`${LABEL(m)}: one set fewer than usual, because ${a.reason} last time.`)
    if (a.delta === 1) out.push(`${LABEL(m)}: one set more than usual, because ${a.reason}.`)
  }
  return out
}
