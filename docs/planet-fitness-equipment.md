# Planet Fitness equipment and workout design

Version `presets-3`, reviewed 2026-10-21. Source: https://taekwondoking.com/list-of-planet-fitness-equipment/ (constants in `src/engine/planetFitness.ts` and `src/engine/equipment.ts`). Clubs differ, so anything can be switched off in Settings.

## What the club has (used for planning)
- Strength machines: shoulder press, lateral raise, triceps extension, bicep curl, leg press, leg curl, leg extension, calf raise, glute kickback, abdominal crunch, lower back extension; chest press and Hammer-style rows in many clubs.
- Cable towers and dual adjustable pulleys, Smith machines, benches.
- Dumbbells up to 75 lb, EZ-curl bars and fixed barbells.
- Kettlebells, strength bands (functional area).
- Cardio: treadmill, elliptical, rower, upright and recumbent bike, stair climber.
- Not available: Olympic barbell and plates, squat rack, pull-up bar.

A machine exercise is only offered at Planet Fitness if it is on the list above. Hack squat, T-bar row, leverage deadlift, butterfly, seated calf and similar are never planned there.

## How a session is designed (`src/engine/suitability.ts`, `generate.ts`)
- **Level:** beginners get machines and cables first and no deadlift-type or other skill-heavy lifts; intermediate and regular lifters lead with dumbbells and the Smith machine.
- **Goal:** sets of reps and rest follow the goal (strength 3-6 and long rests; muscle 6-10 / 10-15; endurance and fat loss higher reps, short rests).
- **Age:** from 50, machines and cables are favoured and jumping moves are skipped; from 55, rep ranges are higher and sets a little lower; beginners on a strength goal use 5-8 reps.
- **Body weight, sex (optional):** only used for a cautious first-weight guess.
- **Days per week, soreness, exclusions, history:** choose the split, trim sets, filter exercises and rotate exercises.
- Every workout starts with a "Designed for you" note and a warm-up and cool-down note.

Exercises are ranked by a curated best-first list per muscle plus the factors above; rotation only breaks ties.
