import { db, nowIso, uid } from './schema'
import { CATALOG, CATALOG_VERSION, exerciseById } from '../data/catalog'
import { addDays, startOfWeek, weekdayIndex } from '../engine/dates'
import { generateWeeklySchedule } from '../engine/split'
import { configHash, generateWorkout, GENERATOR_VERSION } from '../engine/generate'
import { presetEquipment, presetFor, convertEquipmentUnit } from '../engine/equipment'
import { buildLastDone, buildLastPerformance } from '../engine/history'
import { suggestReschedule } from '../engine/reschedule'
import { convertWeight, tidy } from '../engine/units'
import type {
  ActualExercise, DayPlan, EquipmentSet, GenerationResult, LocationType, Muscle, Profile, ScheduledWorkout,
  SetLog, SorenessEntry, WeeklyPlan, WeightUnit, WorkoutSession,
} from '../engine/types'
import { parseOptional, type ProfileForm } from '../engine/validateProfile'

// ---------- profile ----------
export async function getProfile(): Promise<Profile | undefined> {
  return (await db.profile.toArray())[0]
}

export function profileToForm(p?: Profile): ProfileForm {
  return {
    displayName: p?.displayName ?? '',
    age: p?.age?.toString() ?? '',
    heightValue: p?.heightValue?.toString() ?? '',
    heightUnit: p?.heightUnit ?? 'in',
    weightValue: p?.weightValue?.toString() ?? '',
    weightUnit: p?.weightUnit ?? 'lb',
    goal: p?.goal ?? 'muscle',
    experienceLevel: p?.experienceLevel ?? 'beginner',
    trainingDays: p?.trainingDays ?? [0, 2, 4],
    preferredDurationMinutes: String(p?.preferredDurationMinutes ?? 45),
  }
}

/** Creates or updates the single local profile, then rebuilds the weekly plan if the schedule inputs changed. */
export async function saveProfile(
  form: ProfileForm,
  extra: { preferredLocation: LocationType; gymType: Profile['gymType'] },
  today = new Date(),
): Promise<Profile> {
  const existing = await getProfile()
  const now = nowIso()
  const weightValue = parseOptional(form.weightValue)
  const profile: Profile = {
    id: existing?.id ?? uid(),
    displayName: form.displayName.trim() || undefined,
    age: parseOptional(form.age),
    heightValue: parseOptional(form.heightValue),
    heightUnit: form.heightUnit,
    weightValue,
    weightUnit: form.weightUnit,
    goal: form.goal,
    experienceLevel: form.experienceLevel,
    trainingDays: [...form.trainingDays].sort((a, b) => a - b),
    preferredDurationMinutes: Number(form.preferredDurationMinutes),
    preferredLocation: extra.preferredLocation,
    gymType: extra.gymType,
    excludedExerciseIds: existing?.excludedExerciseIds ?? [],
    excludedPatterns: existing?.excludedPatterns ?? [],
    limitationNote: existing?.limitationNote,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  await db.transaction('rw', [db.profile, db.bodyWeights, db.equipment], async () => {
    await db.profile.put(profile)
    if (weightValue !== undefined && (!existing || existing.weightValue !== weightValue || existing.weightUnit !== form.weightUnit)) {
      await db.bodyWeights.add({ id: uid(), date: now.slice(0, 10), value: weightValue, unit: form.weightUnit })
    }
    // Keep saved equipment ranges in the user's weight unit.
    if (existing && existing.weightUnit !== form.weightUnit) {
      for (const rec of await db.equipment.toArray()) {
        await db.equipment.put({ ...rec, items: convertEquipmentUnit(rec.items, form.weightUnit), updatedAt: now })
      }
    }
  })
  const scheduleChanged = !existing
    || existing.trainingDays.join() !== profile.trainingDays.join()
    || existing.goal !== profile.goal
    || existing.experienceLevel !== profile.experienceLevel
  if (scheduleChanged) await rebuildPlan(profile, today)
  return profile
}

export async function updateExclusions(
  patch: Partial<Pick<Profile, 'excludedExerciseIds' | 'excludedPatterns' | 'limitationNote'>>,
): Promise<void> {
  const p = await getProfile()
  if (!p) return
  await db.profile.put({ ...p, ...patch, updatedAt: nowIso() })
}

export async function setLocation(location: LocationType, gymType?: Profile['gymType']): Promise<void> {
  const p = await getProfile()
  if (!p) return
  await db.profile.put({ ...p, preferredLocation: location, gymType: gymType ?? p.gymType, updatedAt: nowIso() })
}

// ---------- equipment ----------
export async function getEquipment(location: LocationType, unit: WeightUnit, gymType: Profile['gymType'] = 'planet_fitness'): Promise<EquipmentSet> {
  const rec = await db.equipment.get(location)
  if (rec) return rec.items
  return presetEquipment(presetFor(location, gymType), unit)
}

export async function saveEquipment(location: LocationType, items: EquipmentSet): Promise<void> {
  await db.equipment.put({ location, items, updatedAt: nowIso() })
}

// ---------- weekly plan and schedule ----------
export async function getPlan(): Promise<WeeklyPlan | undefined> {
  // Several versions can share a start date, so pick the newest by version number.
  return (await db.plans.toArray()).sort((a, b) => a.planVersion - b.planVersion).pop()
}

/** New plan version. Completed, partial and skipped workouts are never touched. */
export async function rebuildPlan(profile: Profile, today = new Date()): Promise<WeeklyPlan> {
  const { schedule } = generateWeeklySchedule({
    trainingDays: profile.trainingDays,
    goal: profile.goal,
    experience: profile.experienceLevel,
  })
  const prev = await getPlan()
  const now = nowIso()
  const todayKey = toKey(today)
  const plan: WeeklyPlan = {
    id: uid(),
    profileId: profile.id,
    startDate: startOfWeek(todayKey),
    trainingDays: profile.trainingDays,
    schedule,
    planVersion: (prev?.planVersion ?? 0) + 1,
    createdAt: now,
    updatedAt: now,
  }
  await db.transaction('rw', [db.plans, db.scheduled, db.sessions], async () => {
    await db.plans.add(plan)
    const futurePlanned = await db.scheduled.where('status').equals('planned').filter((s) => s.date >= todayKey).toArray()
    for (const s of futurePlanned) {
      const hasSession = (await db.sessions.where('scheduledWorkoutId').equals(s.id).count()) > 0
      if (!hasSession) await db.scheduled.delete(s.id)
    }
  })
  await ensureScheduled(todayKey, 14, profile)
  return plan
}

function toKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Makes sure every training day in the next `days` days has a scheduled row. */
export async function ensureScheduled(today: string, days: number, profile?: Profile): Promise<void> {
  const plan = await getPlan()
  const p = profile ?? (await getProfile())
  if (!plan || !p) return
  const now = nowIso()
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i)
    const day = plan.schedule[weekdayIndex(date)]
    if (!day) continue
    // Any row for this date (even a skipped one) means it is already handled.
    if ((await db.scheduled.where('date').equals(date).count()) > 0) continue
    await db.scheduled.add({
      id: uid(), planId: plan.id, date, focus: day.focus, targetMuscles: day.muscles,
      availableMinutes: p.preferredDurationMinutes, status: 'planned', createdAt: now, updatedAt: now,
    })
  }
}

