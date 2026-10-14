# Lift: a free Fitbod-style workout app

A private, subscription-free workout generator and tracker for iPhone, built as a single-file web app (PWA). No backend, no accounts, no App Store.

## Features

- **Workout generator:** picks the muscle groups you've rested longest, filtered by your equipment, goal (strength / muscle / endurance), and session length (30-75 min).
- **Gym / Home modes:** Planet Fitness (dumbbells, machines, cables, bodyweight) and Home (dumbbells, bodyweight). Each location has its own editable equipment list.
- **Set logging:** weight and reps per set, with a tap-to-complete check and an automatic rest timer (60-150 s depending on goal).
- **Progressive overload:** if you hit all target reps last time, it suggests +5 lb (or +2.5 kg).
- **Swap:** replace any exercise with another for the same muscle.
- **Progress charts:** top set per session for any exercise you've logged twice or more.
- **lb / kg switch:** converts your history and current workout.
- **Exercise demos:** animated start/end photos, a "Watch form" YouTube link, and "How to" steps (from the free-exercise-db library, about 450 strength exercises).
- **Privacy:** all data stays in each phone's local storage. Nothing is shared between friends.

## Setup (GitHub Pages)

1. Create a new **public** repo on GitHub (e.g. `lift`).
2. **Add file -> Upload files**, add `index.html`, and commit.
3. **Settings -> Pages -> Deploy from a branch -> main -> / (root)** -> Save.
4. After about a minute the app is live at `https://YOUR-USERNAME.github.io/lift/`.
5. On each iPhone: open the link in Safari -> **Share -> Add to Home Screen**.

## Notes and limits

- The exercise library and images load from `raw.githubusercontent.com` (free-exercise-db, public domain). They are cached after first load.
- Barbell exercises are off by default for Planet Fitness (no barbells, only a Smith machine). Turn Barbell on in Settings if you want them.
- Safari can clear stored data if the app goes unused for weeks. History is only on that phone.
- iOS PWAs have limited push notification support, and vibration on timer end may be ignored.

## Ideas for later

- Smith machine exercise list for Planet Fitness
- Cloud sync (e.g. Supabase free tier) so history survives phone changes
- Export/import history as JSON
- Custom workout splits (push/pull/legs)
- Personal records and weekly volume stats
