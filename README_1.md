# Lift: a free Fitbod-style workout app

A private, subscription-free workout generator and tracker for iPhone, built as a lightweight web app (PWA) — just `index.html` plus a small service worker and manifest for offline use and a home-screen icon. No backend, no accounts, no App Store.

## Features

- **Workout generator:** picks the muscle groups you've rested longest, filtered by your equipment, goal (strength / muscle / endurance), and session length (30-75 min).
- **Gym / Home modes:** Planet Fitness (dumbbells, machines, cables, bodyweight) and Home (dumbbells, bodyweight). Each location has its own editable equipment list in Settings, with barbell off by default for Planet Fitness.
- **Set logging:** weight and reps per set, with a tap-to-complete check and an automatic rest timer (60-150 s depending on goal). The timer counts down from a stored end time rather than a simple countdown, so it stays accurate even if the app is backgrounded or the phone locks mid-rest.
- **Progressive overload:** if you hit all target reps last time, it suggests +5 lb (or +2.5 kg) on your top set from that exercise's last session.
- **Swap:** replace any exercise with another for the same muscle and equipment.
- **Progress charts:** top set per session for any exercise you've logged twice or more.
- **lb / kg switch:** a display-only toggle. Each logged set keeps the unit you entered it in; switching converts what's shown on screen without rewriting your history, so toggling back and forth never rounds your numbers twice.
- **Exercise demos:** start/end photos, a "Watch form" link (a YouTube search for the exercise name), and "How to" steps, from the free-exercise-db library filtered to its `strength` category (several hundred exercises; exact count depends on that library's current contents).
- **Privacy:** all data stays in each phone's local storage. Nothing is shared between friends, and nothing is sent to a server.

## Setup (GitHub Pages)

1. Create a new **public** repo on GitHub (e.g. `lift`).
2. **Add file -> Upload files**, and add all of: `index.html`, `sw.js`, `manifest.json`, `icon-192.png`, `icon-512.png`. Commit.
3. **Settings -> Pages -> Deploy from a branch -> main -> / (root)** -> Save.
4. After about a minute the app is live at `https://YOUR-USERNAME.github.io/REPO-NAME/` (e.g. `/lift/` if you named the repo `lift`).
5. On each iPhone: open the link in Safari -> **Share -> Add to Home Screen**. This is what makes the service worker and manifest matter — the app gets its own icon and keeps working without a signal once it's loaded at least once.

## Notes and limits

- The exercise library, images, and instructions load from `raw.githubusercontent.com` (free-exercise-db, public domain). A service worker (`sw.js`) caches the app files and this data after first load, so the app and exercise library keep working offline — but a brand new phone needs one successful load with a connection first.
- Barbell exercises are off by default for Planet Fitness (no barbells, only a Smith machine). Turn Barbell on in Settings if you want them.
- Safari can clear stored data if the app goes unused for weeks. History is only on that phone — there's no account or sync, so a cleared phone loses its logs.
- iOS Safari does not support the Vibration API, so the end-of-rest buzz silently does nothing on iPhone; the app instead plays a short tone and briefly changes the tab/page title when a rest timer finishes. It also doesn't support rich push notifications for a home-screen web app, so timer alerts only work while Lift is the open tab/app.
- The +5 lb / +2.5 kg progressive-overload suggestion is a flat increment in whichever unit you're currently viewing, not a converted equivalent — so switching units right before a workout changes the suggested jump slightly. It's meant to match common plate/dumbbell increments, not to track a single canonical number across units.

## Ideas for later

- Export/import history as JSON (worth doing first — it's the easiest way to protect against the Safari-storage-clearing risk above)
- Smith machine exercise list for Planet Fitness
- Cloud sync (e.g. Supabase free tier) so history survives phone changes
- Custom workout splits (push/pull/legs)
- Personal records and weekly volume stats