export async function scheduledOn(date: string): Promise<ScheduledWorkout | undefined> {
  const rows = await db.scheduled.where('date').equals(date).toArray()
  return rows.find((r) => r.status !== 'skipped') ?? rows[0]
}

/** User explicitly asked to train on a rest day. Creates a one-off scheduled workout. */
export async function createExtraWorkout(date: string, day: DayPlan, minutes: number): Promise<ScheduledWorkout> {
  const plan = await getPlan()
  const now = nowIso()
  const row: ScheduledWorkout = {
    id: uid(), planId: plan?.id ?? 'none', date, focus: day.focus, targetMuscles: day.muscles,
    availableMinutes: minutes, status: 'planned', createdAt: now, updatedAt: now,
  }
  await db.scheduled.add(row)
  return row
}

// ---------- soreness ----------
export async function addSoreness(muscle: Muscle, level: 1 | 2 | 3, date: string): Promise<void> {
  const existing = await db.soreness.where('date').equals(date).filter((s) => s.muscle === muscle).toArray()
  for (const e of existing) await db.soreness.delete(e.id)
  await db.soreness.add({ id: uid(), date, muscle, level, createdAt: nowIso() })
}
export async function clearSoreness(muscle: Muscle, date: string): Promise<void> {
  const rows = await db.soreness.where('date').equals(date).filter((s) => s.muscle === muscle).toArray()
  for (const r of rows) await db.soreness.delete(r.id)
}
export async function recentSoreness(today: string): Promise<Partial<Record<Muscle, 1 | 2 | 3>>> {
  const since = addDays(today, -2)
  const rows: SorenessEntry[] = await db.soreness.where('date').aboveOrEqual(since).toArray()
  const out: Partial<Record<Muscle, 1 | 2 | 3>> = {}
  for (const r of rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) out[r.muscle] = r.level
  return out
}

