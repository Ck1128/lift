# Changelog

## 2.7.2 - Five-action Health shortcut (branch feature/v2-complete)
- Pasted Health text can use dates exactly as the iPhone writes them ("Oct 21, 2026 at 7:30 AM"). The reading shortcut no longer needs Format Date or a variable.

## 2.7.1 - Easier Apple Health shortcut setup (branch feature/v2-complete)
- Pasted text can use Shortcuts' own wording: "32 min", "1 hr 5 min", "310 kcal", "172.4 lb".
- Step-by-step shortcut setup added to docs/APPLE_HEALTH.md.

## 2.7.0 - Apple Health, both ways (branch feature/v2-complete)
- Settings > Apple Health: send workouts, yoga, body weight and (optional) food calories to Health through a shortcut, and bring body weight and Apple Watch workouts back.
- Read Apple's own Health export (export.zip) on the phone, as a stream, with a preview and a "how far back" choice. Nothing is uploaded.
- Paste what a shortcut copied, preview it, then add it. Duplicates, workouts already logged in Lift and weights Lift already sent are skipped.
- "Add to Apple Health" on every saved workout and yoga session.
- Imported workouts show in Progress history as "Apple Health". The database moves to version 5 with one new table, nothing existing changes.
- Calorie estimates are never sent unless you turn that on.
- The two shortcuts are described step by step in the app. They have not been run on a real iPhone yet, so please tell me what differs.

## 2.6.0 - Guided first run and a calmer interface (branch feature/v2-complete)
- First run is now five short screens (what you use Lift for, your training, about you, your week, where you train) with a progress bar, Back and Next. Settings keeps the single page.
- Radio buttons, check boxes, the file picker and drop-downs now look finished and match the tab colour.
- The feedback button is a small, quiet speech bubble. "Ready to use offline" is a short toast that leaves by itself.
- Home: a switched-off feature is one quiet line instead of a card.
- Workout preview leads with the summary. Extra notes sit under "Why this workout".
- Workout screen: Add set, Replace and Skip sit in one tidy row, and finishing a set gives a small pop.
- Settings is one grouped list with a coloured icon on each row.
- Empty screens have an icon and clearer text.

## 2.5.0 - New look (branch feature/v2-complete)
- Type: Bricolage Grotesque for headings and numbers, Figtree for text. Both are bundled with the app, so there are no outside font requests and they work offline.
- Each tab has its own colour (Home ember, Plan teal, Workout red, Yoga violet, Food green, Progress blue, Settings slate). The colour fades in when you switch tabs and tints the top glow, buttons, chips and the status bar.
- Floating glass navigation bar with clean line icons instead of emoji.
- Softer cards with a tab-coloured glow, larger rounded corners, sentence-case card titles, press feedback on buttons, and a short fade-in when a tab opens.
- Dark mode uses brighter versions of each tab colour with dark text on buttons.

## 2.4.1 - Progress page cleanup (branch feature/v2-complete)
- Progress filters are now a compact date-range switch plus small on/off category toggles with a check mark, so it is clear what is shown.
- The filter card no longer carries a title or feedback button.

## 2.4.0 - Workouts designed for Planet Fitness and your profile (branch feature/v2-complete)
- The Planet Fitness equipment list now follows https://taekwondoking.com/list-of-planet-fitness-equipment/: rowers, kettlebells, bands and EZ-curl bars are in; Olympic barbell and pull-up bar are out; dumbbells up to 75 lb.
- Machines are limited to the ones the club has (added lateral raise, leg extension, glute kickback and back extension machines). Hack squat, T-bar row, leverage deadlift and similar are never planned there.
- Exercises are ranked per muscle by a curated best-first list plus your level, goal and age, instead of alphabetically. Beginners get machines and cables first and no deadlift-type lifts.
- Goal, level and age change reps, sets and rest. Every workout explains who it was designed for and includes a warm-up and cool-down.
- Workouts planned with the older version are rebuilt automatically.

## 2.3.0 - Feedback, export and recovery polish (branch feature/v2-complete)
- The app version now comes from package.json (one place) and must match the top CHANGELOG entry; a test enforces it. Bump it for every release.
- Feedback: the Share option sends the message and a plain-text file together through the iPhone share sheet (Messages, WhatsApp, Mail). Email, SMS and WhatsApp options put the whole message in the text and no longer download a file. Added Copy. Still never claims delivery.
- Removed "Save chart as image". Export moved from Progress to a collapsed section in Settings.
- Every screen opens at the top.
- Recovery tab redesigned (progress ring, ready and resting lists, per-muscle bars) and recovery times now adjust to your age and training level.

