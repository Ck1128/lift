# Changelog

## 2.20.0 - The timer keeps going (branch feature/v2-complete)
- The rest timer now lives outside the workout screen. It stays on every tab, is saved on the phone, and is still right after you minimise the app or lock the screen. Finishing or discarding a workout ends it.
- While a rest runs, a quiet audio track with the 1 second beep inside plays, so the beep can sound with the screen locked. It mixes with music you already have playing. iPhone web apps still cannot vibrate.
- Recovery: the body is now a shaded figure you can drag to turn. Tap a muscle to light it up and see its details in a pop-up, right where you are.
- Feedback: Preview opens a pop-up over the form with Back and Confirm and share.
- Workout tab: areas marked injured in Settings now show under the pain check every day, with a tap to mark them healed.
- Workout preview is a short list, and Start workout stays in reach above the tab bar. (Fixed a style clash that squashed this tab.)

## 2.19.0 - Built from your body (branch feature/v2-complete)
- Height and body weight are now required for the workout track. Starting weights and calories are built from them.
- Rest timer: separate switches for a 2-second vibration and a 1-second beep, both 10 seconds before a rest ends. iPhone web apps cannot vibrate, so the beep covers it (it follows the ringer switch).
- The LIFT opening animation plays on every launch, and again every 2 hours if the app stays open.
- Workout is now burnt orange, Yoga deep violet, and the red accents are a harder red. No pink left.

## 2.18.0 - Tidy-ups (branch feature/v2-complete)
- Language now lives inside Profile and goals in Settings.
- The rest timer has no sound. It vibrates for 2 seconds, 10 seconds before the rest ends (Android; iPhone web apps cannot vibrate). It has its own icon in Settings.
- Home icons and labels are darker and easier to see on the green.
- Activity (inside Progress) is orange. Food is sky blue and Progress is indigo, so no two tabs share a colour.
- Removed the music buttons completely.

## 2.17.0 - Fewer tabs, lime Home, LIFT opening (branch feature/v2-complete)
- Activity moved into Progress, as a third view next to Results and Recovery. The bottom bar is back to six tabs.
- Home is light and fresh: white with a lime glow, lime buttons with dark text. Food now uses warm orange so it no longer shares green with Home.
- A LIFT opening screen each time the app is opened: the name, "Train. Restore. Nourish. Repeat." and "All the pieces of a healthier body, connected in one place." Tap to skip.

## 2.16.0 - Equipment fixes, Activity, pain check, languages (branch feature/v2-complete)
**Bug fixes (from your reports)**
- Workouts now use only the dumbbell weights you own. In Settings, type exactly which weights you have (for example `12`, or `10, 12, 20`).
- No bench ticked means no bench exercises (lying triceps extensions, bench presses, incline work and so on).
- Light beginners with only heavy dumbbells no longer get small isolation moves (raises, curls) that would be too heavy. They get moves that suit the weight, or a note that a lighter pair or a band would unlock a muscle. Strong lifters with only light weights are steered to moves where light weights still work, with tempo advice.

**New**
- **Pain check** before every workout: tap where it hurts and how much. Moderate or severe pain removes exercises that load that area; mild pain trims a set. Starting a workout needs the answer.
- **The next workout adapts** after each session: very hard sessions (effort 9+) or unfinished sets mean one set fewer; two easy sessions in a row mean one more; three hard sessions in a row trigger a lighter session. Weights jump two steps after an easy session and drop a step after a very hard, unfinished one.
- **Activity tab**: approximate calories burned from your workouts and yoga, using your height, weight, age and sex (Mifflin-St Jeor resting burn x activity). Small print says it is an estimate.
- **Languages**: English, Hindi and Telugu in Settings. Titles, buttons, menus and main screens are translated; some long help paragraphs are still English.
- **Rest timer alert**: two beeps and a buzz 10 seconds before a rest ends (iPhone cannot vibrate in web apps, so it beeps).
- **Music buttons** (previous, play/pause, next) in the workout screen, using three small Shortcuts. Off by default.
- Body Story gets a light-hearted, animated encouragement card (with a reminder to have a drink of water).
- Feedback is sent by icon: Message, WhatsApp, Email or Copy.
- Yoga and Workouts are now a bar with a sliding switch on Home. Turning one off asks first.
- Progress history can be collapsed.
- 270 more Indian foods (about 640 in all). The Telugu hint is gone from the search box; Telugu names show only when the app is in Telugu.
- Removed the "Plan v1 - generator" line from saved workouts.
- Home and the base colours are warm now (coral and amber) instead of blue.

