import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { ensureScheduled, finishSession, generateFor, getSorenessRating, recentSoreness, saveSorenessRating, getEquipment, getProfile, profileToForm, resetAllData, saveProfile, scheduledOn, startSession } from './repo'
import { activeProgram, openProgramDay, setProgram } from './programRepo'

const TODAY = '2026-11-05'
const FRI = '2026-11-06' // a weekday training day in the default plan (Mon, Wed, Fri)

beforeEach(async () => {
  await resetAllData()
  await saveProfile({ ...profileToForm(), weightValue: '180', heightCm: '178', trainingLevel: 'beginner', birthDate: '1990-05-15', sex: 'male' }, { preferredLocation: 'gym', gymType: 'standard' }, new Date(2026, 10, 5, 9))
})

describe('Home program in the database', () => {
  it('changes nothing but the plan: location and equipment stay, unstarted upcoming weekday days are cleared', async () => {
    const before = await getEquipment('home', 'lb')
    expect((await db.scheduled.toArray()).length).toBeGreaterThan(0)
    await setProgram('home', 0, TODAY)
    expect((await getProfile())!.preferredLocation).toBe('gym')
    expect(await getEquipment('home', 'lb')).toEqual(before)
    expect((await db.scheduled.toArray()).filter((r) => r.date >= TODAY)).toHaveLength(0)
    expect((await activeProgram())!.next).toBe(0)
  })

  it('opening a day, finishing it and the next day moves on; turning it off brings the weekday plan back', async () => {
    await setProgram('home', 0, TODAY)
    const row = (await openProgramDay(TODAY, 0))!
    expect(row.focus).toBe('Home · Day 1: A1 · Legs + Pull (intro)')
    // Regenerating a program day gives the same written workout.
    const r = await generateFor(row.id, 20, { today: TODAY, force: true })
    expect(r.kind === 'workout' && r.workout.exercises.length).toBe(8)
    const s = await startSession(row.id, 'lb')
    const logs = await db.setLogs.where('sessionId').equals(s.id).toArray()
    expect(logs.find((l) => l.exerciseId === 'prog-goblet-squat')!.actualWeight).toBe(12)
    for (const l of logs) await db.setLogs.update(l.id, { completed: true, actualReps: l.plannedRepMax || undefined, actualMinutes: l.actualMinutes })
    await finishSession(s.id, 'finish')
    expect((await scheduledOn(TODAY))!.status).toBe('completed')
    expect((await activeProgram())!.next).toBe(1)

    await setProgram(null, 0, TODAY)
    expect(await activeProgram()).toBeNull()
    expect((await db.scheduled.toArray()).some((x) => x.programId === undefined)).toBe(true)
  })

  it('a weekday plan update running while Home is switched on never leaves a second row for today', async () => {
    for (let i = 0; i < 20; i++) {
      await resetAllData()
      await saveProfile({ ...profileToForm(), weightValue: '180', heightCm: '178', trainingLevel: 'beginner', birthDate: '1990-05-15', sex: 'male' }, { preferredLocation: 'gym', gymType: 'standard' }, new Date(2026, 10, 5, 9))
      await db.scheduled.clear()
      await ensureScheduled(FRI, 1)
      expect(await db.scheduled.where('date').equals(FRI).count()).toBe(1) // Friday is a training day, so the race is real
      await db.scheduled.clear()
      await Promise.all([ensureScheduled(FRI, 14), setProgram('home', 0, FRI), ensureScheduled(FRI, 14)])
      await ensureScheduled(FRI, 14)
      await openProgramDay(FRI, 0)
      await ensureScheduled(FRI, 14)
      const rows = (await db.scheduled.where('date').equals(FRI).toArray()).filter((r) => r.status === 'planned')
      expect(rows).toHaveLength(1)
      expect(rows[0].programId).toBe('home')
      expect((await scheduledOn(FRI))!.workout).toBeDefined()
    }
  })

  it('the soreness meter saves per-muscle soreness and reshapes an opened Home day', async () => {
    await setProgram('home', 3, TODAY)
    const row = (await openProgramDay(TODAY, 3))!
    expect(row.workout!.exercises.find((e) => e.name === 'Goblet squat')!.sets).toBe(3)
    await saveSorenessRating(TODAY, { level: 6, areas: ['quads', 'glutes'] })
    expect(await getSorenessRating(TODAY)).toEqual({ level: 6, areas: ['quads', 'glutes'] })
    expect(await recentSoreness(TODAY)).toEqual({ quads: 2, glutes: 2 })
    expect((await scheduledOn(TODAY))!.workout!.exercises.find((e) => e.name === 'Goblet squat')!.sets).toBe(2)
    // Back to fresh clears it.
    await saveSorenessRating(TODAY, { level: 1, areas: [] })
    expect(await recentSoreness(TODAY)).toEqual({})
    expect((await scheduledOn(TODAY))!.workout!.exercises.find((e) => e.name === 'Goblet squat')!.sets).toBe(3)
  })

  it('picking another day after starting and discarding one opens the picked day, not the discarded one', async () => {
    await setProgram('home', 2, TODAY)
    const d3 = (await openProgramDay(TODAY, 2))!
    const s = await startSession(d3.id, 'lb')
    await finishSession(s.id, 'abandon')
    const d4 = (await openProgramDay(TODAY, 3))!
    expect(d4.programDay).toBe(3)
    const shown = (await scheduledOn(TODAY))!
    expect(shown.programDay).toBe(3)
    expect(shown.workout!.title).toMatch(/Day 4/)
    // Only one workout is left to do today.
    expect((await db.scheduled.where('date').equals(TODAY).toArray()).filter((r) => r.status === 'planned')).toHaveLength(1)
  })

  it('picking another day after finishing one today opens the picked day', async () => {
    await setProgram('home', 2, TODAY)
    const d3 = (await openProgramDay(TODAY, 2))!
    const s = await startSession(d3.id, 'lb')
    for (const l of await db.setLogs.where('sessionId').equals(s.id).toArray()) await db.setLogs.update(l.id, { completed: true, actualMinutes: l.actualMinutes })
    await finishSession(s.id, 'finish')
    await openProgramDay(TODAY, 3)
    expect((await scheduledOn(TODAY))!.programDay).toBe(3)
  })

  it('skipping ahead sets the next day', async () => {
    await setProgram('home', 0, TODAY)
    await setProgram('home', 3, TODAY)
    expect((await activeProgram())!.next).toBe(3)
  })
})
