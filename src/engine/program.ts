// Fixed programs: a numbered list of days (Day 1, Day 2 ...) done in order, not tied to weekdays.
// The next day is worked out from what was actually finished, so a rest day simply means the next day waits.
import { MUSCLE_LABEL, type GeneratedWorkout, type Muscle, type PlannedExercise, type WeightUnit } from './types'
import type { SoreMap } from './soreness'

export interface ProgramExercise {
  exerciseId: string
  /** The name shown in the program (for example "Sumo squat"), which can be friendlier than the catalog name. */
  name: string
  sets: number
  repMin: number
  repMax: number
  /** 'sec' = a timed hold; 'side' / 'leg' = reps on each side. */
  repLabel?: 'sec' | 'side' | 'leg'
  /** Uses the program's dumbbells, so the weight is filled in. */
  loaded?: boolean
  /** A different weight for this exercise, for example both dumbbells held together. */
  weight?: number
  note?: string
  rest?: number
}

export interface ProgramDay {
  title: string
  /** Minutes of warm-up before the exercises (0 or missing = none). */
  warmup?: number
  /** Easy walking (and stretching) at the end, in minutes. */
  finish?: { minutes: number; label: string }
  /** A circuit: one set of each exercise in order, `rounds` times. */
  rounds?: number
  notes?: string[]
  exercises: ProgramExercise[]
  /** A recovery day: walking and mobility only. */
  walk?: { minutes: number; label: string; cue?: string }
  /** Minutes of stretching and mobility (recovery days). */
  mobility?: number
  /**
   * A recovery day. Doing one out of order (for example because you are sore) does not move the program on:
   * the day you were due stays next.
   */
  recovery?: boolean
}

export interface ProgramGuide {
  title: string
  items: string[]
}

export interface Program {
  id: string
  name: string
  summary: string
  equipment: string
  /** The weight of the dumbbells, used to fill in every loaded set. */
  load?: { weight: number; unit: WeightUnit }
  rules: string[]
  /** What the warm-up step consists of. */
  warmupCue?: string
  mobilityCue?: string
  days: ProgramDay[]
  /** Background shown on the Plan tab: how the plan works, progressions, safety. */
  guides?: ProgramGuide[]
}

export interface ProgramState {
  programId: string
  /** The day chosen as the starting point (0 = Day 1). */
  day: number
  /** When that choice was made. Program days finished after this move the next day on. */
  setAt: string
}

export interface ProgramDone {
  day: number
  /** When the session started (ISO). */
  at: string
}

/**
 * The day to do next: one after the most recent finished program day, or the chosen starting day.
 * A recovery day done out of order (instead of the day that was due) leaves the due day next.
 */
export function nextProgramDay(program: Program, state: ProgramState, done: ProgramDone[]): number {
  const n = program.days.length
  const after = done.filter((d) => d.at >= state.setAt && d.day >= 0 && d.day < n).sort((a, b) => a.at.localeCompare(b.at))
  let cur = ((state.day % n) + n) % n
  for (const d of after) {
    if (program.days[d.day].recovery && d.day !== cur) continue
    cur = (d.day + 1) % n
  }
  return cur
}

/** True when the last day of the program was the most recent day finished (since the starting point was chosen). */
export function programFinished(program: Program, state: ProgramState, done: ProgramDone[]): boolean {
  const after = done.filter((d) => d.at >= state.setAt).sort((a, b) => a.at.localeCompare(b.at))
  return after.length > 0 && after[after.length - 1].day === program.days.length - 1
}

/** "3 × 12", "3 × 8-10 per leg", "3 × 30-45 sec". */
export function formatTarget(e: Pick<PlannedExercise, 'sets' | 'repMin' | 'repMax' | 'repLabel'>): string {
  const range = e.repMin === e.repMax ? `${e.repMin}` : `${e.repMin}-${e.repMax}`
  const label = e.repLabel === 'sec' ? ' sec' : e.repLabel === 'side' ? ' reps per side' : e.repLabel === 'leg' ? ' reps per leg' : ' reps'
  return `${e.sets} × ${range}${label}`
}

/** Rough minutes: about 40 seconds of work per set (double for each-side sets) plus the rest, warm-up and finish. */
export function programMinutes(day: ProgramDay): number {
  let s = 0
  for (const e of day.exercises) {
    const work = e.repLabel === 'sec' ? (e.repMin + e.repMax) / 2 : e.repLabel ? 70 : 40
    const rest = day.rounds ? 15 : (e.rest ?? 60)
    s += e.sets * (work + rest)
  }
  if (day.rounds) s += (day.rounds - 1) * 75
  s += ((day.warmup ?? 0) + (day.finish?.minutes ?? 0) + (day.walk?.minutes ?? 0) + (day.mobility ?? 0)) * 60
  return Math.max(5, Math.round(s / 60 / 5) * 5)
}

export const PROGRAM_GENERATOR = 'program-1'

/**
 * Builds the workout for one program day. `primaryOf` gives the main muscles of an exercise id.
 * `sore` (from today's soreness rating) trims the day: moderately sore areas lose one set, very sore areas drop to one
 * easy set with a note to skip it.
 */
