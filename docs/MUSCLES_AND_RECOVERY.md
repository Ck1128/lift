# Muscle model, recovery and feedback

## One muscle model (`src/engine/muscleMap.ts`)
The catalog stores ten coarse muscles. `musclesOf(exercise)` derives 14 on-screen groups (chest, shoulders, biceps, triceps, forearms, upper back, lats, lower back, abs, obliques, glutes, quads, hamstrings, calves) with primary and secondary roles. Workout previews, the recovery model, the body map and exercise info all use it. An exercise with no usable data is reported as "unmapped" and left out, never guessed. Workout records store only exercise ids, so changing the mapping never breaks old records.

## Recovery estimate (`src/engine/recovery.ts`)
Local only. For each muscle it looks at every recent finished session using it: effective sets (primary 1, secondary 0.5), average effort (RPE 9+ needs longer), muscle size (large 48 h base, small 36 h), how many sessions came in the previous 7 days, and elapsed time. Status: Recovered, Recovering, Recently trained, or No data (never trained, so nothing is assumed). It recalculates when a workout is finished, edited or deleted. It is an estimate, not a medical assessment, and never blocks a workout.

## Where it shows
Progress > Recovery (map, days since last workout, recovered count, tap a muscle). Workout preview and in-workout: target-muscle map with main/also worked, tap for exercises, and overlap with recently trained muscles.

## Feedback
Small F buttons (can be hidden in Settings) and Settings > Feedback and support. The person previews the exact message and file, then confirms. Channels: share sheet (can include the file and screenshot), email, SMS, WhatsApp (open the app with the message; cannot attach files or confirm delivery), or save a file. No address or number is in the source. To pre-fill a destination, set `VITE_FEEDBACK_EMAIL` / `VITE_FEEDBACK_PHONE` at build time. No health or workout data is included unless the person ticks the box that attaches a named item.
