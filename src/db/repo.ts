import { clearAllDrafts } from '../hooks/drafts'
import { db, nowIso, uid } from './schema'
import { CATALOG, CATALOG_VERSION, exerciseById } from '../data/catalog'
import { addDays, startOfWeek, weekdayIndex } from '../engine/dates'
import { generateWeeklySchedule } from '../engine/split'
import { configHash, generateWorkout, GENERATOR_VERSION } from '../engine/generate'
import {
  presetEquipment, presetFor, convertEquipmentUnit, withExclusions, type PresetKind,
} from '../engine/equipment'
import { buildLastDone, buildLastPerformance } from '../engine/history'
import { suggestReschedule } from '../engine/reschedule'
import { convertWeight, tidy } from '../engine/units'
import { gapsMessage, requiredProfileGaps } from '../engine/levels'
import { tracksOf } from '../engine/tracks'
import { ALL_TRACKS, type Track } from '../engine/types'
import type {
  ActualExercise, DayPlan, EquipmentId, EquipmentSet, GenerationResult, LocationType, Muscle, Profile, ScheduledWorkout,
  SetLog, SorenessEntry, TrainingLevel, WeeklyPlan, WeightUnit, WorkoutSession,
} from '../engine/types'
import {
  formHeightCm, formWeightKg, parseOptional, profileFormFrom, type ProfileForm,
} from '../engine/validateProfile'

// ---------- profile ----------
export async function getProfile(): Promise<Profile | undefined> {
  return (await db.profile.toArray())[0]
}

export function profileToForm(p?: Profile): ProfileForm {
  return profileFormFrom(p)
}

export interface SaveProfileOptions {
  /**
   * What to do with upcoming workouts when the training level changed.
   * 'update' (default) builds fresh upcoming workouts. 'keep' leaves the ones already built. Finished history is never touched.
   */
  levelChange?: 'update' | 'keep'
}

