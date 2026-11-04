# Fit Workout — Zero-Cost App Build Specification
## A very detailed, beginner-friendly instruction manual for an AI coding agent

**Project goal:** Build a Fitbod-inspired workout app that the owner and a small group of friends can install on their phones and use without paying for hosting, a database service, an AI API, or App Store publication.

**Primary approach:** A mobile-first Progressive Web App (PWA) built with React, TypeScript, and Vite. It runs on each person's phone. Workout generation and personal data storage happen locally on that device.

**Important:** This document describes the required product and implementation. The coding agent must inspect the actual repository, implement the work in small steps, run tests, report results honestly, and never claim a feature works without testing it.

---

# 1. Instructions to the AI coding agent

You are the senior engineer, product designer, tester, and technical writer for this project. The owner is a beginner. Explain things simply, make safe choices, and do not assume the owner knows software terminology.

## 1.1 How you must work

1. Inspect the repository before changing files.
2. If no app exists, create the project using the stack in this document.
3. Work in small, testable increments. Do not attempt the entire app in one giant change.
4. Before each significant change, explain in plain language what you will change and why.
5. Make the smallest coherent change that satisfies the current user story.
6. Run the relevant tests, type checks, lint checks, and production build after changes.
7. Fix failures you introduce before moving to the next story.
8. Do not delete existing user work unless explicitly asked.
9. Do not introduce paid services, a server, cloud database, or paid API.
10. Do not invent test results. State exactly which commands ran and whether they passed.
11. If a requirement cannot be completed, explain the blocker and the next practical step.
12. Keep a `README.md` with beginner-friendly setup, run, test, deployment, installation, backup, and troubleshooting instructions.
13. Keep a `CHANGELOG.md` or an equivalent short record of major changes.
14. Do not put secrets, personal health data, or workout records into GitHub.
15. Use accessible labels, readable text, clear errors, and mobile-friendly controls.

## 1.2 How to communicate with the owner

At the end of each work session, report:

- What you built.
- Files you created or changed.
- Commands you ran.
- Tests and builds that passed.
- Tests that failed or were not run.
- Any manual steps the owner must do.
- The single best next task.

Use plain language. Explain technical terms the first time they appear. Do not say “everything is done” if any acceptance criterion remains untested.

---

# 2. Product vision

Build a personal workout planner inspired by the general workflow of Fitbod. Do not copy Fitbod's proprietary code, branding, or assets.

The app should help a user answer five questions:

1. What muscle groups am I training today?
2. Which exercises should I do with the equipment I actually have?
3. How many sets, repetitions, and how much rest should I use?
4. How can I finish a suitable workout in the time I have today?
5. How should my next workout use what I did last time?

The app should be simple to use while exercising. It should remember the user's plan and history on that phone, including when the phone is temporarily offline.

## 2.1 First-release priorities

The first release must prioritize:

1. A working mobile-first app.
2. A weekly workout plan.
3. Home and gym equipment selection.
4. Personalized daily workout generation.
5. Logging sets, repetitions, and weights.
6. Saving data on the phone.
7. Offline use after the app has been loaded and cached.
8. Installation on the owner's iPhone and friends' phones without App Store publication.
9. Backup and restore so a phone's local data can be moved manually.

Do not start with AI coaching, social networking, subscriptions, wearables, or cloud accounts.

---

# 3. Non-negotiable cost and architecture requirements

## 3.1 The app must not require a paid service

Use free tools and local execution:

- Frontend: React + TypeScript + Vite.
- App installation: Progressive Web App (PWA).
- Local database: IndexedDB using Dexie.
- Workout engine: ordinary TypeScript rules running on the phone.
- Offline app files: service worker and cached static assets.
- Source code: GitHub.
- Static hosting: GitHub Pages.
- Automated deployment: GitHub Actions, subject to the free usage limits and current account terms.
- Tests: free local test tooling such as Vitest and React Testing Library.

Do not add Supabase, Firebase, a custom server, paid hosting, a paid AI API, or a paid database service.

Free plans and provider terms can change. The app itself must not depend on a hosted backend to generate workouts or store personal data.

## 3.2 What “the backend runs on the phone” means here

This first release has no traditional backend server. Each device runs the user interface, workout-generation logic, and local database.

GitHub Pages only serves the app's static files. It does not run application server code. Once the app is loaded and its assets are cached, the core workout experience should work offline.

Each phone has its own private database. Data does not automatically synchronize between friends' phones. Manual export and import are the initial data-transfer method.

## 3.3 Recommended architecture

```text
GitHub repository
    |
    | GitHub Actions builds and publishes static files
    v
GitHub Pages (HTTPS static hosting)
    |
    | user opens URL in Safari or another supported browser
    v
Installed PWA on user's phone
    |
    +-- React user interface
    |
    +-- TypeScript workout engine
    |
    +-- Dexie / IndexedDB local database
    |
    +-- Service worker and cached app assets
    |
    +-- JSON backup export and import
```

## 3.4 Important limitations

- No automatic cloud synchronization.
- No central server to reset passwords or manage accounts.
- Each device's database is independent.
- Browser storage can be cleared or lost; users need backups.
- GitHub Pages site visibility and repository visibility depend on GitHub's current plan and settings. Do not treat an obscure URL as a security control.
- The app must never place private profiles, health information, or workout logs in the repository.
- A PWA is not a native App Store app. It can be added to the iPhone Home Screen through Safari, but browser capabilities differ from native apps.
- Offline support must be implemented and tested; simply calling the site a PWA does not make every feature work offline.

