import { fromDateKey, toDateKey } from './dates'

/** Whole years between a birth date (YYYY-MM-DD) and a day. */
export function ageFromBirthDate(birthDate: string, now: Date = new Date()): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return undefined
  const b = fromDateKey(birthDate)
  if (Number.isNaN(b.getTime()) || toDateKey(b) !== birthDate) return undefined
  let age = now.getFullYear() - b.getFullYear()
  const beforeBirthday = now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())
  if (beforeBirthday) age -= 1
  return age
}

export const MIN_AGE = 13
export const MAX_AGE = 100

/** Plain-language problem with a birth date, or '' when it is fine. */
export function birthDateError(birthDate: string, now: Date = new Date()): string {
  if (birthDate.trim() === '') return 'Enter your date of birth.'
  const age = ageFromBirthDate(birthDate, now)
  if (age === undefined) return 'Enter a real date of birth.'
  if (age < 0) return 'That date is in the future.'
  if (age < MIN_AGE) return `Lift is for people ${MIN_AGE} and over.`
  if (age > MAX_AGE) return 'Check the year. Lift accepts ages up to 100.'
  return ''
}