/** Creates or updates the single local profile, then rebuilds the weekly plan if the schedule inputs changed. */
export async function saveProfile(
  form: ProfileForm,
  extra: { preferredLocation: LocationType; gymType: Profile['gymType'] },
  today = new Date(),
  options: SaveProfileOptions = {},
): Promise<Profile> {
  const existing = await getProfile()
  const now = nowIso()
  const weightKg = formWeightKg(form)
  const profile: Profile = {
    id: existing?.id ?? uid(),
    displayName: form.displayName.trim() || undefined,
    age: parseOptional(form.age),
    sex: form.sex === '' ? undefined : form.sex,
    heightCm: formHeightCm(form),
    heightDisplayUnit: form.heightUnit,
    weightKg,
    weightUnit: form.weightUnit,
    goal: form.goal,
    trainingLevel: form.trainingLevel,
    yogaLevel: existing?.yogaLevel,
    // A form with nothing chosen (only possible when called directly) keeps what was saved, or both.
    tracks: form.tracks.length > 0 ? ALL_TRACKS.filter((t) => form.tracks.includes(t)) : (existing?.tracks ?? [...ALL_TRACKS]),
    nutritionGuidance: form.nutritionGuidance,
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
  const levelChanged = !!existing && existing.trainingLevel !== profile.trainingLevel
  await db.transaction('rw', [db.profile, db.bodyWeights, db.equipment], async () => {
    await db.profile.put(profile)
    const weightMoved = weightKg !== undefined && (existing?.weightKg === undefined || Math.abs(existing.weightKg - weightKg) > 0.05)
    if (weightMoved && weightKg !== undefined) {
      const v = form.weightFieldUnit === 'kg' ? weightKg : convertWeight(weightKg, 'kg', form.weightFieldUnit)
      await db.bodyWeights.add({ id: uid(), date: now.slice(0, 10), value: tidy(v), unit: form.weightFieldUnit })
    }
    // Keep saved equipment ranges in the user's weight unit.
    if (existing && existing.weightUnit !== form.weightUnit) {
      for (const rec of await db.equipment.toArray()) {
        await db.equipment.put({ ...rec, items: convertEquipmentUnit(rec.items, form.weightUnit), updatedAt: now })
      }
    }
  })
  if (!existing) await applyDefaultEquipment(profile.preferredLocation, profile.gymType, profile.weightUnit)
  const keep = levelChanged && options.levelChange === 'keep'
  const workoutOn = tracksOf(profile).workout
  const workoutTurnedOn = workoutOn && !!existing && !tracksOf(existing).workout
  const scheduleChanged = !existing
    || existing.trainingDays.join() !== profile.trainingDays.join()
    || existing.goal !== profile.goal
    || (levelChanged && !keep)
    || workoutTurnedOn
  // A yoga-only profile gets no workout plan. Existing plans and history are left alone when Workout is switched off.
  if (scheduleChanged && workoutOn) await rebuildPlan(profile, today)
  if (levelChanged) await applyLevelChoice(options.levelChange ?? 'update', toKey(today))
  return profile
}

/** Upcoming, not-yet-started workouts either get rebuilt for the new level or are kept as they are. */
async function applyLevelChoice(mode: 'update' | 'keep', todayKey: string): Promise<void> {
  const rows = await db.scheduled.where('status').equals('planned').filter((s) => s.date >= todayKey).toArray()
  for (const r of rows) {
    if ((await db.sessions.where('scheduledWorkoutId').equals(r.id).count()) > 0) continue
    if (mode === 'keep') {
      if (r.workout) await db.scheduled.put({ ...r, keepPlan: true, updatedAt: nowIso() })
    } else {
      await db.scheduled.put({ ...r, workout: undefined, configHash: undefined, keepPlan: false, updatedAt: nowIso() })
    }
  }
}

/** Changes only the training level. Completed history is never rewritten. */
export async function changeTrainingLevel(level: TrainingLevel, mode: 'update' | 'keep', today = new Date()): Promise<void> {
  const p = await getProfile()
  if (!p || p.trainingLevel === level) return
  const next = { ...p, trainingLevel: level, updatedAt: nowIso() }
  await db.profile.put(next)
  if (mode === 'update') await rebuildPlan(next, today)
  await applyLevelChoice(mode, toKey(today))
}

export async function setYogaLevel(level: TrainingLevel): Promise<void> {
  const p = await getProfile()
  if (p) await db.profile.put({ ...p, yogaLevel: level, updatedAt: nowIso() })
}

/** Turn one activity on or off. At least one stays on, and history is never touched. */
export async function setTrack(track: Track, on: boolean): Promise<void> {
  const p = await getProfile()
  if (!p) return
  const cur = tracksOf(p).list
  const next = ALL_TRACKS.filter((t) => (t === track ? on : cur.includes(t)))
  if (next.length === 0) return
  await db.profile.put({ ...p, tracks: next, updatedAt: nowIso() })
}

export async function setNutritionGuidance(on: boolean): Promise<void> {
  const p = await getProfile()
  if (p) await db.profile.put({ ...p, nutritionGuidance: on, updatedAt: nowIso() })
}

/** Height and weight only, for the beginner prompt on Home. */
export async function saveBodyBasics(heightCm: number | undefined, weightKg: number | undefined): Promise<void> {
  const p = await getProfile()
  if (!p) return
  await db.profile.put({ ...p, heightCm: heightCm ?? p.heightCm, weightKg: weightKg ?? p.weightKg, updatedAt: nowIso() })
  if (weightKg !== undefined && weightKg !== p.weightKg) {
    const unit = p.weightUnit
    await db.bodyWeights.add({ id: uid(), date: nowIso().slice(0, 10), value: tidy(unit === 'kg' ? weightKg : convertWeight(weightKg, 'kg', unit)), unit })
  }
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
  const nextGym = gymType ?? p.gymType
  await db.profile.put({ ...p, preferredLocation: location, gymType: nextGym, updatedAt: nowIso() })
  // Choosing a gym type applies that gym's maintained equipment list. History is never touched.
  if (location === 'gym' && ((gymType !== undefined && gymType !== p.gymType) || !(await db.equipment.get('gym')))) {
    await applyDefaultEquipment('gym', nextGym, p.weightUnit)
  }
}

// ---------- equipment ----------
/** The list a location uses right now: a maintained preset (minus anything the user excluded), or the user's own list. */
export async function getEquipment(location: LocationType, unit: WeightUnit, gymType: Profile['gymType'] = 'planet_fitness'): Promise<EquipmentSet> {
  const rec = await db.equipment.get(location)
  if (rec?.preset) return withExclusions(presetEquipment(rec.preset, unit), rec.excluded)
  if (rec) return rec.items
  return presetEquipment(presetFor(location, gymType), unit)
}

export async function getEquipmentRecord(location: LocationType) {
  return db.equipment.get(location)
}

/** Manual edits turn a preset list into the user's own list. */
export async function saveEquipment(location: LocationType, items: EquipmentSet): Promise<void> {
  await db.equipment.put({ location, items, updatedAt: nowIso() })
}

/** Applies the starting list for a location. Planet Fitness follows the maintained preset; other lists are editable copies. */
export async function applyDefaultEquipment(location: LocationType, gymType: Profile['gymType'], unit: WeightUnit): Promise<void> {
  const kind: PresetKind = presetFor(location, gymType)
  const prev = await db.equipment.get(location)
  const keepExcluded = prev?.preset === kind ? prev.excluded : undefined
  if (kind === 'planet_fitness') {
    await db.equipment.put({ location, items: presetEquipment(kind, unit), preset: kind, excluded: keepExcluded ?? [], updatedAt: nowIso() })
  } else {
    await db.equipment.put({ location, items: presetEquipment(kind, unit), updatedAt: nowIso() })
  }
}

/** Items the user's club does not have. Only for a preset list. */
export async function setExcludedEquipment(location: LocationType, excluded: EquipmentId[]): Promise<void> {
  const rec = await db.equipment.get(location)
  if (!rec?.preset) return
  await db.equipment.put({ ...rec, excluded: [...new Set(excluded)], updatedAt: nowIso() })
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
    experience: profile.trainingLevel,
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
    availableMinutes: minutes, status: 'planned', cardioOnly: day.cardioOnly || undefined, createdAt: now, updatedAt: now,
  }
  await db.scheduled.add(row)
  return row
}

