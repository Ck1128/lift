# Design review and plan (v2.6.0)

Written before the changes, from screenshots of every main flow on a 390 px phone, light and dark.

## How a first-time customer feels today

| Moment | What they see | What they feel |
| --- | --- | --- |
| Open the app | A 4,400 px form with 14 questions, native grey radio buttons and a raw "Choose File" box | Homework. "Is this worth it?" |
| First Home screen | Four same-size white cards, a small grey "F" button on every one, a "Yoga is turned off" card | Busy. Nothing is clearly the main thing. A nag about a feature they chose to skip |
| First load | A solid full-width coloured bar saying "Ready to use offline" | A system message, not a product |
| Workout preview | Five pink note boxes before the first exercise | Warnings before help |
| In a workout | Four pill buttons that wrap onto two lines under every exercise | Cluttered when hands are busy and tired |
| Settings | Eleven identical floating cards | A list of chores |
| Empty screens | Grey text in a card | Unfinished |

What delights already: the type pair, the colour of each tab, the glass nav bar, the calm wording.

## What millions of people expect

They have used iOS every day. They expect: one question at a time, big clear targets, controls that look and move like iOS (round radio, check boxes, grouped lists), quiet status messages that go away, the one main action obvious, and nothing that looks unfinished. They judge quality in the first 30 seconds and in the first empty screen.

## Plan, in order of customer impact

1. **First run becomes a short guided flow.** One topic per screen, a progress bar, Back and Next, and a summary of why each question is asked. Settings keeps the single page form.
2. **Controls look finished.** Round radios, real check boxes, a styled file picker, consistent focus rings.
3. **Quiet chrome.** The feedback button becomes a small, low-contrast mark on each card. The offline message becomes a small toast that leaves by itself.
4. **Home has one hero.** A switched-off feature becomes one quiet line, not a card.
5. **Workout preview leads with the workout.** The summary comes first, the long notes sit under a single "Why this workout" line.
6. **Player is easier with a tired thumb.** Set actions become one tidy row. The check button gets a small pop when a set is done.
7. **Settings as an inset grouped list.** One rounded group with thin dividers and a coloured icon per row.
8. **Empty states invite.** A tab-coloured icon, a clear title, one action.
9. **Quality floor.** Visible keyboard focus, reduced motion respected, 44 px targets, light and dark checked.

Out of scope on purpose: new features, new data, outside services. The app stays free and private.

## Checks
Type check, lint, all tests, build, and screenshots of each changed screen in light and dark.
