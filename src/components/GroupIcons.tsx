import type { ReactNode } from 'react'
import type { FoodGroup } from '../engine/foodGroups'

/** Lift's own food-group icons: simple line drawings on a 24 by 24 grid. */
const PATHS: Record<FoodGroup, ReactNode> = {
  vegetables: <><path d="M12 21c-3.600-1.200-6-4.700-6-9 0-3.300 2-6 6-8 4 2 6 4.700 6 8 0 4.300-2.400 7.800-6 9Z" /><path d="M12 8v13M12 12l-3-2M12 15l3-2" /></>,
  fruit: <><circle cx="12" cy="13" r="8" /><circle cx="12" cy="13" r="3.200" /><path d="M12 5v4.800M12 16.200V21M4 13h4.800M15.200 13H20M6.300 7.300l3.400 3.400M14.300 15.300l3.400 3.400M17.700 7.300l-3.400 3.400M9.700 15.300l-3.400 3.400" /></>,
  whole_grains: <><path d="M12 22V9" /><path d="M12 9c-2.200-.4-3.500-2-3.500-4 2.200.4 3.500 2 3.500 4ZM12 9c2.200-.4 3.500-2 3.500-4-2.200.4-3.500 2-3.500 4Z" /><path d="M12 14c-2.200-.4-3.500-2-3.500-4 2.200.4 3.500 2 3.500 4ZM12 14c2.200-.4 3.500-2 3.500-4-2.200.4-3.500 2-3.500 4Z" /><path d="M12 19c-2.200-.4-3.500-2-3.500-4 2.200.4 3.500 2 3.500 4ZM12 19c2.200-.4 3.500-2 3.500-4-2.200.4-3.500 2-3.500 4Z" /></>,
  healthy_oils: <><path d="M12 3c3.800 4.600 6 7.700 6 11a6 6 0 0 1-12 0c0-3.300 2.200-6.400 6-11Z" /><path d="M9.200 14.500a2.800 2.800 0 0 0 2.300 2.800" /></>,
  nuts_legumes: <><path d="M4 16c0-6 5-11 12-11 3 0 4 1 4 4 0 7-5 11-11 11-3 0-5-1.500-5-4Z" /><circle cx="9" cy="14" r="1.300" /><circle cx="13" cy="11" r="1.300" /><circle cx="16.500" cy="8.300" r="1.100" /></>,
  fish: <><path d="M3 12c3-4.500 7.500-6 11-4l3 4-3 4c-3.500 2-8 .5-11-4Z" /><path d="M17 12l4-3.500v7L17 12Z" /><circle cx="8" cy="11" r=".9" /></>,
  red_meat: <><path d="M9 4.500a3 3 0 0 0-4 4l2.300 2.300L6 12a3 3 0 0 0 4 4l1.800-1.800 5.500 5.500a2.200 2.200 0 0 0 3.100-3.100l-5.500-5.500L17 9.500A3 3 0 0 0 13 5.500L11.300 7.300 9 4.500Z" /></>,
  processed_meat: <><circle cx="12" cy="12" r="8.500" /><circle cx="9" cy="9.500" r="1.200" /><circle cx="14.800" cy="10.500" r="1.400" /><circle cx="10.200" cy="14.800" r="1.400" /><circle cx="15" cy="15.500" r="1" /></>,
  alcohol: <><path d="M10 3h4M10.500 3v4.200L8.500 10v10.500a.5.500 0 0 0 .5.500h6a.5.500 0 0 0 .5-.500V10l-2-2.800V3" /><path d="M8.500 14h7" /></>,
}

export function GroupIcon({ group, size = 22 }: { group: FoodGroup; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[group]}
    </svg>
  )
}