## 2.2.0 - Phase B3 (branch feature/v2-complete)
- US-09 One shared muscle model with 14 groups and primary/secondary roles; tests on common and multi-muscle exercises.
- US-06 Progress now has Results and Recovery. Recovery uses sets, effort, muscle size, frequency and elapsed time; front/back body map, legend, tap for details, honest empty state.
- US-07/08 Target-muscle map before and during a workout, with overlap against recent training. Informational only.
- US-03 Exercise instructions moved behind an "i" button (muscles, equipment, form tips, safety).
- US-04 Settings sections all start collapsed on every load.
- US-01/02/10 Small F feedback buttons, a Feedback and support section, preview before sharing, share sheet/email/SMS/WhatsApp/file. No built-in contact details; never claims delivery.
- US-05 Shared visual language applied across tabs (cards, headers, states).
- See docs/MUSCLES_AND_RECOVERY.md.

## 2.1.0 - Phase B2 (branch feature/v2-complete)
- US-062/069 Safe delete: warning, typed phrase, fresh math question; atomic and verified. US-069 migration safety (schema v4).
- US-063/070 Import with validation, preview (no writes), merge or replace, counts, atomic apply.
- US-067 Password-protected export (Web Crypto, PBKDF2 + AES-GCM) with category choices.
- US-064 Replace an exercise while keeping the day's intent, with undo. US-065 Per-exercise equipment choice.
- US-066 Choose Workout, Yoga or both (required, changeable, history kept; existing profiles default to both).
- US-061 Yoga "How to do it": safety, steps, easier options, common mistakes, and a tap-to-load reference video slot (no unverified links).
- US-068 Calmer visual redesign: tokens, one main action on Home, week progress, loading/error states.
- See docs/DATA_SAFETY.md and docs/YOGA_MEDIA.md.

## 2.0.0 - Phase B (branch feature/v2-complete)
- Three training levels (beginner, intermediate, regular gym-goer); beginners provide height and weight.
- Height in ft/in or cm, kg/lb selector beside every weight field, page default with per-field override; stored as cm and kg.
- Fixed bodyweight greyed-out bug; Planet Fitness equipment applies automatically, with exclusions.
- Durations 30/45/60/75/90 or custom (15 minimum); cardio in workouts and cardio-only days.
- Finish button at top and bottom; rest timer with pause, resume, skip and +15s; resume or edit a completed workout.
- Reset a day with three separate confirmations.
- Yoga: 13 styles, levels, location, props, history and charts.
- Food: five meals, raw/cooked, units, edit/duplicate/delete, daily summary, optional non-punitive guidance, opt-in Open Food Facts search.
- Charts with data tables, date ranges, CSV / JSON / PNG export.
- Back navigation with a hash router and unsaved-changes guard; in-app Help.
- Database schema v3 with tested migration; backup v2 (v1 files still import).
- Honest Apple Health panel (not connected).
- Yoga style filter by intent and an explicit "No props" choice.
- Online food search is now an On/Off switch (off by default).
- First-time exercises get a light, labelled starting-weight guess from level, body weight and optional sex (never a safe-load rule).
- Removed stale root-level sw.js, manifest.json, duplicate icons, README_1.md and index.pdf (the PWA files are generated by the build).
- See docs/PHASE_B_AUDIT.md.

## 1.0.0 - Full local-first app (branch feature/v2-complete)
- Local profile, goals, training days, units, exercise exclusions (Dexie / IndexedDB, schema v2 with migration).
- 234-exercise bundled catalog (public-domain source + manual entries) with validation.
- Home / Planet Fitness / generic gym equipment lists with weight ranges and steps.
- Deterministic workout engine: weekly split, daily generation, time estimates, progression, soreness, calories, rescheduling.
- Workout player: set logging, rest timer, pause, skip, replace, pain flag, finish early, crash-safe saving.
- Progress: weekly counts, sets per muscle, trends, records, body weight, history.
- Backup export/import with validation, preview, merge/replace, atomic import.
- PWA: manifest, icons, service worker with offline cache, offline banner, safe prompt-based updates.
- 90 automated tests (engine, database, UI).

## 0.1.0 - Phase 1: app shell
- Vite + React + TypeScript shell, five screens with sample data, GitHub Pages workflow.