// ---------- generation (with cache) ----------
export async function generateFor(
  scheduledId: string, minutes: number, opts: { force?: boolean; today: string },
): Promise<GenerationResult> {
  const sched = await db.scheduled.get(scheduledId)
  const profile = await getProfile()
  if (!sched || !profile) return { kind: 'error', message: 'Create your profile first.' }
  const equipment = await getEquipment(profile.preferredLocation, profile.weightUnit, profile.gymType)
  const sessions = await db.sessions.toArray()
  const logs = await db.setLogs.toArray()
  const soreness = await recentSoreness(opts.today)
  const planDay: DayPlan = { focus: sched.focus, muscles: sched.targetMuscles }
  const input = {
    date: sched.date, planDay, minutes, goal: profile.goal, experience: profile.experienceLevel, equipment,
    excludedExerciseIds: profile.excludedExerciseIds, excludedPatterns: profile.excludedPatterns,
    catalog: CATALOG, lastPerformance: buildLastPerformance(sessions, logs), lastDone: buildLastDone(sessions, logs),
    soreness, weightUnit: profile.weightUnit,
  }
  const { catalog: _catalog, ...rest } = input
  void _catalog
  const hash = configHash({
    ...rest, catalogVersion: CATALOG_VERSION,
    recentSessionIds: sessions.filter((s) => s.status === 'completed' || s.status === 'partial').map((s) => s.id).sort(),
  })
  // Reuse a cached workout only if nothing that feeds it has changed.
  if (!opts.force && sched.workout && sched.configHash === hash && sched.availableMinutes === minutes) {
    return { kind: 'workout', workout: sched.workout }
  }
  const result = generateWorkout(input)
  if (result.kind === 'workout') {
    await db.scheduled.put({
      ...sched, availableMinutes: minutes, workout: result.workout, configHash: hash,
      generatorVersion: GENERATOR_VERSION, updatedAt: nowIso(),
    })
  }
  return result
}

// ---------- sessions and set logs ----------
export async function getActiveSession(): Promise<WorkoutSession | undefined> {
  return (await db.sessions.where('status').equals('in_progress').toArray())[0]
}

export async function startSession(scheduledId: string, unit: WeightUnit): Promise<WorkoutSession> {
  const existing = await getActiveSession()
  if (existing) return existing
  const sched = await db.scheduled.get(scheduledId)
  if (!sched?.workout) throw new Error('Generate the workout before starting it.')
  const w = sched.workout
  const plan = await getPlan()
  const now = nowIso()
  const session: WorkoutSession = {
    id: uid(), scheduledWorkoutId: sched.id, date: sched.date, startedAt: now, status: 'in_progress',
    // A frozen copy: later plan changes never rewrite what was planned for this session.
    plannedExercises: structuredClone(w.exercises),
    actualExercises: w.exercises.map((e): ActualExercise => ({ slotId: e.slotId, exerciseId: e.exerciseId, skipped: false, painReported: false })),
    title: w.title, planVersion: plan?.planVersion ?? 0, generatorVersion: w.generatorVersion,
    targetMuscles: w.targetMuscles, pausedMs: 0, weightUnit: unit,
  }
  const logs: SetLog[] = w.exercises.flatMap((e) =>
    Array.from({ length: e.sets }, (_, i): SetLog => ({
      id: uid(), sessionId: session.id, slotId: e.slotId, exerciseId: e.exerciseId, setNumber: i + 1,
      plannedRepMin: e.repMin, plannedRepMax: e.repMax,
      plannedWeight: e.suggestedWeight === undefined ? undefined : convertWeight(e.suggestedWeight, e.loadUnit ?? unit, unit),
      actualWeight: e.suggestedWeight === undefined ? undefined : tidy(convertWeight(e.suggestedWeight, e.loadUnit ?? unit, unit)),
      weightUnit: unit, completed: false, createdAt: now, updatedAt: now,
    })),
  )
  await db.transaction('rw', [db.sessions, db.setLogs], async () => {
    await db.sessions.add(session)
    await db.setLogs.bulkAdd(logs)
  })
  return session
}

export async function updateSet(id: string, patch: Partial<Pick<SetLog, 'actualReps' | 'actualWeight' | 'completed' | 'effortRating'>>): Promise<void> {
  const l = await db.setLogs.get(id)
  if (!l) return
  await db.setLogs.put({ ...l, ...patch, updatedAt: nowIso() })
}

async function patchActual(sessionId: string, slotId: string, f: (a: ActualExercise) => ActualExercise): Promise<void> {
  const s = await db.sessions.get(sessionId)
  if (!s || s.status !== 'in_progress') return
  await db.sessions.put({ ...s, actualExercises: s.actualExercises.map((a) => (a.slotId === slotId ? f(a) : a)) })
}

