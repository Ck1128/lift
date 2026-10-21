// Local calendar dates as YYYY-MM-DD strings. Weekday index 0 = Monday ... 6 = Sunday.
export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + n)
  return toDateKey(d)
}

export function weekdayIndex(key: string): number {
  return (fromDateKey(key).getDay() + 6) % 7
}

export function startOfWeek(key: string): string {
  return addDays(key, -weekdayIndex(key))
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromDateKey(b).getTime() - fromDateKey(a).getTime()) / 86_400_000)
}

export function formatDay(key: string): string {
  return fromDateKey(key).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
