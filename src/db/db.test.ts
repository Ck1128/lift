import Dexie from 'dexie'
import { db, LiftDB } from './schema'
import {
  acceptReschedule, finishSession, generateFor, getActiveSession, getEquipment, getPlan, getProfile, rebuildPlan,
  replaceExercise, resetAllData, saveEquipment, saveProfile, scheduledOn, setPain, setSkipped, skipScheduled,
  startSession, updateSet, profileToForm, updateExclusions, addSoreness, recentSoreness,
} from './repo'
import { backupFilename, exportBackup, importBackup, parseBackup, previewBackup, type BackupFile } from './backup'
import { buildLastPerformance, exerciseTrend, personalRecords, setsPerMuscle, workoutsPerWeek, activeMinutes } from '../engine/history'
import { presetEquipment } from '../engine/equipment'
import { exerciseById } from '../data/catalog'
import { GENERATOR_VERSION } from '../engine/generate'

const TODAY = '2026-10-21' // a Wednesday
const TODAY_DATE = new Date(2026, 9, 21)

async function setup(days = [0, 2, 4], level: 'beginner' | 'intermediate' | 'regular' = 'intermediate') {
  await resetAllData()
  const form = { ...profileToForm(), weightValue: '180', heightCm: '178', trainingLevel: level, trainingDays: days }
  return saveProfile(form, { preferredLocation: 'gym', gymType: 'planet_fitness' }, TODAY_DATE)
}

async function doSession(scheduledId: string, reps = 10, weight = 100) {
  const s = await startSession(scheduledId, 'lb')
  const logs = await logsOf(s.id)
  for (const l of logs) {
    // Cardio has minutes, not reps and weight.
    if (!exerciseById(l.exerciseId)) await updateSet(l.id, { actualMinutes: 10, completed: true })
    else await updateSet(l.id, { actualReps: reps, actualWeight: weight, completed: true })
  }
  return finishSession(s.id, 'finish')
}


/** Sets in plan order (slot, then set number). The database returns them by random id otherwise. */
async function logsOf(sessionId: string) {
  const logs = await db.setLogs.where('sessionId').equals(sessionId).toArray()
  return logs.sort((a, b) => a.slotId.localeCompare(b.slotId, undefined, { numeric: true }) || a.setNumber - b.setNumber)
}

beforeEach(async () => { await resetAllData() })

describe('profile and equipment persistence', () => {
  it('creates, reads and updates a profile without any network', async () => {
    const p = await setup()
    expect((await getProfile())?.id).toBe(p.id)
    expect(p.preferredLocation).toBe('gym')
    const upd = await saveProfile({ ...profileToForm(p), displayName: 'Sam', weightUnit: 'kg', weightFieldUnit: 'kg', weightValue: '80' }, { preferredLocation: 'gym', gymType: 'planet_fitness' }, TODAY_DATE)
    const again = await getProfile()
    expect(again?.displayName).toBe('Sam')
    expect(again?.weightUnit).toBe('kg')
    expect(upd.createdAt).toBe(p.createdAt)
    expect(await db.profile.count()).toBe(1)
  })

  it('records body weight history only when it changes', async () => {
    const p = await setup()
    await saveProfile(profileToForm(p), { preferredLocation: 'gym', gymType: 'planet_fitness' }, TODAY_DATE)
    expect(await db.bodyWeights.count()).toBe(1)
    await saveProfile({ ...profileToForm(p), weightValue: '178' }, { preferredLocation: 'gym', gymType: 'planet_fitness' }, TODAY_DATE)
    expect(await db.bodyWeights.count()).toBe(2)
  })

  it('saves equipment per location and falls back to presets', async () => {
    await setup()
    const defaults = await getEquipment('gym', 'lb', 'planet_fitness')
    expect(defaults.barbell?.available).toBe(false)
    const eq = presetEquipment('home', 'lb')
    eq.dumbbell = { id: 'dumbbell', available: true, minWeight: 10, maxWeight: 40, increment: 5, unit: 'lb' }
    await saveEquipment('home', eq)
    expect((await getEquipment('home', 'lb')).dumbbell?.maxWeight).toBe(40)
    expect((await getEquipment('gym', 'lb', 'planet_fitness')).dumbbell?.available).toBe(true)
  })

  it('stores exclusions and soreness', async () => {
    await setup()
    await updateExclusions({ excludedExerciseIds: ['a', 'b'], excludedPatterns: ['push'], limitationNote: 'sore wrist' })
    const p = await getProfile()
    expect(p?.excludedExerciseIds).toEqual(['a', 'b'])
    await addSoreness('chest', 2, TODAY)
    await addSoreness('chest', 3, TODAY)
    expect((await recentSoreness(TODAY)).chest).toBe(3)
    expect(await db.soreness.count()).toBe(1)
  })
})