/**
 * Today's Call chose a different workout than the plan. Today's planned row is changed to it (so Workout, Home and
 * history all agree), or a one-off row is made when today has none.
 */
export async function applyCallToToday(date: string, day: DayPlan, minutes: number): Promise<ScheduledWorkout> {
  const rows = await db.scheduled.where('date').equals(date).toArray()
  const row = rows.find((r) => r.status === 'planned')
  if (!row) return createExtraWorkout(date, day, minutes)
  const next: ScheduledWorkout = {
    ...row, focus: day.focus, targetMuscles: day.muscles, cardioOnly: day.cardioOnly || undefined, availableMinutes: minutes,
    workout: undefined, configHash: undefined, cardioChoice: undefined, keepPlan: false, updatedAt: nowIso(),
  }
  await db.scheduled.put(next)
  return next
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
/** What is missing before a personalised plan can be built, or an empty list. */
export function profileGaps(p: Profile): string[] {
  // Height and weight are a workout requirement for beginners. A yoga-only profile is never asked for them.
  if (!tracksOf(p).workout) return []
  return requiredProfileGaps(p.trainingLevel, p.heightCm, p.weightKg)
}

export async function generateFor(
  scheduledId: string, minutes: number, opts: { force?: boolean; today: string; /** Muscles to go easier on (still recovering). */ light?: Muscle[] },
): Promise<GenerationResult> {
  const sched = await db.scheduled.get(scheduledId)
  const profile = await getProfile()
  if (!sched || !profile) return { kind: 'error', message: 'Create your profile first.' }
  const gaps = profileGaps(profile)
  if (gaps.length > 0) return { kind: 'error', message: gapsMessage(gaps) }
  const equipment = await getEquipment(profile.preferredLocation, profile.weightUnit, profile.gymType)
  const sessions = await db.sessions.toArray()
  const logs = await db.setLogs.toArray()
  const soreness = await recentSoreness(opts.today)
  // Muscles that are still recovering get the same trimmed sets as mild soreness, unless the person reported more.
  for (const m of opts.light ?? []) if (!soreness[m]) soreness[m] = 1
  const planDay: DayPlan = { focus: sched.focus, muscles: sched.targetMuscles, cardioOnly: sched.cardioOnly }
  const input = {
    date: sched.date, planDay, minutes, goal: profile.goal, experience: profile.trainingLevel, equipment,
    excludedExerciseIds: profile.excludedExerciseIds, excludedPatterns: profile.excludedPatterns,
    catalog: CATALOG, lastPerformance: buildLastPerformance(sessions, logs), lastDone: buildLastDone(sessions, logs),
    soreness, weightUnit: profile.weightUnit, cardioChoice: sched.cardioChoice, weightKg: profile.weightKg, sex: profile.sex, age: profile.age,
    gym: profile.preferredLocation === 'gym' ? profile.gymType : undefined,
  }
  const { catalog: _catalog, ...rest } = input
  void _catalog
  const hash = configHash({
    ...rest, catalogVersion: CATALOG_VERSION,
    recentSessionIds: sessions.filter((s) => s.status === 'completed' || s.status === 'partial').map((s) => s.id).sort(),
  })
  // Reuse a cached workout only if nothing that feeds it has changed (or the user chose to keep it).
  const sameMinutes = sched.availableMinutes === minutes
  if (!opts.force && sched.workout && sameMinutes && (sched.configHash === hash || sched.keepPlan)) {
    return { kind: 'workout', workout: sched.workout }
  }
  const result = generateWorkout(input)
  if (result.kind === 'workout') {
    await db.scheduled.put({
      ...sched, availableMinutes: minutes, workout: result.workout, configHash: hash, keepPlan: false,
      generatorVersion: GENERATOR_VERSION, updatedAt: nowIso(),
    })
  }
  return result
}

/** Skip cardio, or choose a specific activity, for one day. The next generate call applies it. */
export async function setCardioChoice(scheduledId: string, choice: string | undefined): Promise<void> {
  const sc = await db.scheduled.get(scheduledId)
  if (sc) await db.scheduled.put({ ...sc, cardioChoice: choice, keepPlan: false, updatedAt: nowIso() })
}

// ---------- sessions and set logs ----------
export async function getActiveSession(): Promise<WorkoutSession | undefined> {
  return (await db.sessions.where('status').equals('in_progress').toArray())[0]
}

/** The saved (not discarded) session for a scheduled day, if any. */
export async function sessionForScheduled(scheduledId: string): Promise<WorkoutSession | undefined> {
  const rows = await db.sessions.where('scheduledWorkoutId').equals(scheduledId).toArray()
  return rows.filter((s) => s.status !== 'abandoned').sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
}

export async function startSession(scheduledId: string, unit: WeightUnit): Promise<WorkoutSession> {
  const existing = await getActiveSession()
  if (existing) return existing
  // A day that already has a saved workout is reopened, never duplicated.
  const saved = await sessionForScheduled(scheduledId)
  if (saved) {
    const reopened = await reopenSession(saved.id)
    if (reopened.ok) return reopened.session
    return saved
  }
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
    targetMuscles: w.targetMuscles, pausedMs: 0, weightUnit: unit, plannedMinutes: w.availableMinutes, updatedAt: now,
  }
  const logs: SetLog[] = w.exercises.flatMap((e) =>
    Array.from({ length: e.sets }, (_, i): SetLog => ({
      id: uid(), sessionId: session.id, slotId: e.slotId, exerciseId: e.exerciseId, setNumber: i + 1,
      plannedRepMin: e.repMin, plannedRepMax: e.repMax,
      plannedWeight: e.suggestedWeight === undefined ? undefined : convertWeight(e.suggestedWeight, e.loadUnit ?? unit, unit),
      actualWeight: e.suggestedWeight === undefined ? undefined : tidy(convertWeight(e.suggestedWeight, e.loadUnit ?? unit, unit)),
      actualMinutes: e.kind === 'cardio' ? e.durationMinutes : undefined,
      weightUnit: unit, completed: false, createdAt: now, updatedAt: now,
    })),
  )
  await db.transaction('rw', [db.sessions, db.setLogs], async () => {
    await db.sessions.add(session)
    await db.setLogs.bulkAdd(logs)
  })
  return session
}