---

# 4. Target users and basic experience

A user may be a beginner or experienced exerciser. They may train at home or in a gym. They may have 20 minutes one day and 60 minutes another day.

The main flow must be:

1. Open the app.
2. See today's planned muscle groups and session.
3. Choose how much time is available today.
4. Review the generated workout.
5. Start the workout.
6. Record completed sets, reps, and weights.
7. Finish the session.
8. See the saved result.
9. Have future sessions use the saved training history.

The app must not require a network connection for this core flow after the app has been loaded and its static assets are cached.

---

# 5. Navigation and screen requirements

Build a simple navigation system with these five main areas:

1. Home
2. Weekly Plan
3. Workout
4. Progress
5. Settings

Use a clear bottom navigation bar on phone-sized screens where practical. Keep buttons large enough to tap while exercising. Do not overload the screen with unnecessary charts or settings.

## US-001 — Create the mobile-first application shell

**Priority:** P0 — required for the MVP.

**User story:** As a user, I want to open a clean, simple workout app on my phone so I can find today's workout quickly.

### Requirements

- Create the app with React, TypeScript, and Vite.
- Use a responsive layout designed for small phone screens first.
- Create the five main areas listed above.
- Add a consistent theme, spacing, typography, buttons, cards, and form controls.
- Include loading, empty, and error states where relevant.
- Provide sensible mock data only while the real data layer is being built.
- Keep screen components separate from business logic.
- Make navigation functional; do not create dead buttons.

### Acceptance criteria

- [ ] The app starts locally using the documented command.
- [ ] Home, Weekly Plan, Workout, Progress, and Settings can be opened.
- [ ] Layout is usable at common phone widths.
- [ ] No obvious horizontal overflow occurs on phone screens.
- [ ] TypeScript and production build succeed.
- [ ] README explains how to run the app.

---

# 6. User stories: onboarding and profile

## US-002 — Create a local user profile

**Priority:** P0.

**User story:** As a user, I want to enter my basic information and fitness preferences so that the app can personalize my workouts.

### Fields

- Display name or nickname (optional).
- Age or age range.
- Height and unit.
- Weight and unit.
- Fitness goal.
- Training experience.
- Preferred training days per week.
- Preferred session duration.
- Workout location: home or gym.
- Preferred measurement units.
- Exercises or movements the user wants to avoid.

### Rules

- Collect only information that is useful for the app.
- Do not require the user's legal name.
- Validate age, height, weight, and other numeric fields.
- Let the user change their profile later.
- Make units explicit. Never silently treat pounds as kilograms or inches as centimeters.
- Avoid storing sensitive medical details unless needed for an explicitly chosen safety restriction.
- Explain why a field is being requested.

### Acceptance criteria

- [ ] A user can create a profile without an account or internet connection.
- [ ] The profile persists after closing and reopening the app.
- [ ] The user can edit and save it.
- [ ] Invalid values produce understandable error messages.
- [ ] Units are saved and displayed correctly.

## US-003 — Capture health and exercise limitations carefully

**Priority:** P0 for basic exercise exclusions; advanced medical features are out of scope.

**User story:** As a user, I want to exclude exercises that are unsuitable for me so that the workout generator does not recommend movements I have told it to avoid.

### Requirements

- Allow the user to exclude specific exercises or movements.
- Allow the user to record a simple limitation or note if necessary.
- Use explicit exclusions to filter the exercise catalog.
- Do not diagnose injuries or medical conditions.
- Do not claim that the app can determine which exercise is medically safe.
- If a user reports pain or a medical restriction, advise them to obtain appropriate professional guidance rather than prescribing rehabilitation.
- Do not infer medical restrictions from unrelated profile fields.

### Acceptance criteria

- [ ] Excluded exercises are filtered out of generated workouts.
- [ ] Exclusions persist locally.
- [ ] The user can update or remove an exclusion.
- [ ] The engine returns a clear error or alternative if no suitable exercise exists.
- [ ] No diagnostic or rehabilitation claims are displayed.

## US-004 — Set fitness goals and schedule

**Priority:** P0.

**User story:** As a user, I want to set a goal and a realistic weekly training schedule so the app can create a balanced plan.

### Initial supported goals

- Muscle gain.
- Strength.
- General fitness.
- Endurance, if a suitable catalog is available.
- Fat loss, without promising a particular outcome.

### Requirements

- Let the user select available training days.
- Let the user select a goal and experience level.
- Let the user choose a preferred workout duration.
- Support rest days.
- Do not assume that every user should train every day.
- Make it possible to change the schedule later.

### Acceptance criteria

- [ ] The schedule reflects the selected days.
- [ ] Rest days are clearly marked.
- [ ] A schedule change affects future planned workouts without rewriting completed history.
- [ ] The app handles users selecting fewer training days than a sample split expects.

---

# 7. User stories: exercise catalog and equipment

## US-005 — Create a structured exercise catalog

**Priority:** P0.

**User story:** As a user, I want the app to have a useful library of exercises so it can select movements appropriate for my goal and equipment.

### Each exercise should support fields such as

- Stable exercise ID.
- Name.
- Description and instructions.
- Primary muscles.
- Secondary muscles.
- Movement pattern.
- Equipment requirements.
- Exercise type: machine, dumbbell, barbell, cable, bodyweight, cardio, or other.
- Difficulty or experience level.
- Suggested rep ranges.
- Whether the movement is unilateral or bilateral.
- Alternative exercise IDs.
- Explicit restrictions or exclusions that have been reviewed.
- Optional locally bundled image or illustration reference.
- Catalog version and source notes.