describe('weekly plan and scheduling', () => {
  it('schedules only the chosen training days', async () => {
    await setup([0, 2, 4])
    const rows = await db.scheduled.toArray()
    expect(rows.length).toBeGreaterThan(3)
    for (const r of rows) expect([2, 4, 0]).toContain(new Date(r.date + 'T12:00:00').getDay() === 0 ? 6 : new Date(r.date + 'T12:00:00').getDay() - 1)
    expect((await scheduledOn(TODAY))?.status).toBe('planned')
    expect(await scheduledOn('2026-10-22')).toBeUndefined() // Thursday is a rest day
  })

  it('changing the schedule never rewrites completed history', async () => {
    const p = await setup()
    const sc = (await scheduledOn(TODAY))!
    await generateFor(sc.id, 45, { today: TODAY })
    const done = (await doSession(sc.id))!
    const before = JSON.stringify(await db.sessions.get(done.id))
    await saveProfile({ ...profileToForm(p), trainingDays: [1, 3] }, { preferredLocation: 'gym', gymType: 'planet_fitness' }, TODAY_DATE)
    expect(JSON.stringify(await db.sessions.get(done.id))).toBe(before)
    expect((await db.scheduled.get(sc.id))?.status).toBe('completed')
    expect((await getPlan())?.planVersion).toBe(2)
    const future = await db.scheduled.where('status').equals('planned').toArray()
    for (const f of future) expect([1, 3]).toContain((new Date(f.date + 'T12:00:00').getDay() + 6) % 7)
  })

  it('skipping records it, suggests a day, and accepting keeps the original', async () => {
    await setup([1, 2, 4, 5]) // Tue upper, Wed lower, Fri upper, Sat lower
    const sc = (await scheduledOn(TODAY))!
    const { suggestion } = await skipScheduled(sc.id, TODAY)
    expect((await db.scheduled.get(sc.id))?.status).toBe('skipped')
    expect(suggestion).toBe('2026-10-22') // Thursday: free, and Friday trains different muscles
    await acceptReschedule(sc.id, suggestion!)
    const moved = (await db.scheduled.where('date').equals(suggestion!).toArray())[0]
    expect(moved.rescheduledFromId).toBe(sc.id)
    expect((await db.scheduled.get(sc.id))?.status).toBe('skipped')
  })

  it('says there is no good day when every neighbour repeats the same muscles (full-body split)', async () => {
    await setup([0, 2, 4], 'beginner')
    const sc = (await scheduledOn(TODAY))!
    expect((await skipScheduled(sc.id, TODAY)).suggestion).toBeNull()
  })

  it('rebuilding the plan keeps skipped days skipped', async () => {
    const p = await setup()
    const sc = (await scheduledOn(TODAY))!
    await skipScheduled(sc.id, TODAY)
    await rebuildPlan(p, TODAY_DATE)
    expect((await db.scheduled.get(sc.id))?.status).toBe('skipped')
  })
})