async function touchSession(id: string): Promise<void> {
  const s = await db.sessions.get(id)
  if (s) await db.sessions.put({ ...s, updatedAt: nowIso() })
}

export async function updateSet(
  id: string,
  patch: Partial<Pick<SetLog, 'actualReps' | 'actualWeight' | 'actualMinutes' | 'completed' | 'effortRating' | 'weightUnit'>>,
): Promise<void> {
  const l = await db.setLogs.get(id)
  if (!l) return
  await db.setLogs.put({ ...l, ...patch, updatedAt: nowIso() })
  await touchSession(l.sessionId)
}

/** Adds one more set to an exercise, for example when editing a saved workout. */
export async function addSet(sessionId: string, slotId: string): Promise<void> {
  const logs = await db.setLogs.where('sessionId').equals(sessionId).filter((l) => l.slotId === slotId).toArray()
  const last = [...logs].sort((a, b) => a.setNumber - b.setNumber).pop()
  if (!last) return
  const now = nowIso()
  await db.setLogs.add({
    ...last, id: uid(), setNumber: last.setNumber + 1, completed: false, actualReps: undefined, effortRating: undefined, createdAt: now, updatedAt: now,
  })
  await touchSession(sessionId)
}

async function patchActual(sessionId: string, slotId: string, f: (a: ActualExercise) => ActualExercise): Promise<void> {
  const s = await db.sessions.get(sessionId)
  if (!s || s.status !== 'in_progress') return
  await db.sessions.put({ ...s, actualExercises: s.actualExercises.map((a) => (a.slotId === slotId ? f(a) : a)), updatedAt: nowIso() })
}

