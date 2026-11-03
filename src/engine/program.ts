// Fixed programs: a numbered list of days (Day 1, Day 2 ...) done in order, not tied to weekdays.
// The next day is worked out from what was actually finished, so a rest day simply means the next day waits.
import type { GeneratedWorkout, Muscle, PlannedExercise, WeightUnit } from './types'

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
  walk?: { minutes: number; label: string }
}

export interface Program {
  id: string
  name: string
  summary: string
  equipment: string
  /** The weight of the dumbbells, used to fill in every loaded set. */
  load?: { weight: number; unit: WeightUnit }
  rules: string[]
  days: ProgramDay[]
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

/** The day to do next: one after the most recent finished program day, or the chosen starting day. */
export function nextProgramDay(program: Program, state: ProgramState, done: ProgramDone[]): number {
  const n = program.days.length
  const after = done.filter((d) => d.at >= state.setAt && d.day >= 0 && d.day < n).sort((a, b) => a.at.localeCompare(b.at))
  const last = after[after.length - 1]
  const start = ((state.day % n) + n) % n
  return last ? (last.day + 1) % n : start
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
  s += (day.warmup ?? 0) * 60 + (day.finish?.minutes ?? 0) * 60 + (day.walk?.minutes ?? 0) * 60
  return Math.max(5, Math.round(s / 60 / 5) * 5)
}

export const PROGRAM_GENERATOR = 'program-1'

/** Builds the workout for one program day. `primaryOf` gives the main muscles of an exercise id. */
export function programWorkout(program: Program, dayIndex: number, date: string, unit: WeightUnit, primaryOf: (id: string) => Muscle[], catalogVersion: string): GeneratedWorkout {
  void unit // Loads are stored in the program's own unit; the workout converts them to the session unit.
  const day = program.days[dayIndex]
  const slots: PlannedExercise[] = []
  const tag = `p${dayIndex + 1}`
  if (day.warmup) {
    slots.push({
      slotId: `${tag}-warmup`, exerciseId: 'cardio-march', name: 'Warm-up', kind: 'cardio', durationMinutes: day.warmup,
      sets: 1, repMin: 0, repMax: 0, restSeconds: 0, loadNote: '',
      intensityCue: 'march or walk easy, arm circles, hip hinges, a few bodyweight squats',
      why: 'Warms up your joints and muscles before the first set.',
    })
  }
  if (day.walk) {
    slots.push({
      slotId: `${tag}-walk`, exerciseId: 'cardio-walk', name: day.walk.label, kind: 'cardio', durationMinutes: day.walk.minutes,
      sets: 1, repMin: 0, repMax: 0, restSeconds: 0, loadNote: '', intensityCue: 'easy, you can talk in full sentences',
      why: 'Easy movement helps you recover without adding fatigue.',
    })
  }
  day.exercises.forEach((e, i) => {
    const load = e.loaded && program.load ? program.load : undefined
    const rule = day.rounds
      ? `Circuit: one set of each exercise in order, then rest. ${day.rounds} rounds.`
      : 'Keep 2-4 reps in reserve. Controlled form.'
    slots.push({
      slotId: `${tag}-${i + 1}`, exerciseId: e.exerciseId, name: e.name, sets: e.sets, repMin: e.repMin, repMax: e.repMax,
      repLabel: e.repLabel, restSeconds: day.rounds ? 15 : (e.rest ?? 60),
      suggestedWeight: load?.weight, loadUnit: load ? load.unit : undefined,
      loadNote: load ? `Your ${load.weight} ${load.unit} dumbbells. ${rule}` : rule,
      why: e.note ?? `${program.name} program, Day ${dayIndex + 1}.`,
      cues: e.note ? [e.note] : undefined,
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
    notes: [...(day.notes ?? []), ...program.rules],
    assumptions: ['About 40 seconds per set (70 for each-side sets), the rest shown for each exercise, plus the warm-up and walking. Your real pace will differ.'],
    generatorVersion: PROGRAM_GENERATOR, catalogVersion,
  }
}
