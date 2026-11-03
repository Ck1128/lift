import { db, nowIso, uid } from './schema'
import { getSetting, setSetting, SETTING } from './settings'
import { getProfile, ensureScheduled } from './repo'
import { CATALOG_VERSION, exerciseById } from '../data/catalog'
import { programById } from '../data/programs'
import { nextProgramDay, programWorkout, type Program, type ProgramDone, type ProgramState } from '../engine/program'
import type { EquipmentSet, ScheduledWorkout } from '../engine/types'

export const PROGRAM_KEY = SETTING.program

export const getProgramState = () => getSetting<ProgramState | null>(PROGRAM_KEY, null)

/** The active program and the day to do next, or null when Lift designs the workouts. */
export async function activeProgram(): Promise<{ program: Program; state: ProgramState; next: number; done: ProgramDone[] } | null> {
  const state = await getProgramState()
  const program = state ? programById(state.programId) : undefined
  if (!state || !program) return null
  const done = await programHistory(program.id)
  return { program, state, next: nextProgramDay(program, state, done), done }
}

/** Every finished (or partly finished) day of a program, from the saved workouts. */
export async function programHistory(programId: string): Promise<ProgramDone[]> {
  const rows = (await db.scheduled.toArray()).filter((r) => r.programId === programId && r.programDay !== undefined)
  if (rows.length === 0) return []
  const byId = new Map(rows.map((r) => [r.id, r]))
  const sessions = await db.sessions.toArray()
  return sessions
    .filter((s) => (s.status === 'completed' || s.status === 'partial') && s.scheduledWorkoutId && byId.has(s.scheduledWorkoutId))
    .map((s) => ({ day: byId.get(s.scheduledWorkoutId!)!.programDay!, at: s.startedAt }))
}

/** The equipment a program is written for. Used for swaps during a program workout; the saved equipment lists are never changed. */
export function programEquipment(program: Program): EquipmentSet {
  const w = program.load
  return {
    bodyweight: { id: 'bodyweight', available: true },
    dumbbell: { id: 'dumbbell', available: true, weights: w ? [w.weight] : undefined, unit: w?.unit },
  }
}

/**
 * Turns a program on (starting at `day`) or off (null). Turning it on clears upcoming weekday days that were never
 * started (from `today` on); turning it off brings the weekday plan back. Nothing else changes: location, equipment and
 * finished workouts are never touched.
 */
export async function setProgram(programId: string | null, day = 0, today?: string): Promise<void> {
  if (programId === null) {
    await setSetting(PROGRAM_KEY, null)
    // Program days not started yet are removed so the weekday plan can take over again.
    await removeUnstarted((r) => r.programId !== undefined && (!today || r.date >= today))
    if (today) await ensureScheduled(today, 14)
    return
  }
  const program = programById(programId)
  if (!program) return
  await setSetting(PROGRAM_KEY, { programId, day, setAt: nowIso() } satisfies ProgramState)
  await removeUnstarted((r) => !today || r.date >= today)
}

async function removeUnstarted(match: (r: ScheduledWorkout) => boolean): Promise<void> {
  const planned = (await db.scheduled.where('status').equals('planned').toArray()).filter(match)
  for (const r of planned) {
    const started = (await db.sessions.where('scheduledWorkoutId').equals(r.id).count()) > 0
    if (!started) await db.scheduled.delete(r.id)
  }
}

/** The workout row for a program day on `date`. An existing unstarted row for that date is reused. */
export async function openProgramDay(date: string, dayIndex: number): Promise<ScheduledWorkout | null> {
  const state = await getProgramState()
  const program = state ? programById(state.programId) : undefined
  const profile = await getProfile()
  if (!program || !profile || dayIndex < 0 || dayIndex >= program.days.length) return null
  const workout = programWorkout(program, dayIndex, date, profile.weightUnit, (id) => exerciseById(id)?.primaryMuscles ?? [], CATALOG_VERSION)
  const day = program.days[dayIndex]
  const now = nowIso()
  const fields = {
    focus: `${program.name} · Day ${dayIndex + 1}: ${day.title}`, targetMuscles: workout.targetMuscles, availableMinutes: workout.availableMinutes,
    workout, programId: program.id, programDay: dayIndex, cardioOnly: day.exercises.length === 0 || undefined,
    circuit: undefined, cardioChoice: undefined, configHash: undefined, keepPlan: false, generatorVersion: workout.generatorVersion, updatedAt: now,
  }
  const rows = await db.scheduled.where('date').equals(date).toArray()
  for (const r of rows.filter((x) => x.status === 'planned')) {
    const started = (await db.sessions.where('scheduledWorkoutId').equals(r.id).count()) > 0
    if (!started) {
      const next: ScheduledWorkout = { ...r, ...fields, status: 'planned' }
      await db.scheduled.put(next)
      return next
    }
  }
  const row: ScheduledWorkout = { id: uid(), planId: 'program', date, status: 'planned', createdAt: now, ...fields }
  await db.scheduled.add(row)
  return row
}
