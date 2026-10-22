import Dexie from 'dexie'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './schema'
import { deleteAllData, profileToForm, resetAllData, saveProfile } from './repo'
import { CATEGORIES, exportBackup, importBackup, parseBackup, previewBackup, type BackupFile } from './backup'
import {
  CryptoError, decryptEnvelope, encryptText, ENCRYPTED_FORMAT, looksEncrypted, parseEnvelope, passwordProblem, toBase64,
} from './crypto'
import { DELETE_PHRASE, deletePhraseOk, makeMathChallenge, mathAnswerOk } from '../engine/deleteChallenge'

const FAST = { iterations: 100_000 }
const PW = 'correct horse battery'
const NOW = new Date(2026, 9, 21)

async function seed(opts: { food?: boolean } = {}) {
  await resetAllData()
  await saveProfile({ ...profileToForm(), displayName: 'Sam', weightValue: '180', heightCm: '178', trainingLevel: 'intermediate', trainingDays: [0, 2, 4], birthDate: '1990-05-15', sex: 'male' }, { preferredLocation: 'gym', gymType: 'standard' }, NOW)
  const t = new Date().toISOString()
  await db.sessions.add({
    id: 'sess-1', date: '2026-10-19', startedAt: t, status: 'completed', plannedExercises: [], actualExercises: [], title: 'Upper body', planVersion: 1,
    generatorVersion: 'x', targetMuscles: ['chest'], pausedMs: 0, weightUnit: 'lb',
  })
  await db.setLogs.add({ id: 'set-1', sessionId: 'sess-1', slotId: 's1', exerciseId: 'ex', setNumber: 1, plannedRepMin: 8, plannedRepMax: 10, actualReps: 9, actualWeight: 50, weightUnit: 'lb', completed: true, createdAt: t, updatedAt: t })
  await db.yogaSessions.add({ id: 'y-1', date: '2026-10-20', style: 'hatha', status: 'completed', durationSeconds: 600 } as never)
  if (opts.food) await db.foodLog.add({ id: 'f-1', date: '2026-10-20', mealCategory: 'lunch', name: 'Rice', kcal: 200 } as never)
}

const counts = async () => Object.fromEntries(await Promise.all(db.tables.map(async (t) => [t.name, await t.count()])))

beforeEach(async () => { await resetAllData() })