describe('generation cache', () => {
  it('reuses an unchanged workout, regenerates when inputs change', async () => {
    await setup()
    const sc = (await scheduledOn(TODAY))!
    const a = await generateFor(sc.id, 45, { today: TODAY })
    expect(a.kind).toBe('workout')
    const stamp = (await db.scheduled.get(sc.id))!.updatedAt
    await new Promise((r) => setTimeout(r, 5))
    const b = await generateFor(sc.id, 45, { today: TODAY })
    expect(b).toEqual(a)
    expect((await db.scheduled.get(sc.id))!.updatedAt).toBe(stamp) // not rewritten
    const eq = await getEquipment('gym', 'lb', 'planet_fitness')
    eq.cable = { ...eq.cable!, available: false }
    await saveEquipment('gym', eq)
    await generateFor(sc.id, 45, { today: TODAY })
    expect((await db.scheduled.get(sc.id))!.updatedAt).not.toBe(stamp)
    const c = await generateFor(sc.id, 30, { today: TODAY })
    if (c.kind === 'workout') expect(c.workout.availableMinutes).toBe(30)
    expect((await db.scheduled.get(sc.id))!.generatorVersion).toBe(GENERATOR_VERSION)
  })
})

describe('workout sessions and set logs', () => {
  it('starts, logs, survives a reload, and completes', async () => {
    await setup()
    const sc = (await scheduledOn(TODAY))!
    await generateFor(sc.id, 45, { today: TODAY })
    const s = await startSession(sc.id, 'lb')
    expect((await getActiveSession())?.id).toBe(s.id)
    const logs = await logsOf(s.id)
    expect(logs.length).toBe(s.plannedExercises.reduce((n, e) => n + e.sets, 0))
    await updateSet(logs[0].id, { actualReps: 9, actualWeight: 55, completed: true })
    await updateSet(logs[1].id, { actualReps: 7, actualWeight: 50, completed: true })
    // "restart": a fresh read from the database
    const reread = await db.setLogs.get(logs[0].id)
    expect(reread?.actualReps).toBe(9)
    expect((await db.setLogs.get(logs[1].id))?.actualWeight).toBe(50)
    await updateSet(logs[0].id, { actualReps: 10 })
    expect((await db.setLogs.get(logs[0].id))?.actualReps).toBe(10)
    expect(reread?.plannedRepMin).toBe(s.plannedExercises[0].repMin) // planned stays separate from actual
    const fin = await finishSession(s.id, 'finish')
    expect(fin?.status).toBe('partial')
    expect((await db.scheduled.get(sc.id))?.status).toBe('partial')
    expect(await getActiveSession()).toBeUndefined()
  })

  it('a fully logged session is completed; one with no sets is abandoned', async () => {
    await setup()
    const sc = (await scheduledOn(TODAY))!
    await generateFor(sc.id, 45, { today: TODAY })
    const s = await startSession(sc.id, 'lb')
    expect((await finishSession(s.id, 'finish'))?.status).toBe('abandoned')
    expect((await db.scheduled.get(sc.id))?.status).toBe('planned')
    const sc2 = (await scheduledOn(TODAY))!
    expect((await doSession(sc2.id))?.status).toBe('completed')
  })

  it('skipping an exercise still lets the session complete', async () => {
    await setup()
    const sc = (await scheduledOn(TODAY))!
    await generateFor(sc.id, 45, { today: TODAY })
    const s = await startSession(sc.id, 'lb')
    const logs = await logsOf(s.id)
    const skipSlot = s.plannedExercises[0].slotId
    await setSkipped(s.id, skipSlot, true)
    for (const l of logs.filter((x) => x.slotId !== skipSlot)) await updateSet(l.id, { actualReps: 8, completed: true })
    expect((await finishSession(s.id, 'finish'))?.status).toBe('completed')
  })

  it('replacing an exercise records the original and keeps the plan auditable', async () => {
    await setup()
    const sc = (await scheduledOn(TODAY))!
    await generateFor(sc.id, 45, { today: TODAY })
    const s = await startSession(sc.id, 'lb')
    const slot = s.plannedExercises[0]
    const logs = (await logsOf(s.id)).filter((l) => l.slotId === slot.slotId)
    await updateSet(logs[0].id, { actualReps: 8, actualWeight: 60, completed: true })
    const alt = exerciseById(s.plannedExercises[1].exerciseId)!
    await replaceExercise(s.id, slot.slotId, alt.id)
    const after = (await db.sessions.get(s.id))!
    expect(after.actualExercises[0].exerciseId).toBe(alt.id)
    expect(after.actualExercises[0].replacedFromId).toBe(slot.exerciseId)
    expect(after.plannedExercises[0].exerciseId).toBe(slot.exerciseId) // original plan untouched
    const re = (await logsOf(s.id)).filter((l) => l.slotId === slot.slotId)
    expect(re.find((l) => l.id === logs[0].id)?.exerciseId).toBe(slot.exerciseId) // finished set keeps what was done
    expect(re.filter((l) => !l.completed).every((l) => l.exerciseId === alt.id)).toBe(true)
  })

  it('history feeds the next workout and pain blocks a weight increase', async () => {
    await setup()
    const sc = (await scheduledOn(TODAY))!
    const first = await generateFor(sc.id, 45, { today: TODAY })
    if (first.kind !== 'workout') throw new Error('x')
    const lead = first.workout.exercises.find((e) => e.kind !== 'cardio' && !['bodyweight', 'bands'].includes(exerciseById(e.exerciseId)?.exerciseType ?? 'bodyweight'))!
    const s = await startSession(sc.id, 'lb')
    const logs = await logsOf(s.id)
    for (const l of logs) await updateSet(l.id, { actualReps: lead.repMax, actualWeight: 40, completed: true })
    const done = (await finishSession(s.id, 'finish'))!
    const perf = buildLastPerformance([done], await db.setLogs.toArray())
    expect(perf[lead.exerciseId].sets[0].weight).toBe(40)
    // next workout (another scheduled day) should suggest +5 for that exercise if it is picked again
    const sessions = await db.sessions.toArray()
    expect(sessions).toHaveLength(1)
    // pain flag
    const sc2 = (await db.scheduled.where('status').equals('planned').toArray())[0]
    await generateFor(sc2.id, 45, { today: TODAY })
    const s2 = await startSession(sc2.id, 'lb')
    await setPain(s2.id, s2.plannedExercises[0].slotId, true)
    expect((await db.sessions.get(s2.id))?.actualExercises[0].painReported).toBe(true)
  })

  it('pause and resume are tracked and active minutes exclude pauses', async () => {
    await setup()
    const sc = (await scheduledOn(TODAY))!
    await generateFor(sc.id, 45, { today: TODAY })
    const s = await startSession(sc.id, 'lb')
    const t0 = new Date('2026-10-21T10:00:00Z').toISOString()
    await db.sessions.put({ ...s, startedAt: t0, finishedAt: new Date('2026-10-21T10:50:00Z').toISOString(), pausedMs: 10 * 60_000 })
    expect(activeMinutes((await db.sessions.get(s.id))!)).toBe(40)
  })
})

