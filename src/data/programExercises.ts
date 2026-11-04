import type { Exercise } from '../engine/types'

// Hand-written moves used by fixed programs (for example the Home program). They are looked up by id but are NOT
// part of the pool the workout builder picks from, so adding them never changes the workouts Lift designs itself.
// No photos: instructions only, so there are no image-rights questions.
const base = { catalogVersion: 'program-1', secondaryMuscles: [], difficulty: 'beginner' as const }

export const PROGRAM_EXERCISES: Exercise[] = [
  { ...base, id: 'prog-goblet-squat', name: 'Goblet Squat (Dumbbell)', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['core'],
    movementPattern: 'squat', equipmentIds: ['dumbbell'], exerciseType: 'dumbbell', compound: true,
    instructions: ['Hold one dumbbell upright against your chest with both hands.', 'Feet a little wider than your hips, toes slightly out.', 'Sit down between your heels, chest up, elbows inside your knees.', 'Drive through your whole foot to stand.'] },
  { ...base, id: 'prog-db-rdl', name: 'Dumbbell Romanian Deadlift', primaryMuscles: ['hamstrings', 'glutes'], secondaryMuscles: ['back'],
    movementPattern: 'hinge', equipmentIds: ['dumbbell'], exerciseType: 'dumbbell', compound: true,
    instructions: ['Stand tall with a dumbbell in each hand in front of your thighs.', 'Soften your knees and push your hips back, sliding the weights down your legs.', 'Keep your back flat. Stop when you feel a strong stretch in your hamstrings, usually around mid-shin.', 'Squeeze your glutes to stand back up.'] },
  { ...base, id: 'prog-db-floor-press', name: 'Dumbbell Floor Press', primaryMuscles: ['chest'], secondaryMuscles: ['triceps', 'shoulders'],
    movementPattern: 'push', equipmentIds: ['dumbbell'], exerciseType: 'dumbbell', compound: true,
    instructions: ['Lie on your back with knees bent, a dumbbell in each hand above your chest.', 'Lower until your upper arms touch the floor, elbows about 45 degrees from your body.', 'Pause lightly, then press back up.'] },
  { ...base, id: 'prog-db-shoulder-press', name: 'Dumbbell Shoulder Press', primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps'],
    movementPattern: 'push', equipmentIds: ['dumbbell'], exerciseType: 'dumbbell', compound: true,
    instructions: ['Stand or sit tall with the dumbbells at shoulder height, palms forward or facing each other.', 'Brace your stomach so your lower back does not arch.', 'Press overhead until your arms are straight, then lower slowly.'] },
  { ...base, id: 'prog-wall-slide', name: 'Wall Slides', primaryMuscles: ['shoulders'], secondaryMuscles: ['back'],
    movementPattern: 'isolation', equipmentIds: ['bodyweight'], exerciseType: 'bodyweight', compound: false,
    instructions: ['Stand with your back, head and bottom against a wall, feet a small step forward.', 'Put your arms against the wall in a goal-post shape.', 'Slide your arms up as far as you can while keeping them touching the wall, then slide back down.', 'Move slowly. Stop before your lower back leaves the wall.'] },
  { ...base, id: 'prog-plank', name: 'Plank', primaryMuscles: ['core'],
    movementPattern: 'core', equipmentIds: ['bodyweight'], exerciseType: 'bodyweight', compound: false,
    instructions: ['Forearms on the floor under your shoulders, legs straight behind you.', 'Make a straight line from head to heels. Squeeze your glutes and brace your stomach.', 'Breathe steadily and hold. Stop when your hips start to sag.'] },
  { ...base, id: 'prog-russian-twist', name: 'Russian Twist', primaryMuscles: ['core'],
    movementPattern: 'core', equipmentIds: ['bodyweight'], exerciseType: 'bodyweight', compound: false,
    instructions: ['Sit with knees bent and heels on the floor. Lean back a little with a straight back.', 'Hold one dumbbell at your chest, or nothing at all.', 'Turn your shoulders to one side, then the other. That is one rep per side.', 'Keep it slow. Skip the weight if your lower back complains.'] },
  { ...base, id: 'prog-bulgarian-split-squat', name: 'Bulgarian Split Squat', primaryMuscles: ['quads', 'glutes'],
    movementPattern: 'lunge', equipmentIds: ['dumbbell'], exerciseType: 'dumbbell', compound: true,
    instructions: ['Stand about two steps in front of a sturdy chair or couch and rest the top of your back foot on it.', 'Hold the dumbbells at your sides, or none at first if balance is shaky.', 'Lower straight down until your front thigh is about level, then push up through the front foot.', 'Do all reps on one leg, then switch.'] },
  { ...base, id: 'prog-single-leg-rdl', name: 'Single-Leg Romanian Deadlift', primaryMuscles: ['hamstrings', 'glutes'], secondaryMuscles: ['core'],
    movementPattern: 'hinge', equipmentIds: ['dumbbell'], exerciseType: 'dumbbell', compound: true,
    instructions: ['Stand on one leg with a soft knee, dumbbells in the hand on the other side.', 'Hinge at the hip and let your free leg rise behind you, keeping your back flat and hips level.', 'Lower until you feel a strong hamstring stretch, then stand back up.', 'Touch a wall with your free hand if balance is shaky. Do all reps on one side, then switch.'] },
  { ...base, id: 'prog-single-leg-bridge', name: 'Single-Leg Glute Bridge', primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings'],
    movementPattern: 'hinge', equipmentIds: ['bodyweight'], exerciseType: 'bodyweight', compound: false,
    instructions: ['Lie on your back, one foot flat on the floor and the other leg straight or hugged to your chest.', 'Push through the heel on the floor and lift your hips until your body is in a straight line.', 'Squeeze at the top, lower slowly. Do all reps on one side, then switch.'] },
  { ...base, id: 'prog-single-leg-calf', name: 'Single-Leg Calf Raise off a Step', primaryMuscles: ['calves'],
    movementPattern: 'isolation', equipmentIds: ['bodyweight'], exerciseType: 'bodyweight', compound: false,
    instructions: ['Stand on one foot with the ball of the foot on a step and your heel hanging off. Hold a wall or rail.', 'Lower your heel slowly for a full stretch and pause at the bottom.', 'Rise as high as you can. Do all reps on one side, then switch.'] },
]