### Requirements

- Start with a small curated catalog.
- Do not scrape or claim to have every machine in any gym.
- Do not use copyrighted exercise images without permission.
- Use text instructions or properly licensed assets initially.
- Keep exercise definitions separate from any specific gym's equipment inventory.
- Validate catalog entries before the workout engine uses them.

### Acceptance criteria

- [ ] Exercise records have stable IDs.
- [ ] Exercises can be filtered by muscle, movement pattern, and equipment.
- [ ] Missing metadata is handled safely.
- [ ] The initial catalog is included in the app or loaded from local seed data.
- [ ] The app does not need a network request to access its base catalog.

## US-006 — Configure home equipment

**Priority:** P0.

**User story:** As a user, I want to tell the app which equipment I own so that it recommends exercises I can actually do.

### Equipment examples

- Adjustable or fixed dumbbells.
- Dumbbell weights and increments.
- Resistance bands.
- Bench.
- Pull-up bar.
- Barbell and plates.
- Kettlebells.
- Exercise mat.
- Cardio equipment.
- No equipment.

### Requirements

- Let users add, edit, and remove equipment.
- Capture the actual weight range and available increments where relevant.
- Distinguish between a single dumbbell and a pair.
- Support bodyweight-only training.
- Do not assume that a user owns a bench or every common accessory.
- Make equipment setup editable in Settings.

### Acceptance criteria

- [ ] A user can save a home equipment inventory.
- [ ] The inventory persists locally.
- [ ] The generator never selects an exercise requiring equipment not listed as available.
- [ ] Available loads respect the user's specified equipment.
- [ ] Removing equipment updates future workout generation.

## US-007 — Configure gym equipment

**Priority:** P0.

**User story:** As a user, I want to select gym training and confirm the equipment available at my location so that workouts match the machines I can use.

### Requirements

- Offer a generic gym profile and a standard gym profile.
- Start with a curated list of commonly encountered gym equipment.
- Do not claim the catalog represents every gym.
- Let users manually confirm available equipment.
- Allow equipment to be marked temporarily unavailable.
- Support alternative exercises when a machine is missing or occupied.
- Store a user's gym selection locally; no location tracking is needed for the MVP.

### Acceptance criteria

- [ ] The user can choose home or gym.
- [ ] The user can configure the equipment list.
- [ ] Only confirmed available equipment is used by the generator.
- [ ] A missing machine does not cause the whole session to fail if a suitable alternative exists.
- [ ] The app explains when no suitable alternative is available.

---

# 8. User stories: weekly planning and workout generation

## US-008 — Generate a weekly muscle-group plan

**Priority:** P0.

**User story:** As a user, I want to see which muscle groups I will train each day before seeing the individual exercises.

### Requirements

- Generate a weekly schedule based on the user's goal, experience, available days, and equipment.
- Clearly label each training day.
- Show target muscle groups and rest days.
- Ensure reasonable balance across major muscle groups over the week.
- Consider overlapping muscle use between sessions.
- Avoid scheduling hard sessions for the same muscles on consecutive days without an intentional reason.
- Do not assume one split is best for every user.
- Make the plan editable or regeneratable.
- Preserve completed sessions when a plan changes.

### Illustrative schedule only

| Day | Example focus |
|---|---|
| Day 1 | Upper body |
| Day 2 | Lower body |
| Day 3 | Rest or easy activity |
| Day 4 | Upper body |
| Day 5 | Lower body |
| Day 6 | Optional cardio or general fitness |
| Day 7 | Rest |

This is an example, not a mandatory plan for all users.

### Acceptance criteria

- [ ] A plan is generated from the user's actual training availability.
- [ ] Each day displays the focus or rest status.
- [ ] Muscle-group coverage can be inspected.
- [ ] The app does not create a plan with no training days unless the user explicitly chooses that.
- [ ] Changing the plan does not alter completed workout records.

## US-009 — Ask how much time is available today

**Priority:** P0.

**User story:** As a user, I want to choose today's available time so the workout fits my schedule.

### Requirements

- Offer practical choices such as 20, 30, 45, and 60 minutes, plus a custom option if useful.
- Ask before generating or finalizing the day's workout.
- Use today's scheduled muscle groups as the primary target.
- Reduce or expand the session without breaking the weekly plan.
- Include expected set time, rest time, and equipment transition time.
- Tell the user if the requested session cannot be completed within the chosen time.

### Acceptance criteria

- [ ] The user can choose a session duration.
- [ ] The duration affects exercise selection and volume.
- [ ] The duration estimate includes sets, rest, and transitions.
- [ ] The engine never silently claims a session fits when its own estimate exceeds the selected duration.
- [ ] A short session still prioritizes the scheduled training goal.

## US-010 — Generate the daily workout

**Priority:** P0.

**User story:** As a user, I want the app to turn today's schedule, available equipment, time, and history into a practical workout.

### Required workout details

- Exercise name.
- Target muscles.
- Exercise order.
- Number of sets.
- Rep target or range.
- Suggested starting weight, if sufficient information exists.
- Rest interval.
- Short instructions.
- Optional substitution.
- Estimated duration.
- Clear explanation if a target cannot be met.

### Rules

- Select only exercises supported by available equipment.
- Exclude user-blocked movements.
- Use training goal and experience to select suitable set and rep ranges.
- Use prior performance when available.
- Do not invent a precise starting weight when the app has no reliable basis.
- Label uncertain starting weights as estimates or ask the user to choose a conservative starting load.
- Use deterministic rules so the same inputs and engine version produce predictable results.
- Use no external AI API.
- Validate the generated workout before displaying it.