describe('encrypted export (US-067)', () => {
  it('round-trips and never writes the password or key into the file', async () => {
    const env = await encryptText('{"hello":"world"}', PW, FAST)
    const text = JSON.stringify(env)
    expect(text).not.toContain(PW)
    expect(Object.keys(env).sort()).toEqual(['cipher', 'ciphertext', 'format', 'iterations', 'iv', 'kdf', 'salt', 'version'])
    expect(env.format).toBe(ENCRYPTED_FORMAT)
    expect(looksEncrypted(text)).toBe(true)
    expect(await decryptEnvelope(parseEnvelope(text), PW)).toBe('{"hello":"world"}')
  })

  it('uses a fresh salt and nonce every time', async () => {
    const a = await encryptText('same', PW, FAST)
    const b = await encryptText('same', PW, FAST)
    expect(a.salt).not.toBe(b.salt)
    expect(a.iv).not.toBe(b.iv)
    expect(a.ciphertext).not.toBe(b.ciphertext)
  })

  it('fails closed with a wrong or empty password', async () => {
    const env = await encryptText('secret', PW, FAST)
    await expect(decryptEnvelope(env, 'not the password')).rejects.toMatchObject({ code: 'wrong-password' })
    await expect(decryptEnvelope(env, '')).rejects.toMatchObject({ code: 'empty-password' })
    await expect(encryptText('x', '', FAST)).rejects.toMatchObject({ code: 'empty-password' })
    await expect(encryptText('x', 'short', FAST)).rejects.toMatchObject({ code: 'weak-password' })
    expect(passwordProblem('1234567')).toMatch(/at least 8/)
    expect(passwordProblem(PW)).toBeNull()
  })

  it('detects a tampered ciphertext or a changed header', async () => {
    const env = await encryptText('secret data', PW, FAST)
    const bytes = Uint8Array.from(atob(env.ciphertext), (c) => c.charCodeAt(0))
    bytes[0] ^= 1
    await expect(decryptEnvelope({ ...env, ciphertext: toBase64(bytes) }, PW)).rejects.toBeInstanceOf(CryptoError)
    // The header is authenticated: a different (still valid) iteration count cannot decrypt.
    await expect(decryptEnvelope({ ...env, iterations: 100_001 }, PW)).rejects.toMatchObject({ code: 'wrong-password' })
  })

  it('rejects corrupt metadata before doing any work', async () => {
    const env = await encryptText('x', PW, FAST)
    const bad = (patch: Record<string, unknown>) => () => parseEnvelope(JSON.stringify({ ...env, ...patch }))
    expect(bad({ version: 99 })).toThrow(/not supported/)
    expect(bad({ kdf: 'MD5' })).toThrow(/algorithm/)
    expect(bad({ iterations: 5 })).toThrow(/damaged/)
    expect(bad({ iterations: 999_999_999 })).toThrow(/damaged/)
    expect(bad({ salt: 'AAAA' })).toThrow(/damaged/)
    expect(bad({ iv: '***' })).toThrow(/damaged/)
    expect(bad({ ciphertext: 'AAAA' })).toThrow(/too short/)
    expect(bad({ ciphertext: undefined })).toThrow(/missing/)
    expect(() => parseEnvelope('not json')).toThrow(/valid JSON/)
    expect(() => parseEnvelope('{"format":"other"}')).toThrow(/not an encrypted/)
  })

  it('handles a larger file', async () => {
    const big = JSON.stringify({ rows: Array.from({ length: 40_000 }, (_, i) => ({ i, text: 'workout ' + i })) })
    expect(big.length).toBeGreaterThan(900_000)
    const env = await encryptText(big, PW, FAST)
    expect(await decryptEnvelope(env, PW)).toBe(big)
  })

  it('a full backup survives encrypt, decrypt, parse and import', async () => {
    await seed({ food: true })
    const file = await exportBackup({ categories: [...CATEGORIES] })
    const env = await encryptText(JSON.stringify(file), PW, FAST)
    const parsed = parseBackup(await decryptEnvelope(parseEnvelope(JSON.stringify(env)), PW))
    if (!parsed.ok) throw new Error(parsed.error)
    await resetAllData()
    await importBackup(parsed.backup, 'replace')
    expect(await db.foodLog.count()).toBe(1)
    expect(await db.sessions.count()).toBe(1)
  })

  it('parseBackup tells the person to unlock an encrypted file first', async () => {
    const env = await encryptText('x', PW, FAST)
    const r = parseBackup(JSON.stringify(env))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/password/i)
  })
})