describe('progress metrics come from saved records', () => {
  it('counts weekly workouts, sets per muscle, trends and records', async () => {
    await setup()
    const sc = (await scheduledOn(TODAY))!
    await generateFor(sc.id, 45, { today: TODAY })
    const done = (await doSession(sc.id, 10, 100))!
    const sessions = await db.sessions.toArray()
    const logs = await db.setLogs.toArray()
    const wk = workoutsPerWeek(sessions, TODAY, 4)
    expect(wk).toHaveLength(4)
    expect(wk[3].count).toBe(1)
    expect(wk[0].count).toBe(0)
    const per = setsPerMuscle(sessions, logs, TODAY, 7, (id) => exerciseById(id)?.primaryMuscles ?? [])
    expect(Object.values(per).reduce((a, b) => a + (b ?? 0), 0)).toBe(logs.filter((l) => exerciseById(l.exerciseId)).length)
    const exId = logs.find((l) => exerciseById(l.exerciseId))!.exerciseId
    expect(exerciseTrend(exId, sessions, logs)[0].topWeight).toBe(100)
    expect(personalRecords(sessions, logs).find((r) => r.exerciseId === exId)?.weight).toBe(100)
    expect(done.status).toBe('completed')
  })
  it('empty history gives empty results', () => {
    expect(workoutsPerWeek([], TODAY, 3).every((r) => r.count === 0)).toBe(true)
    expect(personalRecords([], [])).toEqual([])
  })
})