### Acceptance criteria

- [ ] A workout can be generated without an internet connection.
- [ ] The workout follows the day's scheduled muscle groups.
- [ ] Every exercise meets equipment and exclusion constraints.
- [ ] Sets, reps, rest, and time estimates are present.
- [ ] Invalid or impossible requests return an explanation instead of an unsafe or random plan.
- [ ] The generated session can be saved and reopened.

## US-011 — Explain why an exercise was selected

**Priority:** P1.

**User story:** As a user, I want a short explanation of an exercise recommendation so that I understand its purpose.

### Requirements

- Explain which muscles it targets.
- Explain which equipment it requires.
- Explain its role in the session, such as a push, pull, squat, hinge, or accessory movement.
- Explain why a substitution was selected.
- Use fixed templates and structured exercise metadata; do not require AI.

### Acceptance criteria

- [ ] Each recommendation can show a concise explanation.
- [ ] Explanations match the exercise metadata.
- [ ] The app does not invent medical or scientific claims.

---

# 9. User stories: executing and logging workouts

## US-012 — Start and complete a workout

**Priority:** P0.

**User story:** As a user, I want a workout player that guides me through the session while I exercise.

### Requirements

- Start workout.
- Pause or resume the session.
- Move to the next exercise.
- Skip an exercise.
- Replace an exercise with an allowed alternative.
- Finish early.
- Mark the workout complete.
- Show progress through the session.
- Provide a rest timer.
- Save changes as the session proceeds, not only at the very end.

### Acceptance criteria

- [ ] A session can be started and resumed.
- [ ] The user can skip or substitute an exercise.
- [ ] Completed sets are saved immediately or queued locally.
- [ ] Closing the app does not discard already saved logs.
- [ ] The user can finish a session early without corrupting the record.

## US-013 — Record actual sets

**Priority:** P0.

**User story:** As a user, I want to record what I actually did so that my training history is useful.

### Each set log should support

- Session ID.
- Exercise ID.
- Set number.
- Actual repetitions.
- Actual weight and unit, when applicable.
- Completion status.
- Optional effort rating.
- Timestamp.

### Requirements

- Keep planned values separate from actual values.
- Support bodyweight exercises.
- Support different weights for different sets.
- Allow correction of a mistaken entry.
- Validate numbers and units.
- Avoid requiring every optional field to be completed.

### Acceptance criteria

- [ ] The user can log different reps and loads for each set.
- [ ] Logs remain after app restart.
- [ ] Correcting a log updates the record.
- [ ] Planned targets remain available for comparison.
- [ ] Bodyweight exercises work without a weight value.

## US-014 — Replace an exercise

**Priority:** P0.

**User story:** As a user, I want to replace an exercise when equipment is occupied or unavailable.

### Requirements

- Offer alternatives from the local catalog.
- Prefer the same primary muscle group and a similar movement pattern.
- Respect available equipment and user exclusions.
- Update the active session while preserving the original planned exercise in the session history.
- Let the user cancel the replacement.

### Acceptance criteria

- [ ] Alternatives are relevant and available.
- [ ] A replacement cannot bypass a user exclusion.
- [ ] The actual exercise performed is recorded.
- [ ] The original plan remains auditable.

## US-015 — Save workout history

**Priority:** P0.

**User story:** As a user, I want every completed or partially completed session saved so I can review it later.

### Requirements

- Save start time, end time, status, plan version, planned exercises, and actual logs.
- Support completed, partially completed, abandoned, and in-progress sessions.
- Never overwrite historical results when generating a new plan.
- Allow the user to reopen a past session in read-only mode.
- Support basic filtering by date and exercise.

### Acceptance criteria

- [ ] History survives app restarts.
- [ ] Partial sessions are represented accurately.
- [ ] A new plan does not rewrite history.
- [ ] Historical set values match what the user logged.

---

# 10. User stories: local persistence and offline behavior

## US-016 — Use IndexedDB through Dexie

**Priority:** P0.

**User story:** As a user, I want my app to remember my information on my phone without needing an online database.

### Requirements

- Create a versioned local database.
- Store profiles, equipment, exercise data, weekly plans, scheduled sessions, workout sessions, set logs, and settings.
- Add schema migrations for future changes.
- Add database error handling.
- Provide a way to reset local data only after explicit user confirmation.
- Never store private workout data in static source files or GitHub.
- Avoid copying the same mutable record into multiple competing storage locations without a clear reason.

### Acceptance criteria

- [ ] Data persists after closing and reopening the PWA.
- [ ] Schema upgrades do not silently erase user data.
- [ ] Database failures produce a clear message.
- [ ] Resetting data requires confirmation.
- [ ] Tests verify saving, reading, updating, and migration behavior.

## US-017 — Cache the app for offline use

**Priority:** P0.

**User story:** As a user, I want to keep using my workout app when my connection is unavailable.

### Requirements

- Use a service worker to cache the app shell and required static assets.
- Bundle the base exercise catalog with the app.
- Ensure workout generation uses local data.
- Save set logs to IndexedDB while offline.
- Display an understandable offline indicator.
- Do not require a server request to complete an active session.
- Provide a safe update strategy for new app versions.
- Do not cache sensitive information in shared HTTP caches.
- Test on actual supported browsers, including iPhone Safari.

### Acceptance criteria

