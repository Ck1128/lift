/** The phrase typed in step 2 of "Delete all data on this device". Exact, in capitals. */
export const DELETE_PHRASE = 'DELETE MY DATA'

export const deletePhraseOk = (typed: string): boolean => typed.trim() === DELETE_PHRASE

export interface MathChallenge {
  question: string
  answer: number
}

/**
 * A fresh arithmetic question for step 3. It slows a hurried tap down; it is not a security check.
 * `rng` returns a number in [0, 1). It is a parameter so tests can pin it.
 */
export function makeMathChallenge(rng: () => number = Math.random): MathChallenge {
  const int = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1))
  const kind = int(0, 2)
  if (kind === 0) {
    const a = int(12, 49)
    const b = int(12, 49)
    return { question: `What is ${a} + ${b}?`, answer: a + b }
  }
  if (kind === 1) {
    const a = int(40, 99)
    const b = int(11, 39)
    return { question: `What is ${a} - ${b}?`, answer: a - b }
  }
  const a = int(3, 9)
  const b = int(3, 9)
  return { question: `What is ${a} × ${b}?`, answer: a * b }
}

export const mathAnswerOk = (typed: string, c: MathChallenge): boolean => /^\s*-?\d+\s*$/.test(typed) && Number(typed) === c.answer