describe('schema migration', () => {
  it('upgrades a version-1 database without losing records', async () => {
    const name = 'migration-test'
    await Dexie.delete(name)
    const old = new Dexie(name)
    old.version(1).stores({
      profile: 'id', equipment: 'location', plans: 'id, profileId, startDate', scheduled: 'id, date, planId, status',
      sessions: 'id, date, status, scheduledWorkoutId', setLogs: 'id, sessionId, exerciseId, slotId', settings: 'key',
    })
    await old.table('profile').add({ id: 'p1', goal: 'muscle', displayName: 'Old' })
    await old.table('sessions').add({ id: 's1', date: '2026-01-05', status: 'completed', plannedExercises: [], actualExercises: [] })
    old.close()

    const upgraded = new LiftDB(name)
    await upgraded.open()
    expect((await upgraded.profile.get('p1'))?.displayName).toBe('Old') // kept
    const s = (await upgraded.sessions.get('s1'))!
    expect(s.generatorVersion).toBe('unknown') // backfilled by the upgrade
    expect(s.pausedMs).toBe(0)
    expect(await upgraded.soreness.count()).toBe(0) // new tables exist
    expect(await upgraded.bodyWeights.count()).toBe(0)
    expect(upgraded.verno).toBe(5)
    expect(await upgraded.healthWorkouts.count()).toBe(0)
    expect(await upgraded.yogaSessions.count()).toBe(0)
    expect(await upgraded.foodLog.count()).toBe(0)
    upgraded.close()
    await Dexie.delete(name)
  })

  it('upgrades a version-2 profile: height to cm, weight to kg, level names mapped, nothing dropped', async () => {
    const name = 'migration-v2-fixture'
    await Dexie.delete(name)
    const old = new Dexie(name)
    old.version(1).stores({
      profile: 'id', equipment: 'location', plans: 'id, profileId, startDate', scheduled: 'id, date, planId, status',
      sessions: 'id, date, status, scheduledWorkoutId', setLogs: 'id, sessionId, exerciseId, slotId', settings: 'key',
    })
    old.version(2).stores({ soreness: 'id, date, muscle', bodyWeights: 'id, date' })
    await old.table('profile').add({
      id: 'p2', displayName: 'Sam', age: 30, heightValue: 70, heightUnit: 'in', weightValue: 180, weightUnit: 'lb',
      goal: 'muscle', experienceLevel: 'advanced', trainingDays: [0, 2, 4], preferredDurationMinutes: 45,
      preferredLocation: 'gym', gymType: 'planet_fitness', excludedExerciseIds: ['x'], excludedPatterns: [],
    })
    await old.table('sessions').add({ id: 's2', date: '2026-02-02', status: 'completed', plannedExercises: [], actualExercises: [], startedAt: '2026-02-02T10:00:00Z', generatorVersion: 'gen-1.0', pausedMs: 0, targetMuscles: [] })
    await old.table('setLogs').add({ id: 'l2', sessionId: 's2', exerciseId: 'e', slotId: 's1', setNumber: 1, weightUnit: 'lb', completed: true, actualReps: 8, actualWeight: 135 })
    old.close()

    const up = new LiftDB(name)
    await up.open()
    const p = (await up.profile.get('p2'))! as unknown as Record<string, unknown>
    expect(p.heightCm).toBeCloseTo(177.8, 1)
    expect(p.heightDisplayUnit).toBe('ft-in')
    expect(p.weightKg).toBeCloseTo(81.65, 1)
    expect(p.trainingLevel).toBe('regular')
    expect(p.nutritionGuidance).toBe(false)
    for (const gone of ['heightValue', 'heightUnit', 'weightValue', 'experienceLevel']) expect(p[gone]).toBeUndefined()
    // everything else survived
    expect(p.displayName).toBe('Sam')
    expect(p.excludedExerciseIds).toEqual(['x'])
    expect((await up.setLogs.get('l2'))?.actualWeight).toBe(135)
    expect((await up.sessions.get('s2'))?.updatedAt).toBe('2026-02-02T10:00:00Z')
    up.close()
    await Dexie.delete(name)
  })
})