## 2.15.0 - Aurora look (branch feature/v2-complete)
A design-only change in its own commit (`src/theme-aurora.css`, `Ring.tsx`, new nav icons). Revert that commit to get the 2.14.1 look back.
- **Workout disk.** When a workout starts, a round disk closes clockwise as the planned time runs out. An inner ring fills as sets are done. The middle shows time left, "Paused", or "Over plan".
- **Aurora theme.** Bright sky background with soft colour glow, glass cards, vivid gradient hero, gradient buttons. Every tab has its own colour pair. Dark mode is a deep navy.
- **New two-tone icons** in a floating glass nav capsule with a glowing orb behind the current tab.
- **Week ring** on Home instead of a bar. Sora display font. Motion is off for people who ask for less.

## 2.14.1 - Reverted the "Premium" look (branch feature/v2-complete)
- Undid the 2.14.0 design change (commit 980d722). The app looks as it did in 2.12.0. Nothing else changed.

## 2.14.0 - Premium look (branch feature/v2-complete)
A design-only change in its own commit and its own file (`src/theme-premium.css`). Revert that commit to get the 2.12 look back.
- **Deep ink hero card** on Home with a glow in the tab colour, large confident headings and a glowing primary button.
- **Dark glass dock** for the bottom bar, with the current tab lit in its colour.
- **Layered soft depth** on cards, a faint aurora behind each page that changes with the tab, bigger tighter headings and numbers.
- Pill chips with a glow when on, softer fields with a clear focus ring, glowing progress bars, a glass sheet for dialogs.
- Cards rise in gently when a page opens. Motion is off for people who ask for less.

## 2.13.1 - Reverted the "Docs-clean" look (branch feature/v2-complete)
- Undid the 2.13.0 design change (commit c75d82a). The app looks exactly as it did in 2.12.0. Nothing else changed.

## 2.13.0 - "Docs-clean" look (branch feature/v2-complete)
A design-only change, kept in its own commit and its own file (`src/theme-docs.css`) so it can be rolled back by reverting that commit.
- White pages with thin borders instead of soft gradients and glow. One calm blue accent on every tab instead of a colour per tab.
- Flat pill-shaped buttons with one clear primary action. Outlined secondary buttons. Chips and toggles show a tick when on.
- A plain docked bottom bar with a soft highlight on the current tab, like a document app. Quiet grey icons in Settings.
- One font family throughout, with calmer heading sizes. Dark mode follows the same system.

## 2.12.0 - Safer deleting, confirmations, a Save button in Settings (branch feature/v2-complete)
- **Deleting a yoga session now takes three steps:** read the warning, type DELETE, then press a separate "Delete for good" button. Cancel at any step keeps everything. Enter never moves a step forward.
- **Online food search switch is at the top** of both food screens, with an **(i)** in the corner that explains what is sent and where, and holds "Clear saved results". Turning it on asks OK or Cancel first.
- **Every action asks OK or Cancel.** Starting, continuing or rebuilding a workout, finishing or reopening a yoga session, skipping an exercise or a day, sending to Apple Health, forgetting what was sent, rebuilding the plan, switching to your own equipment list and resetting a list. Simple taps while you train (marking a set done) are not interrupted.
- **Settings has a Save button.** Changes to yoga level, food guidance, training place, gym type, exercises to avoid, injured areas, your private note and the feedback icons wait until you press **Save changes** (or **Discard**). Equipment has its own **Save equipment**. During first setup, equipment still saves as you tick it.

## 2.11.0 - Fixes for finishing and starting workouts, and 370 Indian foods with Telugu names (branch feature/v2-complete)
- **Fixed: a new workout showed the old sets still done.** Starting a workout on a day that already had a saved one reopened the old workout. Now a workout you rebuild or ask for fresh starts with every set blank, and the one you finished stays safely in your history. If you did part of a workout, the screen asks plainly: **Continue my workout** or **Start a new workout**.
- **Fixed: an extra workout after a finished one was hidden.** The day now shows the workout still to do first.
- **Fixed: Start workout opened the next page halfway down.** The workout page, and the saved-workout summary, now open at the top.
- **Indian foods, with Telugu names.** Search finds about 370 foods without internet: dals, millets, vegetables, greens, fruits, tiffins, biryanis, curries, non-veg, snacks, sweets, drinks and spices. Search in Telugu script (సొరకాయ), Telugu in English letters (sorakaya), Hindi or English (squash, lauki, bottle gourd). Values are typical home-style estimates and are marked approximate.
- **Your data and updates.** Checked and tested: an update never erases saved data. A test now opens a database saved by the very first version and confirms every row survives, and another test fails if any new code could clear storage. The app also asks the browser to keep your data when the phone is short on space.

## 2.10.1 - Brand-neutral gym names (branch feature/v2-complete)
- Every mention of a specific gym chain is gone from the app, code, file names and documents. The gym choices are now "Standard gym (machines and dumbbells)" and "Full gym (barbells and racks)".
- Saved profiles, equipment lists and backups made by earlier versions are renamed automatically the first time the app opens. Nothing you chose changes.