export const setSkipped = (sid: string, slot: string, skipped: boolean) => patchActual(sid, slot, (a) => ({ ...a, skipped }))
export const setPain = (sid: string, slot: string, painReported: boolean) => patchActual(sid, slot, (a) => ({ ...a, painReported }))

export type LogsChoice = 'keep' | 'reset'

/**
 * Swap the exercise for the rest of the session. Only this slot changes: other exercises and their logs are untouched,
 * and future days are never changed.
 *  - logs 'keep' (default): sets already done keep the exercise they were done with; the rest switch.
 *  - logs 'reset': this exercise's own sets are cleared too, so the whole slot starts fresh with the new exercise.
 * The slot's earlier state is saved, so undoReplace can put it back.
 */
export async function replaceExercise(sessionId: string, slotId: string, newExerciseId: string, opts: { logs?: LogsChoice } = {}): Promise<void> {
  const ex = exerciseById(newExerciseId)
  if (!ex) throw new Error('Unknown exercise')
  const s = await db.sessions.get(sessionId)
  if (!s || s.status !== 'in_progress') return
  const cur = s.actualExercises.find((a) => a.slotId === slotId)
  if (!cur || cur.exerciseId === newExerciseId) return
  await db.transaction('rw', [db.sessions, db.setLogs], async () => {
    const slotLogs = await db.setLogs.where('sessionId').equals(sessionId).filter((l) => l.slotId === slotId).toArray()
    const previous = { exerciseId: cur.exerciseId, replacedFromId: cur.replacedFromId, sets: slotLogs }
    await db.sessions.put({
      ...s,
      actualExercises: s.actualExercises.map((a) =>
        a.slotId === slotId ? { ...a, exerciseId: newExerciseId, replacedFromId: a.replacedFromId ?? a.exerciseId, previous } : a),
      updatedAt: nowIso(),
    })
    const reset = opts.logs === 'reset'
    for (const l of slotLogs) {
      if (l.completed && !reset) continue
      await db.setLogs.put({
        ...l, exerciseId: newExerciseId, plannedWeight: undefined, actualWeight: undefined,
        ...(reset ? { completed: false, actualReps: undefined, effortRating: undefined } : null), updatedAt: nowIso(),
      })
    }
  })
}

