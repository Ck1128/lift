import type { Program, ProgramDay, ProgramExercise } from '../engine/program'

// Shorthand builders so each day below reads like the written plan.
type Opt = Partial<Omit<ProgramExercise, 'exerciseId' | 'sets' | 'repMin' | 'repMax'>>
const db = (exerciseId: string, name: string, sets: number, repMin: number, repMax = repMin, o: Opt = {}): ProgramExercise =>
  ({ exerciseId, name, sets, repMin, repMax, loaded: true, rest: 60, ...o })
const bw = (exerciseId: string, name: string, sets: number, repMin: number, repMax = repMin, o: Opt = {}): ProgramExercise =>
  ({ exerciseId, name, sets, repMin, repMax, rest: 45, ...o })

const BOTH = 24 // both 12 lb dumbbells held together

const goblet = (s: number, r: number, o: Opt = {}) => db('prog-goblet-squat', 'Goblet squat', s, r, r, { rest: 75, ...o })
const rdl = (s: number, r: number, o: Opt = {}) => db('prog-db-rdl', 'Romanian deadlift', s, r, r, { rest: 75, ...o })
const slRdl = (s: number, r: number, o: Opt = {}) => db('prog-single-leg-rdl', 'Single-leg RDL', s, r, r, { repLabel: 'side', rest: 60, weight: BOTH, ...o })
const lunge = (s: number, r: number) => db('Dumbbell_Rear_Lunge', 'Reverse lunge', s, r, r, { repLabel: 'leg' })
const split = (s: number, lo: number, hi = lo) => db('prog-bulgarian-split-squat', 'Bulgarian split squat', s, lo, hi, { repLabel: 'leg', rest: 75, note: 'Rear foot on a sturdy chair. Go without weights first if balance is shaky.' })
const row = (s: number, r: number, o: Opt = {}) => db('One-Arm_Dumbbell_Row', 'One-arm row', s, r, r, { repLabel: 'side', note: 'Brace your free hand on your knee or a chair.', ...o })
const floor = (s: number, r: number, o: Opt = {}) => db('prog-db-floor-press', 'Floor press', s, r, r, { rest: 75, ...o })
const press = (s: number, r: number) => db('prog-db-shoulder-press', 'Shoulder press', s, r)
const arnold = (s: number, r: number) => db('Arnold_Dumbbell_Press', 'Arnold press', s, r)
const hammer = (s: number, r: number) => db('Hammer_Curls', 'Hammer curl', s, r, r, { rest: 45 })
const triceps = (s: number, r: number) => db('Standing_Dumbbell_Triceps_Extension', 'Overhead triceps extension', s, r, r, { rest: 45, note: 'Hold one dumbbell with both hands.' })
const kickback = (s: number, r: number) => db('Tricep_Dumbbell_Kickback', 'Triceps kickback', s, r, r, { rest: 45 })
const pushups = (s: number, note: string) => bw('Pushups', 'Push-ups', s, 5, 15, { rest: 60, note })
const wall = (s: number, r: number) => bw('prog-wall-slide', 'Wall slides', s, r)
const deadBug = (s: number, r: number) => bw('Dead_Bug', 'Dead bug', s, r, r, { repLabel: 'side' })
const plank = (s: number, lo: number, hi = lo) => bw('prog-plank', 'Plank', s, lo, hi, { repLabel: 'sec' })
const twist = (s: number, r: number) => bw('prog-russian-twist', 'Russian twist', s, r, r, { repLabel: 'side', note: 'One dumbbell or none.' })
const calves = (s: number, r: number) => db('Standing_Dumbbell_Calf_Raise', 'Calf raise', s, r, r, { rest: 30 })
const slCalves = (s: number, r: number) => bw('prog-single-leg-calf', 'Single-leg calf raise off a step', s, r, r, { repLabel: 'side', rest: 30 })

const warm = 10
const recovery = (minutes = 35, label = 'Easy walk', cue = '30-40 min at a pace where you can talk'): ProgramDay => ({
  title: 'Recovery', recovery: true, walk: { minutes, label, cue }, mobility: 10, exercises: [],
  notes: ['No dumbbells and no ab work today. Recovery days are where adaptation happens, so do not sneak sets in.'],
})

/**
 * Home: 15 days for one pair of 12 lb dumbbells, a step or sturdy chair and floor space, done in order (not on
 * weekdays). Two sessions alternate so the same muscles never train two days running: A = Legs + Pull,
 * B = Push + Core. 10 lifting days and 5 recovery days, ramping up, peaking, then tapering.
 */