## 2.10.0 - One workout card, injuries on Home, required date of birth and sex (branch feature/v2-complete)
- **One workout card on Home.** Lift's call, the time picker and the main "Generate / View / update workout" button are now a single card. Under the button are two quiet options: **I'll choose** (pick a focus and Lift designs it) and **Express circuit · 30 min**. The separate "Today's call" card is gone. On a rest day the card says so and offers "I want to train anyway".
- **Injured or recovering areas** are on Home (Adjust card), as well as in Settings. No more digging.
- **Date of birth and sex are now required** at setup, for everyone. Age is worked out from the date of birth every time, so it stays right as years pass, and the setup screen shows the age it calculated. Existing profiles without them get one short card on Home, and workouts wait until they are filled in.
- Sex and age feed starting weights, calorie estimates and recovery times, all on the phone.

## 2.9.0 - Express circuit, and recovery that knows your sex and injuries (branch feature/v2-complete)
- **30 minute express circuit**, optional. Pick it under "I'll choose" on Home, or tap the small "Try the 30 minute express circuit" link under Today's Call. It is one exercise each for legs, chest, back, hamstrings, shoulders and core, done back to back for three rounds, with lighter weights. Lift never picks it for you.
- **Injured areas** (Settings > Exercises to avoid): marked areas recover about 50% slower in your recovery map, get one fewer set, and are never the first choice for Today's Call. A very sore area is left out of the circuit.
- **Sex now shapes recovery** (if you gave it): a small, bounded shortening for women, shown in the recovery explanation. Nothing changes if you left it blank.
- Developer note: the type check script was not checking anything before; it now runs the real project build (`tsc -b`).

## 2.8.0 - Today's Call, Machine Taken and Body Story (branch feature/v2-complete)
- **Today's Call** is the first card on Home. By default Lift decides: it reads your recovery map, your plan and any soreness, and says what to do today and why. Switch to "I'll choose" to pick a focus (full body, upper, lower, push, pull, legs, cardio) and Lift designs that workout. Choosing a tired muscle is never refused; Lift just keeps the sets lighter and says so.
- Yoga pairs with training. After a workout, Home offers a 10 minute gentle cool-down for the muscles you just worked. On recovery days it offers a yin session. The Yoga screen then favours poses that stretch those muscles, and you can clear that focus.
- **Machine taken**: one tap during a workout swaps in the closest alternative for the same muscle, preferring different equipment, remembers your choice for next time and never swings back to a busy one.
- **Body Story**: a plain weekly and monthly recap (workouts, yoga, most-worked muscles, new bests, body weight change). A weekly story is saved on Sunday and a monthly one on the last day of the month, the next time you open Lift if you missed the day. Open it any time from Home, including "this week so far". Share as text, with body weight included by default and a switch to leave it out.
- **Weekly weigh-in**: a popup from Monday that you can close, and that comes back each day until the week has a weight. It never shows on the day you set the app up.
- **Privacy page** (Settings > About and privacy): what is stored on the phone, and the only things that can leave it.
- No new database tables: stories and preferences live in settings, so backups and Delete all data already cover them.

## 2.7.3 - Fixes from your testing (branch feature/v2-complete)
- Finish workout (and every other sheet) now sits above the navigation bar, so its buttons can be tapped.
- Feedback by SMS or WhatsApp starts with +1, which you can edit. A 10-digit US number without a code gets 1 added. Once Messages, WhatsApp or Mail opens, the feedback sheet closes.
- Back is on every page except Home. Going Back no longer asks "Leave without saving?" and no longer erases typed input: profile edits, setup answers, a food entry in progress and a feedback message are kept as drafts for a day, with a "Start over" link. Drafts are wiped by "Delete all data". The setup equipment page also has Back.
- The two-photo exercise clip moves again. The workout screen redraws four times a second, which kept restarting its timer.
- The exercise "i" sheet no longer shows the form tips twice (once as tips, once as numbered steps).

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

## 2.4.0 - Workouts designed for a standard gym and your profile (branch feature/v2-complete)
- The standard gym equipment list now matches a typical machine-based gym: rowers, kettlebells, bands and EZ-curl bars are in; Olympic barbell and pull-up bar are out; dumbbells up to 75 lb.
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
- Fixed bodyweight greyed-out bug; Standard gym equipment applies automatically, with exclusions.
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
- Home / standard gym / full gym equipment lists with weight ranges and steps.
- Deterministic workout engine: weekly split, daily generation, time estimates, progression, soreness, calories, rescheduling.
- Workout player: set logging, rest timer, pause, skip, replace, pain flag, finish early, crash-safe saving.
- Progress: weekly counts, sets per muscle, trends, records, body weight, history.
- Backup export/import with validation, preview, merge/replace, atomic import.
- PWA: manifest, icons, service worker with offline cache, offline banner, safe prompt-based updates.
- 90 automated tests (engine, database, UI).

## 0.1.0 - Phase 1: app shell
- Vite + React + TypeScript shell, five screens with sample data, GitHub Pages workflow.
