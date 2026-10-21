# Lift

A free, private workout planner for you and your friends, inspired by the general workflow of apps like Fitbod. It is a web app you add to your phone's Home Screen. **No server, no account, no subscription, no paid services.** Everything is stored on each person's own phone.

## What it does

- **Weekly plan:** turns your training days into a muscle-group plan (full body, upper/lower, push/pull/legs). Back-to-back days get splits that do not repeat the same muscles.
- **Daily workout:** pick how many minutes you have; it builds a workout from your equipment, goal, experience, soreness and history.
- **Home and gym:** separate equipment lists. Planet Fitness starting list (no barbells; Smith machine, dumbbells, machines, cables) and a generic gym list. You confirm what is really there and can untick anything broken or taken.
- **Workout player:** log weight, reps and optional effort for every set, rest timer, pause/resume, skip, replace an exercise, "felt pain" flag, finish early. Every set is saved the moment you tap the check.
- **Progression:** suggests next weights from what you actually did (rules below).
- **Progress:** workouts per week, sets per muscle, exercise trends, personal records, body weight, and a searchable history you can reopen read-only.
- **Exercise help:** steps for every exercise, two-frame start/end photos that flip like a short clip, and a link to a form video.
- **Backup and restore:** export/import a JSON file (merge or replace) with validation and an all-or-nothing import.
- **Offline:** after the first load, the app and your data work without a connection.

## New in 2.0

Three training levels, kg/lb and ft/in everywhere, cardio, yoga, food logging, charts with export, a rest timer, Back navigation and a safe day reset. Details: `CHANGELOG.md`, `docs/PHASE_B_AUDIT.md`, `docs/yoga-catalog.md`, `docs/food-providers.md`, `docs/planet-fitness-equipment.md`, `docs/apple-health-native-notes.md`.

Food and yoga are general wellness tools, not medical advice. Apple Health is not connected.

## New in 2.1
Safe delete, encrypted export and previewed import (docs/DATA_SAFETY.md), replace-exercise and per-exercise equipment, a Workout / Yoga / Both choice, yoga how-to guidance (docs/YOGA_MEDIA.md), and a calmer design.

## New in 2.2
A muscle recovery map and workout target-muscle map (docs/MUSCLES_AND_RECOVERY.md), info buttons instead of long instructions, collapsed Settings sections, and in-app feedback you review before sharing. To pre-fill a feedback destination for your own build, set `VITE_FEEDBACK_EMAIL` or `VITE_FEEDBACK_PHONE` at build time; nothing is hardcoded.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install     # first time only
npm run dev     # then open the address it prints. It ends in /lift/
```

The address must end in `/lift/` (for example `http://localhost:5173/lift/`). Without it you get a blank page, because the app is built for GitHub Pages' sub-folder. Do not open `index.html` by double-clicking it.

To try it on your phone while developing, run `npm run dev -- --host` and open the "Network" address in Safari on the same Wi-Fi. That checks layout only. Installing and offline mode need the real HTTPS site.

## Checks

```bash
npm run lint        # code style
npm run typecheck   # type mistakes
npm test            # 90 automated tests
npm run build       # production build into dist/ (also builds the service worker)
npm run preview     # serve dist/ locally to try the built app
```

## Put it online (GitHub Pages)

1. Merge the work into `main` (the workflow deploys from `main`).
2. In the repo: **Settings -> Pages -> Build and deployment -> Source: GitHub Actions**.
3. Push to `main`. In the **Actions** tab, wait for "Test and deploy to GitHub Pages" to go green. It runs lint, typecheck, tests and build first.
4. The address appears on the run (normally `https://YOUR-USERNAME.github.io/lift/`).

If your repo is not named `lift`, change `base` in `vite.config.ts`.

## Install on a phone

**iPhone (Safari):** open the site address, tap **Share**, then **Add to Home Screen**, then **Add**. Open it from the new icon.
**Android (Chrome):** menu, then **Install app** (or **Add to Home screen**).

Each person's data is separate and lives only on their own phone.

## Manual test checklist (needs a real iPhone)

Automated tests cannot prove these. Please tick them off on a real phone:

- [ ] Add to Home Screen works; it opens full-screen with the Lift icon.
- [ ] Create a profile, confirm equipment, generate a workout.
- [ ] Log a few sets, close the app completely, reopen: logs are still there and the workout can be resumed.
- [ ] Turn on Airplane Mode: all screens open, you can start and finish a workout, sets are saved.
- [ ] Turn Wi-Fi back on: the "offline" banner disappears.
- [ ] Export a backup (the Share sheet should offer "Save to Files"), then import it.
- [ ] After a new version is deployed, the "new version is ready" banner appears; tap Reload; your history is still there.
- [ ] Buttons are easy to tap with one hand during a workout.
- [ ] Repeat the install and offline checks on a friend's phone.