export function programWorkout(program: Program, dayIndex: number, date: string, unit: WeightUnit, primaryOf: (id: string) => Muscle[], catalogVersion: string, sore: SoreMap = {}): GeneratedWorkout {
  void unit // Loads are stored in the program's own unit; the workout converts them to the session unit.
  const day = program.days[dayIndex]
  const slots: PlannedExercise[] = []
  const tag = `p${dayIndex + 1}`
  if (day.warmup) {
    slots.push({
      slotId: `${tag}-warmup`, exerciseId: 'cardio-march', name: 'Warm-up', kind: 'cardio', durationMinutes: day.warmup,
      sets: 1, repMin: 0, repMax: 0, restSeconds: 0, loadNote: '',
      intensityCue: program.warmupCue ?? 'march or walk easy, arm circles, hip hinges, a few bodyweight squats',
      why: 'Warms up your joints and muscles before the first set.',
    })
  }
  if (day.walk) {
    slots.push({
      slotId: `${tag}-walk`, exerciseId: 'cardio-walk', name: day.walk.label, kind: 'cardio', durationMinutes: day.walk.minutes,
      sets: 1, repMin: 0, repMax: 0, restSeconds: 0, loadNote: '', intensityCue: day.walk.cue ?? 'easy, you can talk in full sentences',
      why: 'Easy movement helps you recover without adding fatigue.',
    })
  }
  if (day.mobility) {
    slots.push({
      slotId: `${tag}-mobility`, exerciseId: 'mobility', name: 'Mobility', kind: 'cardio', durationMinutes: day.mobility,
      sets: 1, repMin: 0, repMax: 0, restSeconds: 0, loadNote: '', intensityCue: program.mobilityCue ?? 'gentle stretches, 20-30 seconds each',
      why: 'Loosens hips, hamstrings, chest and upper back.',
    })
  }
  const trimmed = new Set<Muscle>()
  day.exercises.forEach((e, i) => {
    const level = Math.max(0, ...primaryOf(e.exerciseId).map((m) => sore[m] ?? 0))
    if (level >= 2) for (const m of primaryOf(e.exerciseId)) if ((sore[m] ?? 0) >= 2) trimmed.add(m)
    const sets = level >= 3 ? 1 : level === 2 ? Math.max(1, e.sets - 1) : e.sets
    const soreCue = level >= 3 ? 'Very sore today: one easy set at most, or skip it.' : level === 2 ? 'Sore today: one fewer set.' : undefined
    const load = e.loaded && program.load ? { ...program.load, weight: e.weight ?? program.load.weight } : undefined
    const rule = day.rounds
      ? `Circuit: one set of each exercise in order, then rest. ${day.rounds} rounds.`
      : 'Keep 2-4 reps in reserve. Controlled form.'
    slots.push({
      slotId: `${tag}-${i + 1}`, exerciseId: e.exerciseId, name: e.name, sets, repMin: e.repMin, repMax: e.repMax,
      repLabel: e.repLabel, restSeconds: day.rounds ? 15 : (e.rest ?? 60),
      suggestedWeight: load?.weight, loadUnit: load ? load.unit : undefined,
      loadNote: !load ? rule : load.weight === program.load?.weight ? `Your ${load.weight} ${load.unit} dumbbells. ${rule}` : `${load.weight} ${load.unit}: both dumbbells together. ${rule}`,
      why: e.note ?? `${program.name} program, Day ${dayIndex + 1}.`,
      cues: [soreCue, e.note].filter((x): x is string => !!x).length ? [soreCue, e.note].filter((x): x is string => !!x) : undefined,
    })
  })
  if (day.finish) {
    slots.push({
      slotId: `${tag}-finish`, exerciseId: 'cardio-walk', name: day.finish.label, kind: 'cardio', durationMinutes: day.finish.minutes,
      sets: 1, repMin: 0, repMax: 0, restSeconds: 0, loadNote: '', intensityCue: 'easy pace, then stretch what you worked',
      why: 'Brings your heart rate down and loosens what you trained.',
    })
  }
  const muscles = [...new Set(day.exercises.flatMap((e) => primaryOf(e.exerciseId)))]
  const minutes = programMinutes(day)
  const cardioMinutes = slots.filter((s) => s.kind === 'cardio').reduce((a, s) => a + (s.durationMinutes ?? 0), 0)
  return {
    title: `${program.name} · Day ${dayIndex + 1}: ${day.title}`,
    date, targetMuscles: muscles, availableMinutes: minutes, estimatedMinutes: minutes, fits: true, cardioMinutes,
    exercises: slots,
    notes: [
      ...(trimmed.size > 0 ? [`You rated your ${[...trimmed].map((m) => MUSCLE_LABEL[m].toLowerCase()).join(', ')} as sore today, so those exercises have fewer sets. A recovery day is the better choice at 5 or more.`] : []),
      ...(day.notes ?? []), ...program.rules,
    ],
    assumptions: ['About 40 seconds per set (70 for each-side sets), the rest shown for each exercise, plus the warm-up and walking. Your real pace will differ.'],
    generatorVersion: PROGRAM_GENERATOR, catalogVersion,
  }
}