- [ ] After the app has been loaded and cached, the main screens open offline.
- [ ] The user can start and complete a workout offline.
- [ ] Set logs survive closing and reopening the app.
- [ ] The app clearly indicates offline status.
- [ ] Updating the app does not silently delete user data.

## US-018 — Cache generated plans safely

**Priority:** P0.

**User story:** As a user, I want a previously generated plan to load quickly and remain available offline.

### Requirements

- Store plans in the local database.
- Include the date, user configuration snapshot, and generator version.
- Reuse a cached plan only if its inputs are still valid.
- Regenerate future sessions when meaningful inputs change.
- Never regenerate completed sessions in place.
- Allow the user to explicitly regenerate an upcoming workout.

### Acceptance criteria

- [ ] An unchanged plan can be reopened without regeneration.
- [ ] Equipment changes invalidate affected future plans.
- [ ] A duration change can regenerate the current planned session.
- [ ] Completed sessions remain unchanged.
- [ ] The app records which generator version created a plan.

---

# 11. User stories: progression and rescheduling

## US-019 — Use previous performance to guide future workouts

**Priority:** P1, but design the data model for it in P0.

**User story:** As a user, I want future recommendations to consider my actual training history.

### Requirements

- Compare completed sets against planned targets.
- Use simple, documented progression rules.
- Increase a rep target or suggested load only when the previous performance supports it.
- Respect available equipment weight increments.
- Do not increase load automatically after poor performance or reported pain.
- Let the user override recommendations.
- Avoid suggesting a load that the user's equipment cannot provide.
- Avoid aggressive jumps in suggested weight.

### Acceptance criteria

- [ ] Recommendations can be traced to prior logged performance.
- [ ] The app explains a change in reps or weight.
- [ ] Users can accept or override a suggestion.
- [ ] Insufficient history produces a conservative starting recommendation.
- [ ] The same history and rules produce predictable recommendations.

## US-020 — Handle missed workouts and rest days

**Priority:** P1.

**User story:** As a user, I want the schedule to adapt when I miss a day.

### Requirements

- Allow the user to mark a day as skipped or rest.
- Offer a rescheduling suggestion.
- Consider muscle overlap and recent sessions.
- Do not automatically stack every missed workout into the next day.
- Preserve the original plan for historical reference.
- Let the user accept or reject the reschedule.

### Acceptance criteria

- [ ] Skipped sessions are recorded.
- [ ] Rescheduling does not change completed history.
- [ ] The app does not automatically force a user to make up every missed session.
- [ ] The user remains in control of the revised schedule.

## US-021 — Track recovery and soreness

**Priority:** P1.

**User story:** As a user, I want to report fatigue or soreness so the app can take that feedback into account.

### Requirements

- Make reporting optional.
- Use simple user-entered feedback.
- Treat feedback as a training-planning input, not a diagnosis.
- Offer a conservative adjustment or rest suggestion where appropriate.
- Do not claim to measure recovery accurately without supporting data.

### Acceptance criteria

- [ ] Feedback can be recorded and edited.
- [ ] The user can skip the question.
- [ ] The engine applies documented rules.
- [ ] The app does not make medical diagnoses.

---

# 12. User stories: calories and progress

## US-022 — Estimate calories burned

**Priority:** P1.

**User story:** As a user, I want an approximate calorie estimate for a workout.

### Requirements

- Use an established activity-energy estimation approach.
- Consider body weight, exercise category, duration, and intensity where supported.
- Use the best available information and explain uncertainty.
- Do not claim that equipment weight alone can accurately determine calories burned.
- Do not imply the estimate is as precise as a properly calibrated measurement.
- Clearly label the value as an estimate.
- If the data is insufficient, show a range or omit the estimate rather than inventing precision.

### Acceptance criteria

- [ ] Estimates are marked approximate.
- [ ] The calculation is documented and unit-tested.
- [ ] Changing body weight or duration affects the estimate as expected.
- [ ] The app does not display false precision.

## US-023 — Display progress

**Priority:** P1.

**User story:** As a user, I want to understand whether I am training consistently and progressing.

### Initial metrics

- Completed workouts per week.
- Workout history by date.
- Exercise performance over time.
- Personal records where definitions are clear.
- Sets per muscle group.
- Optional body-weight history.

### Requirements

- Use local data.
- Keep charts readable on phone screens.
- Include empty states for new users.
- Explain each metric.
- Do not claim that changes in these metrics guarantee muscle growth or health outcomes.

### Acceptance criteria

- [ ] New users see a useful empty state.
- [ ] Metrics match saved workout records.
- [ ] Charts update after a completed session.
- [ ] Historical data is not altered by chart calculations.

---

# 13. User stories: backup and restore

## US-024 — Export a local backup

**Priority:** P0.

**User story:** As a user, I want to export my profile and workout history so I can keep a backup or move to another phone.

### Requirements

- Export selected local data to a versioned JSON file.
- Include a format version and export timestamp.
- Include only data needed to restore the user's app.
- Exclude code, secrets, and unnecessary sensitive data.
- Tell the user that the backup may contain private health and workout information.
- Use the browser's download or share mechanism where supported.
- Handle cancellation and errors gracefully.

### Acceptance criteria

- [ ] A valid backup can be exported.
- [ ] The file includes a format version.
- [ ] Export failure does not delete local data.
- [ ] The user is told to store the file privately.

## US-025 — Import and validate a backup

**Priority:** P0.

**User story:** As a user, I want to restore my data from a backup.

### Requirements