## How the rules work

Everything is ordinary TypeScript running on the phone. The same inputs always give the same workout. No AI service and no randomness.

**Weekly plan** (`src/engine/split.ts`): 1 day = full body; 2 days = full body A/B (upper/lower if the days are back to back); 3 days = full body A/B/C, or push/pull/legs if the days are consecutive or you are experienced and train for muscle or strength; 4 = upper/lower x2; 5 = push/pull/legs + upper/lower; 6 = push/pull/legs x2. It lists any muscle groups the week misses and any same-muscle days back to back.

**Daily workout** (`src/engine/generate.ts`):
1. Drop exercises that need equipment you have not ticked, that you excluded (or whose movement type you excluded), or that are too advanced for beginners.
2. For each target muscle pick the best exercise (big lifts first; exercises not done recently first), then add more in passes, preferring different movement patterns.
3. Rep ranges and rest times come from your goal (for example muscle: 6-10 reps for big lifts, 10-15 for accessories, 90 s / 60 s rest). Beginners get fewer sets. Moderate or heavy soreness on a muscle removes one set.
4. Add exercises while the **time estimate** fits your minutes: about 45 s per set (40 s for strength), the goal's rest between sets, 90 s between exercises, and a 5-minute warm-up for sessions of 45 minutes or more. If even one exercise does not fit, it says so instead of claiming it does.
5. Heavier lifts go first, accessories last.

**Weight suggestions** (`src/engine/progression.ts`, double progression): no history means no number (you choose a light weight). Pain reported means the same weight. Every set at the top of the rep range and no set rated 9-10 effort means plus one equipment step. Otherwise the same weight, aiming for one more rep. Never increases after a poor session. Weights snap to what your dumbbell range and step allow; machines use 5 lb or 2.5 kg steps.

**Calories** (`src/engine/calories.ts`): calories = MET x body weight (kg) x hours, using resistance-training MET values of 3.5 (light/moderate) and 6.0 (vigorous) from the Compendium of Physical Activities. Shown as a rounded range and labelled a rough estimate. Weight lifted is not used because it is not a reliable predictor. Needs your body weight and at least 5 active minutes.

**Rescheduling** (`src/engine/reschedule.ts`): when you skip a day, it looks up to 7 days ahead for a free day whose neighbours do not train the same muscles. It is a suggestion only; if nothing fits it tells you it is fine to just carry on.

## Where your data lives

- Browser IndexedDB on your phone, via Dexie (`src/db/`). Tables: profile, equipment, plans, scheduled, sessions, setLogs, settings, soreness, bodyWeights. Schema version 2 (version 1 to 2 adds soreness and body-weight tables and backfills older sessions; it never deletes rows).
- Planned workouts are saved with the generator version and a fingerprint of the inputs, and are reused only while those inputs are unchanged. Finished sessions keep a frozen copy of what was planned, so changing your plan never rewrites history.
- Safari can clear website data if the app goes unused for a long time. **Export a backup now and then.**
- Never commit backups or personal data to GitHub (`*backup*.json` is git-ignored).

Differences from the suggested schema in the spec: the exercise catalog is bundled in the app code rather than copied into the database; unavailable gym equipment is the `available` flag on each equipment item; "alternative exercise ids" are computed on demand.

## Updates

New versions are downloaded in the background and wait until you tap **Reload** on the banner, so an update never interrupts a workout. Your data lives in the database, not in the cached app files, so updates do not touch it.

## Exercise data

`src/data/catalog.json` is built by `scripts/build-catalog.py` from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense, public domain) plus a few hand-written entries (`src/data/manualExercises.ts`). Photos load from that project the first time you view them and are then cached for offline use. Planet Fitness equipment varies by location; the starting list is a guess you confirm.

## Project layout

```
src/engine/   pure logic (no React, no database): split, generate, progression, time, calories, reschedule, history, validation
src/db/       Dexie schema + migrations, repository functions, backup/restore
src/data/     exercise catalog
src/screens/  Home, WeeklyPlan, Workout (+Player), Progress, Settings, Onboarding
src/components/  shared UI
```

## Troubleshooting

- **Blank page locally:** use the address ending in `/lift/`; do not double-click `index.html`.
- **Blank page online:** check that `base` in `vite.config.ts` matches the repo name and that Pages source is "GitHub Actions".
- **Old version still showing:** close the app fully and reopen, or tap Reload on the update banner.
- **Lost data after clearing Safari data:** restore from your last backup (Settings -> Backup and restore).
- **Photos missing offline:** photos cache the first time you view them online; the written steps always work offline.

## Limitations

- No automatic sync between phones; use export/import.
- iPhone web apps cannot send reliable push notifications, and vibration on timer end may be ignored.
- Time, weight and calorie figures are estimates. This app is not medical advice and cannot tell you what is safe for your body.