export const HOME_PROGRAM: Program = {
  id: 'home',
  name: 'Home',
  summary: '15 days in order: Legs + Pull and Push + Core alternate, with recovery days between.',
  equipment: 'A pair of 12 lb dumbbells, a step or sturdy chair, and floor space',
  load: { weight: 12, unit: 'lb' },
  warmupCue: '3-5 min brisk walk or march; leg swings, 10 squats, 10 hip hinges, arm circles, 8 wall slides, 8 scapular push-ups; then one easy set of 8 of the first exercise',
  mobilityCue: 'hip flexor, hamstring and chest doorway stretches, thoracic rotations, cat-cow; 20-30 s each',
  rules: [
    'Stop each set with 2-4 reps in reserve. Form breaking down means the set is over.',
    'Rate your soreness each morning from 0 to 10. At 5 or more in the muscles you are due to train, pick a recovery day instead. The day you were due stays next.',
    'Lateral raises and reverse flys stay out: 12 lb is too heavy for strict sets of them. Wall slides replace them.',
  ],
  days: [
    {
      title: 'A1 · Legs + Pull (intro)', warmup: warm, finish: { minutes: 10, label: 'Walk + stretch' },
      notes: ['About half volume to start. 3-4 reps in reserve, normal tempo, 60-90 s rest.'],
      exercises: [goblet(2, 12), rdl(2, 12), lunge(2, 10), row(2, 12), hammer(2, 12), calves(2, 20)],
    },
    {
      title: 'B1 · Push + Core (intro)', warmup: warm,
      notes: ['About half volume to start. 3-4 reps in reserve.'],
      exercises: [floor(2, 12), press(2, 10), pushups(2, 'Stop about 4 reps short of failure. Knees down is fine.'), triceps(2, 12), wall(2, 10), deadBug(2, 8), plank(2, 20, 30)],
    },
    recovery(),
    {
      title: 'A2 · Legs + Pull', warmup: warm,
      notes: ['Full sets, 2-3 reps in reserve.'],
      exercises: [goblet(3, 15), rdl(3, 15, { name: 'Romanian deadlift, 2-s pause at the bottom' }), lunge(3, 10),
        db('Plie_Dumbbell_Squat', 'Sumo squat', 2, 12), row(3, 12), db('Bent_Over_Two-Dumbbell_Row', 'Bent-over row (both dumbbells)', 2, 15),
        hammer(3, 12), db('manual-dumbbell-glute-bridge', 'Glute bridge (dumbbell on hips)', 3, 15, 15, { rest: 45 }), calves(3, 20)],
    },
    {
      title: 'B2 · Push + Core', warmup: warm,
      notes: ['Full sets, 2-3 reps in reserve.'],
      exercises: [floor(3, 15), press(3, 10), arnold(2, 10), pushups(2, 'Stop 3 reps short of failure.'), triceps(3, 12), kickback(2, 15),
        wall(2, 10), deadBug(3, 10), twist(2, 15), plank(3, 30)],
    },
    recovery(),
    {
      title: 'Full-body conditioning circuit', warmup: warm, rounds: 3, finish: { minutes: 15, label: 'Walk', },
      notes: ['3 rounds: one set of each exercise in order, then rest 60-90 s. Each round is one set below. Add a 4th round (Add set) only if you feel fresh. Good form over speed.', 'Walk 15-20 minutes to finish.'],
      exercises: [goblet(3, 15), pushups(3, '8-10 reps. Knees down is fine.'), row(3, 12), rdl(3, 15), press(3, 10), plank(3, 30)],
    },
    recovery(),
    {
      title: 'A3 · Legs + Pull (harder)', warmup: warm,
      notes: ['12 lb is now too light for two-legged work, so the leg exercises switch to one leg at a time.', 'If single-leg work feels shaky, use the A2 versions (Day 4) and progress next time.'],
      exercises: [goblet(3, 12, { name: 'Goblet squat, 3-s lowering' }), split(3, 8, 10),
        slRdl(3, 10, { name: 'Single-leg RDL (both dumbbells in one hand)' }),
        row(3, 12, { name: 'One-arm row (both dumbbells), 1-s pause at top', weight: BOTH }),
        db('Dumbbell_Bicep_Curl', 'Biceps curl, 3-s lowering', 3, 12, 12, { rest: 45 }),
        bw('prog-single-leg-bridge', 'Single-leg glute bridge', 3, 12, 12, { repLabel: 'side' }), slCalves(3, 15)],
    },
    {
      title: 'B3 · Push + Core (harder)', warmup: warm,
      exercises: [floor(3, 12, { name: 'Floor press, 2-s pause at the bottom' }), pushups(3, 'Stop 2-3 reps short of failure.'), press(3, 12), arnold(2, 10),
        triceps(3, 15), wall(2, 10), deadBug(3, 10), plank(3, 45)],
    },
    {
      title: 'A4 · Legs + Pull (peak)', warmup: warm,
      notes: ['The hardest leg day. Keep 2 reps in reserve and do not grind.'],
      exercises: [goblet(4, 12, { name: 'Goblet squat (both dumbbells), 3-s down + 1-s pause', weight: BOTH }), slRdl(4, 10, { name: 'Single-leg RDL (both dumbbells)' }), split(3, 10),
        row(4, 12, { name: 'One-arm row (both dumbbells)', weight: BOTH }), hammer(3, 12), slCalves(3, 15)],
    },
    {
      title: 'B4 · Push + Core (peak)', warmup: warm,
      exercises: [floor(4, 12, { name: 'Floor press, 2-s pause' }), pushups(3, 'Stop 2 reps short of failure. Feet on a step if regular ones are easy.'), press(3, 10), arnold(3, 10),
        triceps(3, 12), kickback(2, 15), wall(2, 10), twist(3, 15), deadBug(3, 10)],
    },
    recovery(),
    {
      title: 'Light full body + mobility', warmup: warm, finish: { minutes: 15, label: 'Walk + stretch' },
      notes: ['Grease the groove: 4 or more reps in reserve, normal tempo, no pauses. You should finish feeling better than when you started.', 'Walk 15-20 minutes and stretch to finish.'],
      exercises: [bw('manual-bodyweight-squat', 'Bodyweight squat', 2, 15), goblet(2, 12), rdl(2, 12), floor(2, 12), row(2, 12), press(2, 10),
        wall(2, 10), hammer(2, 12), triceps(2, 12)],
    },
    { ...recovery(25, 'Easy walk', '20-30 min, easy'), title: 'Rest day',
      notes: ['An easy walk and light mobility only. Sleep well and eat a normal amount of protein.', 'All 15 days done after this. Heading back to the gym? Choose Standard in the Workout profile menu on Home.'] },
  ],
  guides: [
    {
      title: 'How the plan works',
      items: [
        'Two sessions alternate so the same muscles never train two days running. A is Legs + Pull: squats, hinges, lunges, rows, curls, calves. Rows and Romanian deadlifts share a day on purpose, because both tax your lower back and grip. B is Push + Core: floor press, push-ups, shoulder presses, triceps, wall slides and abs.',
        'Each muscle group rests at least 48 hours and is trained about 3 times a week: 10 lifting days and 5 recovery days.',
        'Recovery days sit where soreness is likely to peak or fatigue to build: after the first two sessions, around the circuit, before the light day and at the end.',
        'Days 1-2 are about half volume: soreness hits hardest after the first exposure, and a small dose protects you later. Days 4-7 are normal volume, then the circuit. Days 9-12 use harder variations, then the hardest days. Days 13-15 taper so you finish fresh.',
      ],
    },
    {
      title: 'Make 12 lb harder',
      items: [
        'Use these when a set would take more than about 25-30 reps to get near failure.',
        'Goblet squat: hold both dumbbells, 3-s down, pause, then Bulgarian split squat.',
        'Romanian deadlift: 2-s pause at the bottom, then single-leg RDL holding both dumbbells.',
        'Reverse lunge: front foot on a step (deficit), then Bulgarian split squat with 1.5 reps.',
        'Floor press: 2-s pause, then push-ups (incline, floor, feet up).',
        'Row: both dumbbells in one hand, pause at the top, 3-s lowering.',
        'Glute bridge: single-leg, then shoulders on a couch (hip thrust) with a 2-s squeeze.',
        'Calf raise: single-leg off a step, pause in the bottom stretch.',
        'Curls, triceps and shoulder press: 12 lb fits; add a 3-s lowering or go one arm at a time.',
        'Keep each rep under about 8 seconds. Very slow reps of 10 seconds or more build less muscle.',
      ],
    },
    {
      title: 'Stop or back off',
      items: [
        'Normal: dull, spread-out muscle soreness that peaks 1-3 days after a session and fades.',
        'Stop the exercise: sharp, pinpoint or joint-line pain, or pain that gets worse during the set. Get swelling, locking or an unstable-feeling joint checked.',
        'Same-day medical care: dark, cola-coloured urine, or severe swelling or weakness after training. These can be signs of rhabdomyolysis, which often comes without much pain.',
        'Stay hydrated, skip pre-workout stimulants, and never turn a session into a "see how many I can do" test.',
      ],
    },
    {
      title: 'After the 15 days: back to the gym',
      items: [
        'Week 1: 3 sessions on non-consecutive days, about half your old volume, 50-70% of your old working weights, 3-4 reps in reserve, long rests.',
        'Week 2: 3-4 sessions, about 70% of your old volume, 80-90% of your old weights, 2-3 reps in reserve.',
        'Warm up into each first lift: light × 8, about 50% × 5, about 70% × 3.',
        'From week 3, add 2-10% load whenever you beat your target reps by 1-2.',
        'You can keep the A/B split in the gym (lower + pull, upper push + core) and swap in barbells and machines.',
      ],
    },
    {
      title: 'What to expect',
      items: [
        '15 days with 12 lb will not build much muscle. It restores movement quality, joint tolerance and work capacity, so heavier gym weights do not hurt you. Most lost strength comes back within a few weeks of returning.',
        'Recovery helpers: about 1.6 g of protein per kg of body weight a day, 7-9 hours of sleep and daily walking. These help recovery more than any extra rest day.',
        'General fitness guidance, not medical advice. Check with a clinician if you have a health condition or persistent pain.',
      ],
    },
  ],
}

export const PROGRAMS: Program[] = [HOME_PROGRAM]
export const programById = (id: string): Program | undefined => PROGRAMS.find((p) => p.id === id)
