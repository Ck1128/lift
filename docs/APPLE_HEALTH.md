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

## Setting up the two shortcuts (about 10 minutes, once)

Open the Shortcuts app on the iPhone. Names must match Settings > Apple Health (or change them there). Apple renames actions between iOS versions: pick the closest one. Neither shortcut has been run on a real iPhone by the developer.

### A. "Health to Lift" (reads Health): five actions
1. Tap +, name it **Health to Lift**.
2. **Find Health Samples**: Type is Body Mass; Start Date is in the last 90 days.
3. **Repeat with Each** over the samples. Inside, one **Text** action: `B|` Repeat Item **Start Date** `|` Repeat Item **Value** `|` Repeat Item **Unit**.
4. After the loop: **Combine Text** on **Repeat Results**, joined with New Lines.
5. **Copy to Clipboard**. Run it once and allow Health access.

No date formatting is needed. Lift reads "Oct 21, 2026 at 7:30 AM", "32 min", "310 kcal" and "172.4 lb" as the iPhone writes them. For workouts add a second Find Health Samples (Workouts) and Repeat with Each before the Combine Text, with the text `K|` Start Date `|` Workout Type `|` Duration `|` Active Energy.

### B. "Lift to Health" (writes to Health)
1. Tap +, name it **Lift to Health**.
2. **Split Text**: Shortcut Input, separator New Lines.
3. **Repeat with Each** (Split Text). Inside:
   - **Split Text**: Repeat Item, separator Custom, a vertical bar `|`.
   - Five times, **Get Item from List** (item 1 to 5), each followed by **Set Variable**: `kind`, `when`, `what`, `amount`, `extra`.
   - **Get Dates from Input** on `when`.
   - **If** `kind` is K: **If** `what` is Yoga: **Log Workout** (Yoga, Duration `amount` minutes, Start Date from `when`). **Otherwise**: **Log Workout** (Traditional Strength Training, same fields). Add Calories from `extra` if present.
   - **If** `kind` is B: **Log Health Sample**: Body Mass, value `amount`, unit `extra`, date from `when`.
   - **If** `kind` is F: **Log Health Sample**: Dietary Energy, value `amount`, date from `when`.
4. Run it once from Lift (Settings > Apple Health > Send) and allow the Health permissions.
5. If Log Workout has no start date, workouts are logged at the time of sending, so send right after training.
