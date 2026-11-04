/** Light-hearted lines for the Body Story. Never about weight or looks, and never guilt. The same story always gets the same line. */
import type { Story } from './bodyStory'

const QUIET = [
  'Rest-day streak: legendary. Your couch sends its regards.',
  'A quiet one. Even phones need a recharge. Plan one small workout and call it a comeback.',
  'Zero workouts logged. Your muscles are 100% rested and slightly suspicious.',
  'The weights missed you. They did not say anything, but they were thinking it.',
]
const LIGHT = [
  'You showed up. That is the hardest rep of all.',
  'Not bad at all. Your future self just gave you a thumbs up.',
  'Slow and steady. The tortoise approves, the hare is already tired.',
  'A little is a lot more than nothing. Math is on your side.',
]
const SOLID = [
  'Consistent like a Monday alarm, but way more fun.',
  'Your gym shoes have filed for a promotion.',
  'You are basically a regular now. The dumbbells know your name.',
  'Solid work. Your muscles are writing you a thank-you note (it is a bit sore).',
]
const BEAST = [
  'Okay Hercules, leave some weights for the rest of us.',
  'Seven days of effort and zero excuses. Please also sleep.',
  'Your protein shaker is out of breath.',
  'That is a lot of sets. Your muscles want a word with HR.',
]
const PR = [
  'New personal best! The weights are filing a complaint.',
  'A new record. Somewhere a barbell is quietly crying.',
]
const DRINK = [
  'Have a drink. Water, we mean. 💧',
  'Reminder: a glass of water is a free upgrade. 🥤',
  'You earned a drink. Coconut water counts, and it feels fancy. 🥥',
  'Hydration check: sip something, then stretch. 💧',
  'Tea break? Chai is allowed. Just not the whole pot. ☕',
]

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
const pick = <T,>(xs: T[], seed: number) => xs[seed % xs.length]

export function funLine(s: Story): { emoji: string; line: string; drink: string } {
  const seed = hash(s.id)
  const active = s.workouts + s.yogaSessions + s.healthWorkouts
  const pr = s.lifts.some((l) => l.pr)
  let emoji = '😴', pool = QUIET
  if (pr) { emoji = '🏆'; pool = PR }
  else if (active >= 5) { emoji = '🔥'; pool = BEAST }
  else if (active >= 3) { emoji = '💪'; pool = SOLID }
  else if (active >= 1) { emoji = '🙂'; pool = LIGHT }
  return { emoji, line: pick(pool, seed), drink: pick(DRINK, seed >> 3) }
}
