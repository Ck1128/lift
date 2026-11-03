import type { Program, ProgramExercise } from '../engine/program'

// Shorthand builders so each day below reads like the written plan.
type Opt = Partial<Omit<ProgramExercise, 'exerciseId' | 'name' | 'sets' | 'repMin' | 'repMax'>>
const db = (exerciseId: string, name: string, sets: number, repMin: number, repMax = repMin, o: Opt = {}): ProgramExercise =>
  ({ exerciseId, name, sets, repMin, repMax, loaded: true, rest: 60, ...o })
const bw = (exerciseId: string, name: string, sets: number, repMin: number, repMax = repMin, o: Opt = {}): ProgramExercise =>
  ({ exerciseId, name, sets, repMin, repMax, rest: 45, ...o })

const goblet = (s: number, r: number) => db('prog-goblet-squat', 'Goblet squat', s, r, r, { rest: 75 })
const rdl = (s: number, r: number) => db('prog-db-rdl', 'Romanian deadlift', s, r, r, { rest: 75 })
const floor = (s: number, r: number) => db('prog-db-floor-press', 'Floor press', s, r, r, { rest: 75 })
const row = (s: number, r: number) => db('One-Arm_Dumbbell_Row', 'One-arm row', s, r, r, { repLabel: 'side', note: 'Brace your free hand on your knee or a chair.' })
const press = (s: number, r: number) => db('prog-db-shoulder-press', 'Shoulder press', s, r)
const lunge = (s: number, r: number) => db('Dumbbell_Rear_Lunge', 'Reverse lunge', s, r, r, { repLabel: 'leg' })
const hammer = (s: number, r: number) => db('Hammer_Curls', 'Hammer curl', s, r, r, { rest: 45 })
const triceps = (s: number, r: number) => db('Standing_Dumbbell_Triceps_Extension', 'Overhead triceps extension', s, r, r, { rest: 45, note: 'Hold one dumbbell with both hands.' })
const wall = (s: number, r: number) => bw('prog-wall-slide', 'Wall slides', s, r)
const plank = (s: number, lo: number, hi = lo) => bw('prog-plank', 'Plank', s, lo, hi, { repLabel: 'sec' })
const deadBug = (s: number, r: number) => bw('Dead_Bug', 'Dead bug', s, r, r, { repLabel: 'side' })
const bridge = (s: number, r: number) => db('manual-dumbbell-glute-bridge', 'Glute bridge with dumbbell', s, r, r, { rest: 45 })
const calves = (s: number, r: number) => db('Standing_Dumbbell_Calf_Raise', 'Calf raise', s, r, r, { rest: 30 })

const warm = 10
const walkStretch = (minutes: number) => ({ minutes, label: 'Walk + stretching' })

/**
 * Home: one pair of 12 lb dumbbells and floor space. Ten days done in order, not tied to weekdays.
 * Written by the user, refined in Lift (see CHANGELOG 2.24.0 for what changed).
 */
