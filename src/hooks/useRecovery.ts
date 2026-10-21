import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { recoveryReport, type RecoveryReport } from '../engine/recovery'
import type { SetLog, WorkoutSession } from '../engine/types'

/** The recovery estimate, recalculated whenever a workout is finished, edited or deleted. */
export function useRecovery(): { report: RecoveryReport; loading: boolean } {
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], undefined as WorkoutSession[] | undefined)
  const logs = useLiveQuery(() => db.setLogs.toArray(), [], undefined as SetLog[] | undefined)
  const loading = sessions === undefined || logs === undefined
  const report = useMemo(() => recoveryReport(sessions ?? [], logs ?? [], new Date()), [sessions, logs])
  return { report, loading }
}