/**
 * Puts a slot back as it was before the last replacement. Refused if sets were logged with the new exercise since,
 * because undoing would erase them.
 */
export async function undoReplace(sessionId: string, slotId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const s = await db.sessions.get(sessionId)
  if (!s || s.status !== 'in_progress') return { ok: false, reason: 'This workout is not open.' }
  const cur = s.actualExercises.find((a) => a.slotId === slotId)
  if (!cur?.previous) return { ok: false, reason: 'There is nothing to undo.' }
  const prev = cur.previous
  return db.transaction('rw', [db.sessions, db.setLogs], async () => {
    const now = await db.setLogs.where('sessionId').equals(sessionId).filter((l) => l.slotId === slotId).toArray()
    const wasDone = new Map(prev.sets.map((l) => [l.id, l.completed]))
    if (now.some((l) => l.completed && !wasDone.get(l.id))) {
      return { ok: false as const, reason: 'You logged sets after the swap, so it cannot be undone without erasing them. Replace it again instead.' }
    }
    await db.setLogs.where('sessionId').equals(sessionId).filter((l) => l.slotId === slotId).delete()
    await db.setLogs.bulkAdd(prev.sets)
    await db.sessions.put({
      ...s,
      actualExercises: s.actualExercises.map((a) =>
        a.slotId === slotId ? { ...a, exerciseId: prev.exerciseId, replacedFromId: prev.replacedFromId, previous: undefined } : a),
      updatedAt: nowIso(),
    })
    return { ok: true as const }
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

type StatusResult = { status: WorkoutSession['status']; anyDone: boolean }

async function statusFromLogs(s: WorkoutSession): Promise<StatusResult> {
  const logs = await db.setLogs.where('sessionId').equals(s.id).toArray()
  const anyDone = logs.some((l) => l.completed)
  if (!anyDone) return { status: 'abandoned', anyDone }
  const active = s.actualExercises.filter((a) => !a.skipped)
  const allDone = active.every((a) => logs.filter((l) => l.slotId === a.slotId).every((l) => l.completed))
  return { status: allDone && active.length > 0 ? 'completed' : 'partial', anyDone }
}

export async function finishSession(id: string, mode: 'finish' | 'abandon'): Promise<WorkoutSession | undefined> {
  const s = await db.sessions.get(id)
  // Finishing twice (for example from the top and bottom buttons) is harmless: the second call changes nothing.
  if (!s || s.status !== 'in_progress') return s
  if (s.pausedAt) await resumeSession(id)
  const fresh = (await db.sessions.get(id))!
  let status: WorkoutSession['status']
  if (mode === 'abandon') status = 'abandoned'
  else status = (await statusFromLogs(fresh)).status
  const done: WorkoutSession = { ...fresh, status, finishedAt: nowIso(), updatedAt: nowIso() }
  await db.transaction('rw', [db.sessions, db.scheduled], async () => {
    await db.sessions.put(done)
    if (fresh.scheduledWorkoutId && status !== 'abandoned') {
      const sc = await db.scheduled.get(fresh.scheduledWorkoutId)
      if (sc) await db.scheduled.put({ ...sc, status: status === 'completed' ? 'completed' : 'partial', updatedAt: nowIso() })
    }
  })
  return done
}

/**
 * Reopens a finished (or accidentally discarded) workout on the same day, as the same session.
 * It never creates a second session. The time between finishing and reopening is not counted as workout time.
 */
export async function reopenSession(id: string, today?: string): Promise<{ ok: true; session: WorkoutSession } | { ok: false; reason: string }> {
  const s = await db.sessions.get(id)
  if (!s) return { ok: false, reason: 'That workout was not found.' }
  if (s.status === 'in_progress') return { ok: true, session: s }
  const active = await getActiveSession()
  if (active) return { ok: false, reason: `Finish or save "${active.title}" first. Only one workout can be open at a time.` }
  if (today && s.date !== today) return { ok: false, reason: 'You can resume a workout on the day you did it. You can still edit it.' }
  const gap = s.finishedAt ? Math.max(0, Date.now() - new Date(s.finishedAt).getTime()) : 0
  const next: WorkoutSession = {
    ...s, status: 'in_progress', pausedMs: s.pausedMs + gap, pausedAt: undefined, reopenedAt: nowIso(), updatedAt: nowIso(),
  }
  await db.sessions.put(next)
  return { ok: true, session: next }
}

/** After editing a saved workout: recalculates its status from the sets and stamps the update time. */
export async function markComplete(id: string): Promise<WorkoutSession | undefined> {
  const s = await db.sessions.get(id)
  if (!s || s.status === 'in_progress') return s
  const { status } = await statusFromLogs(s)
  const next: WorkoutSession = { ...s, status, updatedAt: nowIso(), finishedAt: s.finishedAt ?? nowIso() }
  await db.transaction('rw', [db.sessions, db.scheduled], async () => {
    await db.sessions.put(next)
    if (s.scheduledWorkoutId && status !== 'abandoned') {
      const sc = await db.scheduled.get(s.scheduledWorkoutId)
      if (sc) await db.scheduled.put({ ...sc, status: status === 'completed' ? 'completed' : 'partial', updatedAt: nowIso() })
    }
  })
  return next
}

/** Marks a whole exercise as not done (or skipped) in a saved workout. */
export async function setExerciseDone(sessionId: string, slotId: string, done: boolean): Promise<void> {
  const logs = await db.setLogs.where('sessionId').equals(sessionId).filter((l) => l.slotId === slotId).toArray()
  for (const l of logs) await db.setLogs.put({ ...l, completed: done && (l.actualReps !== undefined || l.actualMinutes !== undefined), updatedAt: nowIso() })
  await touchSession(sessionId)
}

// ---------- reset one day ----------
export interface ResetPreview {
  date: string
  sessions: number
  sets: number
  plannedRows: number
}

export async function previewResetDay(date: string): Promise<ResetPreview> {
  const sessions = await db.sessions.where('date').equals(date).toArray()
  let sets = 0
  for (const s of sessions) sets += await db.setLogs.where('sessionId').equals(s.id).count()
  return { date, sessions: sessions.length, sets, plannedRows: await db.scheduled.where('date').equals(date).count() }
}

/**
 * Removes one date's workout session(s) and set logs and puts that day back to "not started".
 * Everything else stays: profile, settings, other dates, yoga, food, body weight, soreness.
 * It is one transaction, so either all of it happens or none of it does.
 */
export async function resetDay(date: string): Promise<{ sessions: number; sets: number }> {
  const plan = await getPlan()
  return db.transaction('rw', [db.sessions, db.setLogs, db.scheduled], async () => {
    const sessions = await db.sessions.where('date').equals(date).toArray()
    let sets = 0
    for (const s of sessions) {
      sets += await db.setLogs.where('sessionId').equals(s.id).delete()
      await db.sessions.delete(s.id)
    }
    const rows = await db.scheduled.where('date').equals(date).toArray()
    const template = plan?.schedule[weekdayIndex(date)] ?? null
    for (const r of rows) {
      // A one-off extra workout on a rest day has nothing to go back to, so it is removed.
      if (!template && !r.rescheduledFromId) await db.scheduled.delete(r.id)
      else await db.scheduled.put({ ...r, status: 'planned', workout: undefined, configHash: undefined, keepPlan: false, cardioChoice: undefined, updatedAt: nowIso() })
    }
    return { sessions: sessions.length, sets }
  })
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
  clearAllDrafts()
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
  })
}

export type DeleteResult = { ok: true; deleted: number } | { ok: false; error: string; remaining: number }

/**
 * Deletes everything this app saved on this device, in one transaction, then checks that nothing is left.
 * It only touches this app's own database: no other browser data and no cached app files are cleared.
 * If it fails, the transaction rolls back, so the data is still all there and it is safe to try again.
 */
export async function deleteAllData(): Promise<DeleteResult> {
  clearAllDrafts()
  let deleted = 0
  try {
    await db.transaction('rw', db.tables, async () => {
      for (const t of db.tables) {
        deleted += await t.count()
        await t.clear()
      }
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error', remaining: await countAll() }
  }
  const remaining = await countAll()
  if (remaining > 0) return { ok: false, error: 'Some records are still on this device.', remaining }
  return { ok: true, deleted }
}

async function countAll(): Promise<number> {
  let n = 0
  for (const t of db.tables) n += await t.count()
  return n
}

// ---------- per-page and per-exercise weight units ----------
async function convertSlotUnit(sessionId: string, slotId: string | null, from: WeightUnit, to: WeightUnit): Promise<void> {
  if (from === to) return
  const logs = await db.setLogs.where('sessionId').equals(sessionId).filter((l) => (slotId === null || l.slotId === slotId)).toArray()
  for (const l of logs) {
    if (l.weightUnit !== from) continue // already overridden to something else
    await db.setLogs.put({
      ...l, weightUnit: to,
      plannedWeight: l.plannedWeight === undefined ? undefined : tidy(convertWeight(l.plannedWeight, from, to)),
      actualWeight: l.actualWeight === undefined ? undefined : tidy(convertWeight(l.actualWeight, from, to)),
      updatedAt: nowIso(),
    })
  }
}

/** The default unit for the whole workout screen. Exercises with their own unit keep it. The physical weight never changes. */
export async function setSessionUnit(sessionId: string, unit: WeightUnit): Promise<void> {
  const s = await db.sessions.get(sessionId)
  if (!s || s.weightUnit === unit) return
  await db.transaction('rw', [db.sessions, db.setLogs], async () => {
    await convertSlotUnit(sessionId, null, s.weightUnit, unit)
    await db.sessions.put({ ...s, weightUnit: unit, updatedAt: nowIso() })
  })
}

/** Gives one exercise its own unit (an override of the page default). Its numbers are converted so the weight stays the same. */
export async function setExerciseUnit(sessionId: string, slotId: string, unit: WeightUnit): Promise<void> {
  const logs = await db.setLogs.where('sessionId').equals(sessionId).filter((l) => l.slotId === slotId).toArray()
  const from = logs[0]?.weightUnit
  if (!from || from === unit) return
  await db.transaction('rw', [db.sessions, db.setLogs], async () => {
    await convertSlotUnit(sessionId, slotId, from, unit)
    await touchSession(sessionId)
  })
}