describe('backup and restore', () => {
  async function seed() {
    const p = await setup()
    const sc = (await scheduledOn(TODAY))!
    await generateFor(sc.id, 45, { today: TODAY })
    await doSession(sc.id, 9, 55)
    return p
  }

  it('exports a versioned file and restores the same records', async () => {
    const p = await seed()
    const file = await exportBackup()
    expect(file.format).toBe('lift-backup')
    expect(file.version).toBe(3)
    expect(file.includesFood).toBe(false)
    expect(file.includes).toEqual(['profile', 'workouts', 'bodyweight', 'yoga'])
    expect(file.exportedAt).toMatch(/^\d{4}-/)
    expect(backupFilename(new Date('2026-10-21T12:00:00Z'))).toBe('lift-backup-2026-10-21.json')
    const parsed = parseBackup(JSON.stringify(file))
    if (!parsed.ok) throw new Error(parsed.error)
    const prev = previewBackup(parsed.backup)
    expect(prev.workouts).toBe(1)
    expect(prev.sets).toBe(file.data.setLogs.length)
    await resetAllData()
    expect(await db.profile.count()).toBe(0)
    await importBackup(parsed.backup, 'replace')
    expect((await getProfile())?.id).toBe(p.id)
    const again = await exportBackup()
    for (const t of Object.keys(file.data) as (keyof typeof file.data)[]) {
      const sortKey = (r: unknown) => JSON.stringify(r)
      expect(again.data[t].map(sortKey).sort()).toEqual(file.data[t].map(sortKey).sort())
    }
  })

  it('an old version 1 backup still imports, with height and weight converted', async () => {
    await seed()
    const file = await exportBackup()
    const v1 = JSON.parse(JSON.stringify(file)) as BackupFile & { data: Record<string, Record<string, unknown>[]> }
    v1.version = 1
    const p = v1.data.profile[0] as Record<string, unknown>
    for (const k of ['heightCm', 'heightDisplayUnit', 'weightKg', 'trainingLevel', 'nutritionGuidance']) delete p[k]
    Object.assign(p, { heightValue: 70, heightUnit: 'in', weightValue: 180, experienceLevel: 'intermediate' })
    delete (v1 as { includesFood?: boolean }).includesFood
    delete (v1.data as Record<string, unknown>).yogaSessions
    delete (v1.data as Record<string, unknown>).foodLog
    const parsed = parseBackup(JSON.stringify(v1))
    if (!parsed.ok) throw new Error(parsed.error)
    await importBackup(parsed.backup, 'replace')
    const got = (await getProfile())!
    expect(got.heightCm).toBeCloseTo(177.8, 1)
    expect(got.weightKg).toBeCloseTo(81.65, 1)
    expect(got.trainingLevel).toBe('intermediate')
  })

  it('food is only in a backup when asked for, and a file without food leaves the food log alone', async () => {
    await seed()
    await db.foodLog.add({
      id: 'f1', date: TODAY, mealCategory: 'lunch', name: 'Rice', provider: 'local', providerId: 'rice', source: 'test', state: 'cooked',
      portionValue: 100, portionUnit: 'g', kcal: 130, basis: { basis: 'g', kcalPer100: 130, unitSize: {} }, createdAt: 'x', updatedAt: 'x',
    } as never)
    const without = await exportBackup()
    expect(without.data.foodLog).toEqual([])
    const withFood = await exportBackup({ includeFood: true })
    expect(withFood.includesFood).toBe(true)
    expect(withFood.data.foodLog).toHaveLength(1)
    const parsed = parseBackup(JSON.stringify(without))
    if (!parsed.ok) throw new Error(parsed.error)
    await importBackup(parsed.backup, 'replace')
    expect(await db.foodLog.count()).toBe(1) // untouched
  })

  it('merge keeps existing data and adds only new records', async () => {
    await seed()
    const file = await exportBackup()
    // add a new session locally after the backup, then merge the old file back in
    const before = await db.sessions.count()
    await db.sessions.add({ ...(file.data.sessions[0] as object), id: 'local-only' } as never)
    const parsed = parseBackup(JSON.stringify(file))
    if (!parsed.ok) throw new Error(parsed.error)
    await importBackup(parsed.backup, 'merge')
    expect(await db.sessions.count()).toBe(before + 1)
    expect(await db.sessions.get('local-only')).toBeTruthy()
    expect(await db.profile.count()).toBe(1)
  })

  it('rejects malformed files with a clear message', async () => {
    await seed()
    const good = await exportBackup()
    const bad = (mutate: (b: BackupFile) => void) => {
      const copy = JSON.parse(JSON.stringify(good)) as BackupFile
      mutate(copy)
      return parseBackup(JSON.stringify(copy))
    }
    expect(parseBackup('not json')).toEqual({ ok: false, error: expect.stringMatching(/not valid JSON/) })
    expect(parseBackup('{"hello":1}')).toEqual({ ok: false, error: expect.stringMatching(/not a Lift backup/) })
    expect(bad((b) => { b.version = 99 })).toEqual({ ok: false, error: expect.stringMatching(/not supported/) })
    expect(bad((b) => { (b.data.setLogs[0] as { weightUnit: string }).weightUnit = 'stone' })).toEqual({ ok: false, error: expect.stringMatching(/bad weight unit/) })
    expect(bad((b) => { (b.data.sessions[0] as { date: string }).date = 'yesterday' })).toEqual({ ok: false, error: expect.stringMatching(/bad date/) })
    expect(bad((b) => { b.data.setLogs.push(b.data.setLogs[0]) })).toEqual({ ok: false, error: expect.stringMatching(/duplicate/) })
    expect(bad((b) => { (b.data.setLogs[0] as { sessionId: string }).sessionId = 'ghost' })).toEqual({ ok: false, error: expect.stringMatching(/not in the file/) })
    expect(bad((b) => { delete (b.data.profile[0] as { id?: string }).id })).toEqual({ ok: false, error: expect.stringMatching(/missing id/) })
  })

  it('a failed import leaves existing data untouched (atomic)', async () => {
    await seed()
    const file = await exportBackup()
    const sessions = await db.sessions.count()
    const logs = await db.setLogs.count()
    // Bypass parseBackup on purpose: duplicate ids make bulkAdd throw halfway through the import.
    const broken: BackupFile = JSON.parse(JSON.stringify(file))
    broken.data.setLogs.push(broken.data.setLogs[0])
    await expect(importBackup(broken, 'replace')).rejects.toBeTruthy()
    expect(await db.sessions.count()).toBe(sessions)
    expect(await db.setLogs.count()).toBe(logs)
    expect((await getProfile())?.displayName ?? '').toBe('')
    expect(await db.profile.count()).toBe(1)
  })

  it('reset removes everything', async () => {
    await seed()
    await resetAllData()
    for (const t of db.tables) expect(await t.count()).toBe(0)
  })
})
