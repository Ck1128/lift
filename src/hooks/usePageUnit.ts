import { useCallback, useState } from 'react'
import type { WeightUnit } from '../engine/types'

/**
 * One default weight unit for a whole page, plus a per-field override.
 * A field with no override follows the page unit. Changing the page unit leaves overridden fields alone.
 */
export function usePageUnit(initial: WeightUnit) {
  const [page, setPageState] = useState<WeightUnit>(initial)
  const [overrides, setOverrides] = useState<Record<string, WeightUnit>>({})

  const unitFor = useCallback((key: string): WeightUnit => overrides[key] ?? page, [overrides, page])
  const isOverridden = useCallback((key: string) => key in overrides, [overrides])
  const setPage = useCallback((u: WeightUnit) => {
    setPageState(u)
    // An override that now equals the page unit is no longer an override.
    setOverrides((o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== u)))
  }, [])
  const setUnitFor = useCallback((key: string, u: WeightUnit) => {
    setOverrides((o) => {
      const { [key]: _gone, ...rest } = o
      void _gone
      return u === page ? rest : { ...rest, [key]: u }
    })
  }, [page])
  return { page, setPage, unitFor, setUnitFor, isOverridden }
}
