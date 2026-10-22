/**
 * What a typical Planet Fitness club actually has, used to design workouts for it.
 *
 * Source: https://taekwondoking.com/list-of-planet-fitness-equipment/ (checked 2026-10-21). Clubs differ, so anything can
 * be switched off in Settings. The page lists:
 *  - Strength machines: shoulder press, lateral raise, triceps extension, bicep curl, leg press, leg curl, leg extension,
 *    calf raise, glute kickback, abdominal crunch, lower back extension. It also mentions chest press machines and Hammer
 *    Strength style rows in many locations.
 *  - Cable towers and dual adjustable pulleys, Smith machines, benches, dumbbells up to 75 lb, EZ-curl and fixed barbells.
 *  - Functional area: kettlebells, strength bands, medicine balls, TRX, battle ropes, Bosu.
 *  - Cardio: treadmills, ellipticals, rowers, upright and recumbent bikes, stair climbers, arc trainers.
 *  - It says there are no Olympic barbells or squat racks, and no pull-up bar is listed.
 *
 * The dataset has many other machines (hack squat, T-bar row, leverage deadlift, seated calf, butterfly...). A "machine" is
 * only offered at Planet Fitness when it is on this list.
 */
export const PF_SOURCE = 'https://taekwondoking.com/list-of-planet-fitness-equipment/'
export const PF_REVIEWED = '2026-10-21'

/** Exercise names (as in the catalog) that are done on a machine Planet Fitness has. */
export const PF_MACHINE_EXERCISES: ReadonlySet<string> = new Set([
  'Leverage Chest Press', 'Machine Bench Press',
  'Leverage Shoulder Press', 'Machine Shoulder (Military) Press', 'Lateral Raise Machine',
  'Machine Triceps Extension', 'Machine Bicep Curl',
  'Leverage Iso Row', 'Leverage High Row',
  'Leg Press', 'Seated Leg Curl', 'Lying Leg Curls', 'Leg Extension Machine', 'Standing Calf Raises', 'Calf Press',
  'Glute Kickback Machine', 'Ab Crunch Machine', 'Back Extension Machine',
])

export const pfMachineOk = (name: string): boolean => PF_MACHINE_EXERCISES.has(name)

/** Short, plain-language summary shown with a Planet Fitness workout. */
export const PF_SUMMARY = 'Planet Fitness: selectorized machines, cables, Smith machine, dumbbells up to 75 lb, EZ-curl bars. No Olympic barbell, squat rack or pull-up bar.'