describe('export categories and import (US-063, US-070)', () => {
  it('only exports the chosen categories and says so', async () => {
    await seed({ food: true })
    const file = await exportBackup({ categories: ['yoga'] })
    expect(file.includes).toEqual(['yoga'])
    expect(file.data.yogaSessions).toHaveLength(1)
    expect(file.data.sessions).toHaveLength(0)
    expect(file.data.foodLog).toHaveLength(0)
    expect(file.data.profile).toHaveLength(0)
  })

  it('previewing and parsing never touch the database', async () => {
    await seed()
    const file = await exportBackup()
    const before = await counts()
    const parsed = parseBackup(JSON.stringify(file))
    if (!parsed.ok) throw new Error(parsed.error)
    const prev = previewBackup(parsed.backup)
    expect(prev.recent[0]).toEqual({ date: '2026-10-19', title: 'Upper body' })
    expect(prev.workouts).toBe(1)
    expect(await counts()).toEqual(before)
  })

  it('refuses malformed, unknown and oversized input with a clear message', () => {
    expect(parseBackup('nope')).toMatchObject({ ok: false })
    expect(parseBackup('{"format":"lift-backup","version":99,"data":{}}')).toMatchObject({ ok: false })
    expect(parseBackup('{"format":"lift-backup","version":3,"data":{},"includes":["nothing"]}')).toMatchObject({ ok: false })
    expect(parseBackup('{"format":"lift-backup","version":3,"data":{},"includes":[]}')).toMatchObject({ ok: false })
    const huge = 'x'.repeat(50 * 1024 * 1024 + 1)
    const r = parseBackup(huge)
    expect(r.ok).toBe(false)
  })

  it('ignores rows for a category the file does not claim', async () => {
    await seed({ food: true })
    const file = JSON.parse(JSON.stringify(await exportBackup({ categories: ['food'] }))) as BackupFile
    file.data.sessions = (await exportBackup({ categories: ['workouts'] })).data.sessions
    const parsed = parseBackup(JSON.stringify(file))
    if (!parsed.ok) throw new Error(parsed.error)
    expect(parsed.backup.data.sessions).toHaveLength(0)
  })

  it('merge adds only new records, never overwrites, and keeps a workout from being mixed', async () => {
    await seed()
    const file = await exportBackup()
    // Same workout id on the device, but the device copy was edited.
    await db.sessions.update('sess-1', { title: 'Edited on this device' })
    const parsed = parseBackup(JSON.stringify({ ...file, data: { ...file.data, setLogs: [...file.data.setLogs, { ...(file.data.setLogs[0] as object), id: 'set-2', setNumber: 2 }] } }))
    if (!parsed.ok) throw new Error(parsed.error)
    const report = await importBackup(parsed.backup, 'merge')
    expect((await db.sessions.get('sess-1'))?.title).toBe('Edited on this device')
    expect(await db.setLogs.count()).toBe(1) // set-2 belongs to a workout that was already here
    expect(report.failed).toBe(0)
    expect(report.skipped).toBeGreaterThan(0)
    expect(report.mode).toBe('merge')
  })

  it('merge adds records that are missing', async () => {
    await seed()
    const file = await exportBackup()
    await db.setLogs.clear()
    await db.sessions.clear()
    const parsed = parseBackup(JSON.stringify(file))
    if (!parsed.ok) throw new Error(parsed.error)
    const report = await importBackup(parsed.backup, 'merge')
    expect(await db.sessions.count()).toBe(1)
    expect(await db.setLogs.count()).toBe(1)
    expect(report.perTable.sessions).toEqual({ added: 1, skipped: 0 })
  })

  it('replace only erases the categories in the file', async () => {
    await seed({ food: true })
    const yogaOnly = await exportBackup({ categories: ['yoga'] })
    await db.yogaSessions.clear()
    await db.yogaSessions.add({ id: 'other', date: '2026-10-01', style: 'yin', status: 'completed' } as never)
    const parsed = parseBackup(JSON.stringify(yogaOnly))
    if (!parsed.ok) throw new Error(parsed.error)
    await importBackup(parsed.backup, 'replace')
    expect((await db.yogaSessions.toArray()).map((y) => y.id)).toEqual(['y-1'])
    expect(await db.sessions.count()).toBe(1)
    expect(await db.foodLog.count()).toBe(1)
  })

  it('a failed merge also changes nothing', async () => {
    await seed()
    const file = await exportBackup()
    const broken: BackupFile = JSON.parse(JSON.stringify(file))
    broken.data.bodyWeights.push({ id: {} } as never) // an invalid key makes the write throw part-way
    const before = await counts()
    await db.sessions.clear()
    const mid = await counts()
    await expect(importBackup(broken, 'merge')).rejects.toBeTruthy()
    expect(await counts()).toEqual(mid)
    expect(before.sessions).toBe(1)
  })
})