- Validate file type, schema version, record IDs, units, and required fields.
- Reject malformed input safely.
- Preview the backup before importing.
- Define whether import merges or replaces data.
- Make the choice explicit to the user.
- Use a database transaction or an equivalent safe strategy so a failed import does not leave half-imported data.
- Never execute code from the backup file.

### Acceptance criteria

- [ ] A valid backup can be restored.
- [ ] An invalid backup is rejected with a clear error.
- [ ] Import behavior is explained before confirmation.
- [ ] A failed import does not corrupt existing data.
- [ ] Export followed by import reproduces the expected records.

---

# 14. User stories: installation and deployment

## US-026 — Deploy the static PWA to GitHub Pages

**Priority:** P0.

**User story:** As the owner, I want a link I can open on my phone and share with friends without paying for a server.

### Requirements

- Store application source code in a GitHub repository.
- Add a GitHub Actions workflow to install dependencies, run checks, build the app, and deploy the static output.
- Configure Vite's base path for the repository's GitHub Pages URL.
- Do not assume the app is served from the domain root.
- Ensure the PWA manifest, icons, service worker, and asset paths work under the deployment subpath.
- Never put secrets or user data in the repository.
- Keep build output separate from personal workout data.
- Document repository and Pages settings.

### Acceptance criteria

- [ ] A clean checkout can install dependencies.
- [ ] Tests and production build run through the workflow.
- [ ] Deployment succeeds on the configured branch or workflow.
- [ ] The hosted site loads without missing JavaScript, CSS, manifest, or icons.
- [ ] The app works under the repository subpath.
- [ ] The site uses HTTPS.
- [ ] The README contains the deployed URL once known; do not invent a URL.

## US-027 — Install the PWA on iPhone and Android

**Priority:** P0.

**User story:** As the owner or a friend, I want to add the workout app to my phone's Home Screen without an App Store listing.

### Requirements

- Include a valid web app manifest.
- Include appropriate app icons.
- Use a service worker for app-shell caching.
- Ensure the app works when launched from the Home Screen.
- Document the iPhone Safari installation steps.
- Document Android installation steps, noting browser differences.
- Test the actual installation flow; do not assume that a desktop preview proves mobile installation works.

### iPhone instructions to document

1. Open the deployed HTTPS URL in Safari.
2. Tap the Share button.
3. Choose “Add to Home Screen” (wording may differ by iOS version).
4. Confirm the app name and add it.
5. Launch it from the new Home Screen icon.
6. Complete a workout and verify that the data persists.
7. Turn off network access and test the cached app after the initial offline setup.

### Acceptance criteria

- [ ] The PWA can be added to the Home Screen on a supported iPhone.
- [ ] It opens in a suitable app-like presentation where supported.
- [ ] App assets load correctly.
- [ ] A workout can be completed and saved.
- [ ] Offline behavior is verified on an actual device.
- [ ] Friends can install the same public build using the shared URL.

## US-028 — Support safe application updates

**Priority:** P1.

**User story:** As a user, I want new app versions without losing my local workout history.

### Requirements

- Version the application and database schema.
- Use safe service-worker update behavior.
- Do not silently delete local data during an update.
- Inform users when a reload is required, where practical.
- Test a schema migration with a database containing old-version records.

### Acceptance criteria

- [ ] Updating the app preserves user data.
- [ ] Database migrations run in the correct order.
- [ ] Failed migrations do not silently erase the database.
- [ ] The user receives a clear error if recovery is needed.

---

# 15. Detailed data model

The coding agent should define TypeScript types and Dexie tables for the following entities. The exact implementation may vary, but the meaning and relationships must remain clear.

## 15.1 Profile

Suggested fields:

- `id`: stable local user ID.
- `displayName`: optional nickname.
- `age`: optional or required according to onboarding decisions.
- `heightValue` and `heightUnit`.
- `weightValue` and `weightUnit`.
- `goal`.
- `experienceLevel`.
- `preferredTrainingDays`.
- `preferredDurationMinutes`.
- `preferredLocation`.
- `createdAt`.
- `updatedAt`.

Avoid storing fields that are not needed. If more than one person may use the same browser profile, provide a clear local profile-selection mechanism or document that each person should use their own browser/app storage.

## 15.2 Exercise

Suggested fields:

- `id`.
- `name`.
- `description`.
- `primaryMuscles`.
- `secondaryMuscles`.
- `movementPattern`.
- `equipmentIds`.
- `exerciseType`.
- `difficulty`.
- `defaultRepRange`.
- `defaultRestSeconds`.
- `alternativeExerciseIds`.
- `restrictionTags`.
- `catalogVersion`.

## 15.3 Equipment

Suggested fields:

- `id`.
- `name`.
- `equipmentType`.
- `availableWeights`.
- `weightUnit`.
- `quantity`.
- `isAvailable`.
- `locationType`.

## 15.4 Weekly plan

Suggested fields:

- `id`.
- `profileId`.
- `startDate`.
- `trainingDays`.
- `schedule`.
- `planVersion`.
- `createdAt`.
- `updatedAt`.

## 15.5 Scheduled workout

Suggested fields:

- `id`.
- `planId`.
- `scheduledDate`.
- `targetMuscleGroups`.
- `availableMinutes`.
- `status`.
- `generatorVersion`.
- `configurationSnapshot`.
- `createdAt`.
- `updatedAt`.

## 15.6 Workout session

Suggested fields:

- `id`.
- `scheduledWorkoutId`, when applicable.
- `startedAt`.
- `finishedAt`.
- `status`.
- `plannedExercises`.
- `actualExercises`.
- `planVersion`.
- `generatorVersion`.

## 15.7 Set log