export const HOME_PROGRAM: Program = {
  id: 'home',
  name: 'Home',
  summary: '10 days in order, one pair of dumbbells and floor space.',
  equipment: 'A pair of 12 lb dumbbells and floor space',
  load: { weight: 12, unit: 'lb' },
  rules: [
    'Keep 2-4 reps in reserve. Use controlled form and do not chase soreness.',
    'Once every set feels easy at the top of the range, slow the lowering to 3 seconds instead of adding reps.',
    'Lateral raises and reverse flys were left out: 12 lb is a lot for them when restarting. Wall slides take their place.',
  ],
  days: [
    {
      title: 'Full Body A', warmup: warm, finish: walkStretch(10),
      exercises: [goblet(3, 12), rdl(3, 12), floor(3, 12), row(3, 12), press(2, 10), lunge(2, 10), hammer(2, 12), triceps(2, 12)],
    },
    {
      title: 'Upper Body', warmup: warm, finish: walkStretch(10),
      exercises: [floor(3, 12), row(3, 12), press(2, 10), wall(2, 10), hammer(3, 12), triceps(3, 12),
        bw('Pushups', 'Push-ups', 2, 5, 15, { note: 'Stop 2-4 reps before failure. Knees down is fine.' })],
    },
    {
      title: 'Legs + Core', warmup: warm,
      exercises: [goblet(3, 15), rdl(3, 15), lunge(3, 10), db('Plie_Dumbbell_Squat', 'Sumo squat', 3, 12, 12, { rest: 60 }),
        bridge(3, 15), calves(3, 20), deadBug(3, 10), plank(3, 30, 45)],
    },
    {
      title: 'Active Recovery', walk: { minutes: 35, label: 'Easy walk + mobility' },
      notes: ['Walk 30-40 minutes at an easy pace, then stretch your hips, hamstrings, chest and shoulders.', 'Optional: 10-15 minutes of very light dumbbell work. Leave it out if you feel tired.'],
      exercises: [],
    },
    {
      title: 'Full Body B', warmup: warm,
      exercises: [db('Dumbbell_Squat', 'Dumbbell squat', 3, 15, 15, { rest: 75 }), rdl(3, 15), floor(3, 15),
        db('Bent_Over_Two-Dumbbell_Row', 'Bent-over row', 3, 15), db('Arnold_Dumbbell_Press', 'Arnold press', 2, 10),
        lunge(2, 12), db('Dumbbell_Bicep_Curl', 'Biceps curl', 2, 15, 15, { rest: 45 }),
        db('Tricep_Dumbbell_Kickback', 'Triceps kickback', 2, 15, 15, { rest: 45 }), plank(2, 45)],
    },
    {
      title: 'Upper Body + Core', warmup: warm,
      exercises: [floor(3, 15), row(3, 15), press(2, 12), wall(2, 10), hammer(3, 15), triceps(3, 15),
        bw('prog-russian-twist', 'Russian twist', 3, 15, 15, { repLabel: 'side', note: 'One dumbbell or none.' }), deadBug(3, 10)],
    },
    {
      title: 'Legs', warmup: warm,
      exercises: [goblet(3, 15),
        db('prog-bulgarian-split-squat', 'Bulgarian split squat', 3, 8, 10, { repLabel: 'leg', rest: 75, note: 'Back foot on a sturdy chair or couch. Go without weights first if balance is shaky.' }),
        rdl(3, 15), lunge(2, 10), bridge(3, 15), calves(3, 20), plank(3, 45)],
    },
    {
      title: 'Conditioning Circuit', warmup: warm, rounds: 4, finish: { minutes: 15, label: 'Walk' },
      notes: ['4 rounds: one set of each exercise in order, then rest 60-90 seconds. Each round is one set below.', 'Walk 15-20 minutes to finish.'],
      exercises: [goblet(4, 15), bw('Pushups', 'Push-ups', 4, 8, 10, { note: 'Knees down is fine.' }), row(4, 12), rdl(4, 15), press(4, 10), plank(4, 30)],
    },
    {
      title: 'Full Body Strength', warmup: warm,
      notes: ['Stop each set with 2-3 good reps left. Do not train to failure.'],
      exercises: [goblet(4, 12), rdl(4, 12), floor(4, 12), row(4, 12), press(3, 10), lunge(3, 10), hammer(3, 12), triceps(3, 12)],
    },
    {
      title: 'Light Full Body + Mobility', warmup: 5, finish: walkStretch(15),
      notes: ['Keep everything light and smooth today. Finish with 15-20 minutes of walking and stretching.'],
      exercises: [bw('manual-bodyweight-squat', 'Bodyweight squat', 2, 15), goblet(2, 12), rdl(2, 12), floor(2, 12), row(2, 12), press(2, 10),
        wall(2, 10), hammer(2, 12), triceps(2, 12)],
    },
  ],
}

export const PROGRAMS: Program[] = [HOME_PROGRAM]
export const programById = (id: string): Program | undefined => PROGRAMS.find((p) => p.id === id)