export const setSkipped = (sid: string, slot: string, skipped: boolean) => patchActual(sid, slot, (a) => ({ ...a, skipped }))
export const setPain = (sid: string, slot: string, painReported: boolean) => patchActual(sid, slot, (a) => ({ ...a, painReported }))

/** Swap the exercise for the rest of the session. Sets already done keep the exercise they were done with. */
export async function replaceExercise(sessionId: string, slotId: string, newExerciseId: string): Promise<void> {
  const ex = exerciseById(newExerciseId)
  if (!ex) throw new Error('Unknown exercise')
  const s = await db.sessions.get(sessionId)
  if (!s || s.status !== 'in_progress') return
  const cur = s.actualExercises.find((a) => a.slotId === slotId)
  if (!cur) return
  await db.transaction('rw', [db.sessions, db.setLogs], async () => {
    await db.sessions.put({
      ...s,
      actualExercises: s.actualExercises.map((a) =>
        a.slotId === slotId ? { ...a, exerciseId: newExerciseId, replacedFromId: a.replacedFromId ?? a.exerciseId } : a),
    })
    const pending = await db.setLogs.where('sessionId').equals(sessionId).filter((l) => l.slotId === slotId && !l.completed).toArray()
    for (const l of pending) await db.setLogs.put({ ...l, exerciseId: newExerciseId, plannedWeight: undefined, actualWeight: undefined, updatedAt: nowIso() })
  })
}

export async function pauseSession(id: string): Promise<void> {
  const s = await db.sessions.get(id)
  if (s && s.status === 'in_progress' && !s.pausedAt) await db.sessions.put({ ...s, pausedAt: nowIso() })
}
export async function resumeSession(id: string): Promise<void> {
  const s = await db.sessions.get(id)
  if (s && s.pausedAt) {
    await db.sessions.put({ ...s, pausedMs: s.pausedMs + (Date.now() - new Date(s.pausedAt).getTime()), pausedAt: undefined })
  }
}

export async function finishSession(id: string, mode: 'finish' | 'abandon'): Promise<WorkoutSession | undefined> {
  const s = await db.sessions.get(id)
  if (!s || s.status !== 'in_progress') return s
  if (s.pausedAt) await resumeSession(id)
  const fresh = (await db.sessions.get(id))!
  const logs = await db.setLogs.where('sessionId').equals(id).toArray()
  const anyDone = logs.some((l) => l.completed)
  let status: WorkoutSession['status']
  if (mode === 'abandon' || !anyDone) status = 'abandoned'
  else {
    const active = fresh.actualExercises.filter((a) => !a.skipped)
    const allDone = active.every((a) => logs.filter((l) => l.slotId === a.slotId).every((l) => l.completed))
    status = allDone && active.length > 0 ? 'completed' : 'partial'
  }
  const done: WorkoutSession = { ...fresh, status, finishedAt: nowIso() }
  await db.transaction('rw', [db.sessions, db.scheduled], async () => {
    await db.sessions.put(done)
    if (fresh.scheduledWorkoutId && status !== 'abandoned') {
      const sc = await db.scheduled.get(fresh.scheduledWorkoutId)
      if (sc) await db.scheduled.put({ ...sc, status: status === 'completed' ? 'completed' : 'partial', updatedAt: nowIso() })
    }
  })
  return done
}

// ---------- skipping and rescheduling ----------
export async function skipScheduled(id: string, today: string): Promise<{ suggestion: string | null }> {
  const sc = await db.scheduled.get(id)
  if (!sc) return { suggestion: null }
  await db.scheduled.put({ ...sc, status: 'skipped', updatedAt: nowIso() })
  const all = await db.scheduled.toArray()
  const suggestion = suggestReschedule(
    sc.targetMuscles,
    all.map((s) => ({ date: s.date, muscles: s.targetMuscles, status: s.status })),
    today > sc.date ? today : sc.date,
  )
  return { suggestion }
}

/** The original stays as a skipped record. A new row is added on the chosen day. */
export async function acceptReschedule(skippedId: string, newDate: string): Promise<void> {
  const sc = await db.scheduled.get(skippedId)
  if (!sc) return
  const now = nowIso()
  await db.scheduled.add({
    id: uid(), planId: sc.planId, date: newDate, focus: sc.focus, targetMuscles: sc.targetMuscles,
    availableMinutes: sc.availableMinutes, status: 'planned', rescheduledFromId: sc.id, createdAt: now, updatedAt: now,
  })
}

// ---------- history ----------
export async function resetAllData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
  })
}
