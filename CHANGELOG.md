# Changelog

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
