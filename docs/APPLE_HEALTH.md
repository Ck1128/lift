# Apple Health (two ways, free, no server)

A web app on the Home Screen cannot call HealthKit. Only a native app signed by a paid Apple developer account can. Lift therefore uses two free routes that already exist on the iPhone.

## Reading from Health into Lift
1. **Export file (works without setup).** Health app > your picture > Export All Health Data. Choose `export.zip` in Settings > Apple Health. It is read on the phone as a stream (large files are fine), and only body weight and workouts are kept.
2. **Shortcut (for regular updates).** A shortcut named "Health to Lift" copies lines of text. Lift reads them from the clipboard.

Imported body weights go into the normal weight history and charts. Imported workouts (Apple Watch and other apps) appear in Progress > History as "Apple Health". They never count as Lift workouts and never change recovery or plans.

## Writing from Lift into Health
Lift opens a shortcut named "Lift to Health" and hands it lines of text (`shortcuts://run-shortcut`). The shortcut logs workouts, yoga, body weight and, if you choose, daily food calories.
- Calorie estimates are **off by default**: they are rough, and Health would treat them as measured.
- "Sent" means "handed to the shortcut". Lift cannot see if Health accepted it. "Forget what was sent" allows a resend.

## Not duplicating
- A Health workout that overlaps a session logged in Lift is skipped.
- A weight Lift already has (same day, same number) is skipped, so a weight Lift sent to Health does not come back.
- Importing the same data twice adds nothing.

## Line format (both directions)
```
B|2026-10-21T07:30|172.4|lb          body weight
K|2026-10-21T18:05|Strength|42|180   workout: start, type, minutes, calories (optional)
F|2026-10-21|1850                    one day of food calories
```

## What is verified, and what is not
- The reader, the merge rules and the line format are covered by automated tests (`src/engine/health.test.ts`, one end to end test in `App.test.tsx`).
- The two shortcuts have **not** been run on a real iPhone by the developer. Apple renames Shortcuts actions between iOS versions, so the setup steps in the app say "pick the closest action". The export.zip route does not depend on them.

## Not included
Steps, heart rate, sleep and other Health data types are not read. A native companion app (paid developer account) would be the way to get live access.