Suggested fields:

- `id`.
- `sessionId`.
- `exerciseId`.
- `setNumber`.
- `plannedReps`.
- `actualReps`.
- `plannedWeight`.
- `actualWeight`.
- `weightUnit`.
- `completed`.
- `effortRating`, optional.
- `createdAt`.
- `updatedAt`.

## 15.8 Database implementation rules

- Use stable IDs, preferably UUIDs.
- Define relationships and indexes explicitly.
- Store timestamps in a consistent format.
- Use schema migrations.
- Never assume a record exists just because the UI displayed it previously.
- Validate imported data and user input.
- Preserve completed workout history.
- Keep generated plans separate from actual workout results.
- Add tests for creating, reading, updating, deleting, and migrating records.
- Document any differences between this suggested schema and the final implementation.

---

# 16. Workout engine: detailed rules

The workout engine must be deterministic and testable. It must not need a network connection.

## 16.1 Inputs

The engine receives:

- Profile and goal.
- Experience level.
- Weekly schedule.
- Today's date and planned muscle groups.
- Available session duration.
- Available equipment.
- Excluded movements.
- Exercise catalog.
- Recent completed sessions.
- Prior performance for relevant exercises.
- Generator version.

## 16.2 Generation sequence

1. Validate all inputs.
2. Identify today's scheduled training focus.
3. If today is a rest day, return a rest-day result unless the user explicitly requests another appropriate activity.
4. Filter out exercises with unavailable equipment.
5. Filter out excluded exercises.
6. Remove exercises with missing critical metadata.
7. Consider recent training and overlapping muscle groups.
8. Rank eligible exercises by target coverage, movement balance, suitability, preference, and progression needs.
9. Assign set counts and rep targets based on documented goal-specific rules.
10. Recommend loads only when there is sufficient information.
11. Estimate time from set duration, rest periods, and transitions.
12. Adjust the session if it exceeds the user's available time.
13. Validate muscle coverage and duration again.
14. Return a structured result with the workout or a clear explanation for why generation failed.
15. Save the generated plan as a versioned record.

## 16.3 Deterministic behavior

- Given the same validated inputs, catalog version, history, and generator version, the engine should return the same result.
- If controlled variety is introduced later, use a saved seed so a generated session can be reproduced.
- Do not use random exercise selection without constraints.
- Do not call an external AI model.
- Keep the engine separate from React components and IndexedDB operations.

## 16.4 Time estimation

The session estimate should account for:

- Approximate time to perform each set.
- Rest between sets.
- Time to change exercises or equipment.
- Optional warm-up time if included.
- Any additional transitions.

The engine must state assumptions. It should not claim exact timing because actual pace varies.

## 16.5 Suggested starting loads

- Use prior successfully completed sessions when available.
- Respect available weights and increments.
- If no history exists, offer a conservative starting suggestion or ask the user to choose.
- Do not invent an exact safe load from height and weight alone.
- Let the user adjust the recommendation.
- Store planned and actual loads separately.

---

# 17. User interface details

## Home screen

Show:

- Greeting or profile nickname.
- Today's date.
- Today's training focus or rest day.
- Target muscle groups.
- Time selection.
- “Generate Workout” or “View Workout” action.
- A brief view of recent progress.

## Weekly Plan screen

Show seven days or the configured training week.

Each day should show:

- Training focus.
- Target muscle groups.
- Rest status.
- Whether the workout is planned, completed, or skipped.

Allow a user to inspect future sessions. Do not let a future plan overwrite history.

## Workout screen

Show:

- Session name and estimated duration.
- Exercise list.
- Sets and rep targets.
- Suggested load, if known.
- Rest timer.
- Instructions.
- Set logging controls.
- Replace, skip, pause, and finish actions.
- Progress through the session.

Keep the interface easy to use with one hand. Avoid requiring precise tiny taps.

## Progress screen

Initially show a helpful empty state. Later show:

- Workout calendar/history.
- Completed sessions per week.
- Exercise trends.
- Personal records.
- Muscle-group training volume.
- Optional body-weight history.

Every displayed metric must be calculated from saved records, not mock numbers.

## Settings screen

Show:

- Profile.
- Goals.
- Units.
- Home/gym selection.
- Equipment.
- Exercise exclusions.
- Weekly schedule.
- Backup and restore.
- Local data reset with confirmation.
- App version and privacy explanation.

---

# 18. Testing strategy

The coding agent must create automated tests as features are added.

## 18.1 Unit tests

Test:

- Input validation.
- Unit conversions.
- Exercise filtering.
- Equipment constraints.
- Muscle-group coverage.
- Duration estimation.
- Workout generation.
- Progression rules.
- Calorie-estimation calculation.
- Backup serialization and validation.

## 18.2 Database tests

Test:

- Create a profile.
- Update a profile.
- Save equipment.
- Save a weekly plan.
- Save a scheduled workout.
- Record a set.
- Reopen and retrieve records.
- Run schema migrations.
- Import and export data.
- Ensure a failed import does not corrupt existing data.

## 18.3 UI tests

Test:

- Navigation.
- Onboarding validation.
- Selecting home or gym.
- Changing available workout duration.
- Starting a session.
- Logging a set.
- Replacing an exercise.
- Finishing a workout.
- Viewing history.
- Exporting and importing a backup.

## 18.4 Manual phone tests

On the owner's iPhone, verify:

- The PWA can be installed through Safari.
- Home Screen launch works.
- Buttons and forms fit the screen.
- The workout player remains usable during exercise.
- Data survives an app restart.
- The app works offline after initial caching.
- A backup can be saved and restored.
- Updating the PWA does not erase data.

