import type { EquipmentId, TrainingLevel } from '../engine/types'

/**
 * Cardio options. Hand-written, no photos.
 * MET ranges are rounded values from the Compendium of Physical Activities (Ainsworth et al.) and are
 * only used for a rough calorie range. They are estimates, not measurements.
 */
export const CARDIO_VERSION = 'cardio-1'

export interface CardioActivity {
  id: string
  name: string
  /** Every item must be available. Walking and marching need none. */
  equipmentIds: EquipmentId[]
  minLevel: TrainingLevel
  impact: 'low' | 'moderate' | 'high'
  /** MET range from easy to moderate effort. */
  met: [number, number]
  instructions: string[]
}

export const CARDIO: CardioActivity[] = [
  { id: 'cardio-walk', name: 'Brisk walk', equipmentIds: ['bodyweight'], minLevel: 'beginner', impact: 'low', met: [3.0, 4.3],
    instructions: ['Walk at a pace that is a little quicker than a stroll.', 'Keep your head up, shoulders relaxed and arms swinging naturally.', 'Indoors, walk laps or up and down a hallway. Outdoors, pick a flat, safe route.'] },
  { id: 'cardio-march', name: 'March in place', equipmentIds: ['bodyweight'], minLevel: 'beginner', impact: 'low', met: [3.0, 4.0],
    instructions: ['Stand tall and lift one knee at a time, as if marching.', 'Swing your arms in opposition to your legs.', 'Keep your steps quiet and light. Hold a wall or chair if you feel unsteady.'] },
  { id: 'cardio-treadmill-walk', name: 'Treadmill walk (optional incline)', equipmentIds: ['treadmill'], minLevel: 'beginner', impact: 'low', met: [3.0, 4.5],
    instructions: ['Start the belt slowly and step on while it moves at a low speed.', 'Build up to a comfortable brisk walk. A small incline makes it harder without more impact.', 'Try not to hold the rails for support. Use them only for balance.', 'Slow down for the last minute before stepping off.'] },
  { id: 'cardio-treadmill-jog', name: 'Treadmill jog or run-walk', equipmentIds: ['treadmill'], minLevel: 'intermediate', impact: 'high', met: [6.0, 8.3],
    instructions: ['Warm up with a few minutes of walking first.', 'Jog at an easy pace. Alternate jogging and walking (for example 2 minutes jog, 1 minute walk) if continuous jogging is too much.', 'Land softly and keep your stride short.', 'Finish with a minute of walking.'] },
  { id: 'cardio-bike', name: 'Exercise bike', equipmentIds: ['exercise_bike'], minLevel: 'beginner', impact: 'low', met: [3.5, 7.0],
    instructions: ['Adjust the seat so your knee is slightly bent at the bottom of each pedal stroke.', 'Start with light resistance and a smooth, steady pedal speed.', 'Add resistance only if you can keep your speed and still pass the talk test.'] },
  { id: 'cardio-elliptical', name: 'Elliptical', equipmentIds: ['elliptical'], minLevel: 'beginner', impact: 'low', met: [4.5, 6.0],
    instructions: ['Step on carefully and hold the handles.', 'Keep your whole foot flat on the pedals and your posture tall.', 'Move in a smooth rhythm. Increase resistance slowly if it feels too easy.'] },
  { id: 'cardio-rower', name: 'Rowing machine', equipmentIds: ['rower'], minLevel: 'intermediate', impact: 'low', met: [4.8, 7.0],
    instructions: ['Sit with your feet strapped in and your arms straight.', 'Drive with your legs first, then lean back slightly, then pull the handle to your lower ribs.', 'Return in the reverse order: arms, then torso, then knees.', 'Ask a staff member for a quick technique check if you are new to it.'] },
  { id: 'cardio-stairs', name: 'Stair climber', equipmentIds: ['stair_climber'], minLevel: 'intermediate', impact: 'moderate', met: [5.0, 9.0],
    instructions: ['Hold the rails lightly for balance only.', 'Stand tall and use full steps. Leaning on the rails makes the work easier and less useful.', 'Start slow and increase speed only while you can keep good posture.'] },
]

export const cardioById = (id: string): CardioActivity | undefined => CARDIO.find((c) => c.id === id)
