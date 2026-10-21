# Phase B audit

Source: `fit_workout_phase_b_user_stories.md`. Branch `feature/v2-complete`. Date 2026-10-21.

## Bugs found and fixed

| Area | Symptom | Root cause | Fix | Test |
|---|---|---|---|---|
| Equipment (US-034) | Bodyweight appeared greyed out and could not be changed | The checkbox was locked and the id was always added to the available list | Bodyweight is a normal toggle: on by default, off only when excluded | `App.test.tsx` equipment tests, `engine.test.ts` |
| Equipment (US-035) | Planet Fitness list did not update after changing gym type | Defaults were applied only at onboarding | `setLocation` now calls `applyDefaultEquipment`; PF stored as `preset` + `excluded` | equipment tests |
| Equipment editor | "Loading..." forever for a location with no saved record | `useLiveQuery` returns `undefined` for both loading and missing | Switched to `useQuery` | equipment tests |
| Dialogs | Typing in a dialog input lost focus after every key | Focus effect depended on `onClose` | Focus once on mount, `closeRef` for the callback | reset-phrase UI test |
| Workouts | Risk of a duplicate session when starting a saved day | `startSession` created a new row | It reopens the saved session | db tests |
| Units | Weight fields had no kg/lb choice; heights were free text | Unit only lived in profile | `WeightField`, `HeightField`, canonical kg / cm storage, page default + per-field override | unit tests, `App.test.tsx` |
| Navigation | No Back control; refresh lost the page | State-based screens | Hash router, in-app Back, unsaved-changes guard | router + UI tests |
| Food save | "Leave without saving?" appeared after saving an entry | Dirty flag still set during the redirect | Clear the flag before redirecting | food UI test |

## Schema migrations

`v3` adds `yogaSessions`, `yogaPlans`, `foodLog`, `foodCache`. `upgradeProfileV2` converts height to cm, weight to kg and experience to training level. Covered by a v2 fixture test. Backup v1 files still import and are normalised.

## Regression checklist (manual, on a real iPhone)

- [ ] Fresh install: onboarding, all three levels, beginner asks for height and weight.
- [ ] Planet Fitness: bodyweight toggles; exclusions persist; changing gym type refreshes the list.
- [ ] Start a workout, use the rest timer (pause, +15s, skip), lock the phone, return.
- [ ] Finish from the top and bottom buttons. Reopen a completed workout, edit a set, save.
- [ ] Reset a day: all three confirmations are separate and cancelling at any step keeps data.
- [ ] Yoga: each style plans; props change the poses; history and chart appear.
- [ ] Food: add raw and cooked rice and compare calories; edit, duplicate, delete.
- [ ] Progress: ranges, filters, export CSV / JSON / PNG.
- [ ] Back button from every screen; refresh keeps the page.
- [ ] Offline: airplane mode, everything except online food search still works.
- [ ] Backup, wipe, restore.

## Not verified here

Real-browser and real-iPhone behaviour, the live Open Food Facts API, and the GitHub Pages blank-page cause (github.io is not reachable from the build sandbox).
