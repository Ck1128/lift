import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { replaceExercise, resetAllData, undoReplace } from './repo'
import { CATALOG } from '../data/catalog'

const A = CATALOG.find((e) => e.primaryMuscles[0] === 'chest' && e.exerciseType === 'dumbbell')!
const B = CATALOG.find((e) => e.primaryMuscles[0] === 'chest' && e.exerciseType === 'machine')!
const C = CATALOG.find((e) => e.primaryMuscles[0] === 'back')!

async function open(status: 'in_progress' | 'completed' = 'in_progress') {
  await resetAllData()
  const t = new Date().toISOString()
  const slot = (id: string, ex: string) => ({ slotId: id, exerciseId: ex, name: 'x', sets: 3, repMin: 8, repMax: 10, restSeconds: 60, loadNote: '', why: '' })
  await db.sessions.add({
    id: 's', date: '2026-10-21', startedAt: t, status, title: 't', planVersion: 1, generatorVersion: 'g', targetMuscles: ['chest'], pausedMs: 0, weightUnit: 'lb',
    plannedExercises: [slot('s1', A.id), slot('s2', C.id)],
    actualExercises: [{ slotId: 's1', exerciseId: A.id, skipped: false, painReported: false }, { slotId: 's2', exerciseId: C.id, skipped: false, painReported: false }],
  } as never)
  for (const [slotId, ex] of [['s1', A.id], ['s2', C.id]] as const) {
    for (let n = 1; n <= 3; n++) {
      await db.setLogs.add({
        id: `${slotId}-${n}`, sessionId: 's', slotId, exerciseId: ex, setNumber: n, plannedRepMin: 8, plannedRepMax: 10, plannedWeight: 30, weightUnit: 'lb',
        completed: false, createdAt: t, updatedAt: t,
      })
    }
  }
}
const done = (id: string) => db.setLogs.update(id, { completed: true, actualReps: 9, actualWeight: 40 })

beforeEach(async () => { await resetAllData() })

describe('replace and per-exercise equipment (US-064, US-065)', () => {
  it('changes only the chosen slot and keeps logged sets by default', async () => {
    await open()
    await done('s1-1')
    await done('s2-1')
    await replaceExercise('s', 's1', B.id)
    const s = (await db.sessions.get('s'))!
    expect(s.actualExercises[0].exerciseId).toBe(B.id)
    expect(s.actualExercises[0].replacedFromId).toBe(A.id)
    expect(s.actualExercises[1].exerciseId).toBe(C.id) // other slot untouched
    expect(s.plannedExercises[0].exerciseId).toBe(A.id) // the plan itself is not rewritten
    const logs = await db.setLogs.toArray()
    expect(logs.find((l) => l.id === 's1-1')).toMatchObject({ exerciseId: A.id, completed: true, actualWeight: 40 })
    expect(logs.find((l) => l.id === 's1-2')).toMatchObject({ exerciseId: B.id, completed: false })
    expect(logs.find((l) => l.id === 's2-1')).toMatchObject({ exerciseId: C.id, completed: true, actualWeight: 40 })
  })

  it('reset clears only that exercise\'s sets', async () => {
    await open()
    await done('s1-1')
    await done('s2-1')
    await replaceExercise('s', 's1', B.id, { logs: 'reset' })
    const logs = await db.setLogs.toArray()
    for (const l of logs.filter((x) => x.slotId === 's1')) expect(l).toMatchObject({ exerciseId: B.id, completed: false, actualReps: undefined })
    expect(logs.find((l) => l.id === 's2-1')).toMatchObject({ completed: true, actualReps: 9 })
  })

  it('undo restores the slot exactly, including a reset', async () => {
    await open()
    await done('s1-1')
    const before = (await db.setLogs.toArray()).sort((a, b) => a.id.localeCompare(b.id))
    await replaceExercise('s', 's1', B.id, { logs: 'reset' })
    expect(await undoReplace('s', 's1')).toEqual({ ok: true })
    const after = (await db.setLogs.toArray()).sort((a, b) => a.id.localeCompare(b.id))
    expect(after).toEqual(before)
    const s = (await db.sessions.get('s'))!
    expect(s.actualExercises[0]).toMatchObject({ exerciseId: A.id })
    expect(s.actualExercises[0].replacedFromId).toBeUndefined()
    expect(s.actualExercises[0].previous).toBeUndefined()
  })

  it('refuses to undo if that would erase sets logged after the swap', async () => {
    await open()
    await replaceExercise('s', 's1', B.id)
    await done('s1-2')
    const r = await undoReplace('s', 's1')
    expect(r.ok).toBe(false)
    expect((await db.setLogs.get('s1-2'))?.completed).toBe(true)
    expect((await db.sessions.get('s'))!.actualExercises[0].exerciseId).toBe(B.id)
  })

  it('does nothing for the same exercise, an unknown one, or a finished workout', async () => {
    await open()
    await replaceExercise('s', 's1', A.id)
    expect((await db.sessions.get('s'))!.actualExercises[0].previous).toBeUndefined()
    await expect(replaceExercise('s', 's1', 'nope')).rejects.toThrow()
    await open('completed')
    await replaceExercise('s', 's1', B.id)
    expect((await db.sessions.get('s'))!.actualExercises[0].exerciseId).toBe(A.id) // history is never rewritten
  })

  it('a second swap can still be undone back to the one before it', async () => {
    await open()
    await replaceExercise('s', 's1', B.id)
    const third = CATALOG.find((e) => e.primaryMuscles[0] === 'chest' && e.id !== A.id && e.id !== B.id)!
    await replaceExercise('s', 's1', third.id)
    await undoReplace('s', 's1')
    expect((await db.sessions.get('s'))!.actualExercises[0].exerciseId).toBe(B.id)
  })
})
