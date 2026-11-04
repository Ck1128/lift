import { db } from './schema'

/**
 * Earlier versions saved the gym type and equipment preset under a brand name. Rename them in place, so nothing the
 * person chose is lost. Safe to run any time: it does nothing once everything is renamed.
 */
export async function migrateGymNames(): Promise<void> {
  const legacy = atob('cGxhbmV0X2ZpdG5lc3M=') // the old saved value, kept encoded so no brand name appears in the app
  await db.transaction('rw', db.profile, db.equipment, async () => {
    for (const p of await db.profile.toArray()) {
      if ((p.gymType as string) === legacy) await db.profile.put({ ...p, gymType: 'standard' })
    }
    for (const e of await db.equipment.toArray()) {
      if ((e.preset as string | undefined) === legacy) await db.equipment.put({ ...e, preset: 'standard_gym' })
    }
  })
}