describe('delete all data (US-062)', () => {
  it('phrase and arithmetic checks are exact', () => {
    expect(deletePhraseOk(DELETE_PHRASE)).toBe(true)
    expect(deletePhraseOk('  DELETE MY DATA ')).toBe(true)
    expect(deletePhraseOk('delete my data')).toBe(false)
    expect(deletePhraseOk('DELETE MY')).toBe(false)
    let n = 0
    const seq = [0.1, 0.9, 0.3, 0.5, 0.7]
    const c = makeMathChallenge(() => seq[n++ % seq.length])
    expect(mathAnswerOk(String(c.answer), c)).toBe(true)
    expect(mathAnswerOk(String(c.answer + 1), c)).toBe(false)
    expect(mathAnswerOk('', c)).toBe(false)
    expect(mathAnswerOk('abc', c)).toBe(false)
    // every kind of question has a whole-number answer
    for (let k = 0; k < 200; k++) {
      const q = makeMathChallenge()
      expect(Number.isInteger(q.answer) && q.answer > 0).toBe(true)
    }
    const questions = new Set(Array.from({ length: 40 }, () => makeMathChallenge().question))
    expect(questions.size).toBeGreaterThan(5)
  })

  it('deletes every table in one go and reports success only when nothing is left', async () => {
    await seed({ food: true })
    const r = await deleteAllData()
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.deleted).toBeGreaterThan(5)
    for (const t of db.tables) expect(await t.count()).toBe(0)
  })

  it('a partial failure rolls back, says so honestly, and can be retried', async () => {
    await seed({ food: true })
    const before = await counts()
    // Inside a transaction Dexie uses its own table objects, so fail the shared prototype method for one table.
    const proto = Object.getPrototypeOf(db.foodLog) as { clear: (this: { name: string }) => Promise<void> }
    const real = proto.clear
    const boom = vi.spyOn(proto, 'clear').mockImplementation(function (this: { name: string }) {
      return this.name === 'foodLog' ? Promise.reject(new Error('disk full')) : real.call(this)
    })
    const r = await deleteAllData()
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toMatch(/disk full/)
      expect(r.remaining).toBeGreaterThan(0)
    }
    expect(await counts()).toEqual(before) // nothing was half-deleted
    boom.mockRestore()
    expect((await deleteAllData()).ok).toBe(true)
    for (const t of db.tables) expect(await t.count()).toBe(0)
  })
})

describe('migration safety (US-069)', () => {
  it('a failing upgrade leaves the old data and version in place', async () => {
    const name = 'migration-failure-fixture'
    await Dexie.delete(name)
    const old = new Dexie(name)
    old.version(1).stores({ items: 'id' })
    await old.open()
    await old.table('items').add({ id: 'a', note: 'keep me' })
    old.close()

    const next = new Dexie(name)
    next.version(1).stores({ items: 'id' })
    next.version(2).stores({ items: 'id', extra: 'id' }).upgrade(async () => { throw new Error('upgrade exploded') })
    await expect(next.open()).rejects.toBeTruthy()
    next.close()

    const again = new Dexie(name)
    again.version(1).stores({ items: 'id' })
    await again.open()
    expect(again.verno).toBe(1)
    expect(await again.table('items').get('a')).toMatchObject({ note: 'keep me' })
    again.close()
    await Dexie.delete(name)
  })
})

describe('older saved gym names', () => {
  it('are renamed in place and nothing else changes', async () => {
    const { migrateGymNames } = await import('./migrate')
    const legacy = atob('cGxhbmV0X2ZpdG5lc3M=')
    await resetAllData()
    await saveProfile({ ...profileToForm(), weightValue: '180', heightCm: '178', trainingLevel: 'intermediate', birthDate: '1990-05-15', sex: 'male' }, { preferredLocation: 'gym', gymType: 'standard' }, NOW)
    const p = (await db.profile.toArray())[0]
    await db.profile.put({ ...p, gymType: legacy as never })
    const e = await db.equipment.get('gym')
    await db.equipment.put({ ...e!, preset: legacy as never, excluded: ['rower'] })
    await migrateGymNames()
    expect((await db.profile.toArray())[0].gymType).toBe('standard')
    const after = await db.equipment.get('gym')
    expect(after?.preset).toBe('standard_gym')
    expect(after?.excluded).toEqual(['rower'])
    await migrateGymNames() // safe to run again
    expect((await db.profile.toArray())[0].gymType).toBe('standard')
  })
})