Repeat the important installation and persistence tests on at least one friend's phone. Different devices and browsers can behave differently.

---

# 19. Definition of done

A user story is not finished simply because code was written.

A story is done only when:

1. Its requirements are implemented.
2. Its acceptance criteria are checked.
3. Relevant automated tests pass.
4. TypeScript and production builds pass.
5. The user interface has no obvious broken states.
6. Data persists as specified.
7. The README or other documentation is updated.
8. Known limitations are reported.
9. The coding agent reports the actual commands and results.

For phone-specific features, automated tests alone are not sufficient. Mark manual testing separately.

---

# 20. Recommended implementation order

Do not build everything at once. Follow this order.

## Phase 1 — Foundation

1. Create the React + TypeScript + Vite project.
2. Add formatting, linting, and tests.
3. Build the five-screen app shell.
4. Create the README.
5. Add GitHub Pages deployment.
6. Confirm the hosted shell loads on the phone.

**Milestone:** A real, installable app shell is available through HTTPS.

## Phase 2 — Local data

1. Add Dexie and IndexedDB.
2. Define database types and versioned schema.
3. Seed a small exercise catalog.
4. Build profile and equipment forms.
5. Add persistence tests.
6. Add backup and restore early enough to protect data during development.

**Milestone:** Profile and equipment data persist locally without any server.

## Phase 3 — Weekly and daily workouts

1. Implement weekly split generation.
2. Implement equipment and exclusion filtering.
3. Implement duration-aware selection.
4. Implement time estimation.
5. Add engine unit tests.
6. Display the generated workout in the UI.

**Milestone:** A user can generate a useful workout offline.

## Phase 4 — Workout execution

1. Build the workout player.
2. Add set logging.
3. Add rest timer.
4. Add exercise replacement and skipping.
5. Save sessions and logs.
6. Verify restart persistence.

**Milestone:** The app can be used to complete and record a real session.

## Phase 5 — History and progression

1. Add exercise history.
2. Add simple, documented progression rules.
3. Add rescheduling.
4. Add progress metrics.
5. Add approximate calorie estimation.
6. Test all calculations.

**Milestone:** Future workouts respond to previous training.

## Phase 6 — Offline and friend distribution

1. Complete service-worker caching.
2. Test offline session completion.
3. Verify PWA installation on iPhone and Android.
4. Verify GitHub Pages updates.
5. Test backup and restore on another phone.
6. Ask friends to test and report issues.

**Milestone:** The owner and friends can install and use the app without paid hosting or App Store publication.

---

# 21. First task for the coding agent

Do this first and nothing beyond it until the foundation is verified.

## Task: Build the application shell and deployment workflow

**Prompt to execute:**

You are implementing Phase 1 of the Fit Workout project. Read the complete project specification before changing code.

### Constraints

- React + TypeScript + Vite.
- No backend server.
- No cloud database.
- No paid APIs.
- No authentication service.
- No AI API calls.
- No personal data in GitHub.
- Static deployment through GitHub Pages.
- PWA installation support is planned, but do not claim offline functionality until it is implemented and tested.

### Implement

1. Create the application shell with Home, Weekly Plan, Workout, Progress, and Settings.
2. Add a simple responsive theme and reusable UI components.
3. Use temporary, clearly labeled mock data.
4. Add functional navigation.
5. Add ESLint, TypeScript checking, and Vitest.
6. Add a GitHub Actions workflow for build and deployment.
7. Configure Vite so the app works from a GitHub Pages repository subpath.
8. Add a beginner-friendly README.
9. Add tests for navigation and the basic app shell.

### Do not implement yet

- Workout-generation algorithms.
- Real database persistence.
- Authentication.
- Cloud sync.
- AI coaching.
- Calorie estimation.
- Progress calculations.

### Before finishing

- Run the lint command.
- Run TypeScript checks.
- Run the tests.
- Run the production build.
- Fix any failures introduced by your changes.
- Report exact results.
- List the GitHub settings the owner must configure.
- Identify anything that requires manual verification on a real iPhone.

Do not fabricate a deployed URL. If deployment has not actually run, state that clearly.

---

# 22. Final product rules

Keep these rules visible to the coding agent throughout development:

1. **Zero paid dependencies:** never add a service that requires payment to keep the app's core workout features working.
2. **Local-first:** personal profiles, workout plans, and logs belong on the user's device.
3. **No automatic sync in version 1:** manual export/import is the defined transfer mechanism.
4. **Offline by design:** workout generation must not depend on network access.
5. **Predictable workouts:** use documented deterministic rules.
6. **Respect equipment:** never recommend a movement requiring equipment the user has not marked available.
7. **Respect exclusions:** never bypass user-defined exercise exclusions.
8. **Preserve history:** generated plans must not overwrite completed workouts.
9. **Transparent estimates:** time, weight, and calorie estimates must not pretend to be exact.
10. **Protect user data:** never commit private user data to GitHub.
11. **Test before claiming:** report actual test and deployment results.
12. **Build incrementally:** one small, testable feature at a time.
13. **Keep the interface simple:** the user should be able to start today's workout quickly.
14. **No fake completeness:** unfinished or untested features must be identified honestly.

**Success means:** the owner can open the app on an iPhone, create a profile, choose home or gym equipment, see a balanced weekly plan, generate a time-appropriate workout, record actual sets and weights, close and reopen the app without losing data, and share the install link with friends—all without a paid server or App Store listing.
