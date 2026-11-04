/**
 * The words a person types to confirm resetting one day.
 * Today's workout uses a fixed sentence. Any other date names the date, so a reset of the wrong day is hard to do by accident.
 */
export function resetPhrase(date: string, today: string): string {
  return date === today ? "RESET TODAY'S WORKOUT" : `RESET ${date}`
}

const norm = (s: string) => s.replace(/[‘’ʼ]/g, "'").replace(/\s+/g, ' ').trim().toUpperCase()

/** Case-insensitive, ignores extra spaces, and accepts the curly apostrophe an iPhone keyboard types. */
export function phraseMatches(input: string, phrase: string): boolean {
  return norm(input) === norm(phrase)
}
