# Today's Call, Machine Taken and Body Story (v2.8.0)

All of this runs on the phone from the person's own log. No server, no account, no new database tables.

## Today's Call
- Two modes, saved in settings key `call.mode`: **Lift decides** (default) and **I'll choose**.
- Lift decides (`src/engine/todaysCall.ts`): per muscle group readiness comes from the recovery model plus reported soreness (very sore counts as not ready).
  1. The plan's own workout, if its muscles are recovered (average 80% or more, none under 50%).
  2. Otherwise the recovered template (upper, lower, push, pull, legs, full) whose muscles were trained longest ago.
  3. Otherwise a lighter session if one group is nearly there, else a recovery day with a yin yoga pairing (or plain rest when yoga is off).
  4. With nothing logged yet it follows the plan.
- I'll choose: pick a focus. Lift says how ready those muscles are and designs the workout. It never refuses; tired muscles get trimmed sets.
- A changed day rewrites today's planned row (`applyCallToToday`) so Home, Workout and history agree.

## Yoga pairing
- `src/engine/yogaMuscles.ts` lists the muscles each pose stretches. A pairing sets the Yoga screen's style, length and `focus`; `generateYoga` then prefers poses that stretch those muscles. With no focus the plan is unchanged.

## Machine taken
- `machineTakenSwap` in `src/engine/variants.ts`: same muscle, same movement first, different equipment, gym-friendly order. Remembered per exercise (`swap.pref`), never returns to a busy one in the same workout.

## Body Story
- Weekly (Monday to Sunday) and monthly. A finished story is saved when the app is opened on or after the last day (`ensureStories`), so a missed Sunday is caught up. A "so far" view is always available.
- Saved in settings as `story.<kind>:<end date>`, so backups and Delete all data cover it.
- Sharing is plain text through the share sheet. Body weight is included unless the switch is turned off.
- Apps on iPhone cannot send a notification at a set time without a server, so "auto" means "ready the next time Lift opens".

## Weekly weigh-in
- Due from Monday until the week has a weight; "Not now" hides it for that day only; never on the day the app was set up.

## Express circuit (v2.9.0)
- Optional. `DayPlan.circuit` / `ScheduledWorkout.circuit`; built in `generateWorkout`: one exercise per target area (machines, dumbbells, cables and bodyweight first), 3 rounds, 30 s between exercises, about a minute between rounds, 5 minute warm-up. Estimated 28 minutes at most. Very sore areas are skipped.

## Sex and injuries in recovery (v2.9.0)
- `recoveryFactor` takes `sex` (female x0.95, small and bounded) and `injuredMuscles` (those muscle groups x1.5 through `perMuscle`). Injured areas also count as at least moderately sore for set counts and for Today's Call. Rules of thumb, not medical advice.

## Home layout (v2.10.0)
- One workout card (`TodaysCall`): focus and reasons, time picker, main button, then two quiet pills: "I'll choose" and "Express circuit · 30 min". "I'll choose" switches the card to a chooser (saved in `call.mode`) with "Let Lift decide" to switch back.
- Date of birth (`Profile.birthDate`) is the stored value. `getProfile` derives `age` from it, so nothing stale is ever saved.
