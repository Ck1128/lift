// TEMPORARY MOCK DATA - placeholder only until the real local database exists (Phase 2).
// Nothing here is a real workout, plan, or user record.

export interface MockDay {
  day: string
  focus: string
  muscles: string[]
  status: 'planned' | 'rest'
}

export interface MockExercise {
  id: string
  name: string
  sets: number
  reps: string
  equipment: string
}

export const MOCK_WEEK: MockDay[] = [
  { day: 'Mon', focus: 'Upper body', muscles: ['Chest', 'Back', 'Shoulders'], status: 'planned' },
  { day: 'Tue', focus: 'Lower body', muscles: ['Quads', 'Hamstrings', 'Glutes'], status: 'planned' },
  { day: 'Wed', focus: 'Rest', muscles: [], status: 'rest' },
  { day: 'Thu', focus: 'Upper body', muscles: ['Chest', 'Back', 'Arms'], status: 'planned' },
  { day: 'Fri', focus: 'Lower body', muscles: ['Quads', 'Hamstrings', 'Core'], status: 'planned' },
  { day: 'Sat', focus: 'Rest', muscles: [], status: 'rest' },
  { day: 'Sun', focus: 'Rest', muscles: [], status: 'rest' },
]

export const MOCK_WORKOUT: MockExercise[] = [
  { id: 'mock-1', name: 'Example press', sets: 3, reps: '8-12', equipment: 'Dumbbell' },
  { id: 'mock-2', name: 'Example row', sets: 3, reps: '8-12', equipment: 'Cable' },
  { id: 'mock-3', name: 'Example raise', sets: 3, reps: '12-15', equipment: 'Dumbbell' },
]

export const DURATION_OPTIONS = [20, 30, 45, 60] as const
