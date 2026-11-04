import { useSyncExternalStore } from 'react'
import { HI } from './hi'
import { TE } from './te'

/**
 * Language support: English, Hindi and Telugu.
 * Text is looked up by its English wording. A phrase with no translation yet is shown in English, so nothing is ever blank.
 * The choice is saved on this device only.
 */
export type Lang = 'en' | 'hi' | 'te'
export const LANGS: { id: Lang; label: string; native: string }[] = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { id: 'te', label: 'Telugu', native: 'తెలుగు' },
]

const KEY = 'lift.lang'
const listeners = new Set<() => void>()
const read = (): Lang => {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'hi' || v === 'te' ? v : 'en'
  } catch { return 'en' }
}
let current: Lang = read()
export const getLang = (): Lang => current
export function setLang(l: Lang) {
  current = l
  try { localStorage.setItem(KEY, l) } catch { /* lasts until reload */ }
  try { document.documentElement.lang = l } catch { /* no document */ }
  listeners.forEach((f) => f())
}
export const useLang = (): Lang => useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => current, () => 'en' as Lang)

const TABLES: Record<Lang, Record<string, string>> = { en: {}, hi: HI, te: TE }

/** Translate one phrase. Unknown phrases come back unchanged. */
export function tr(text: string, lang: Lang = current): string {
  if (lang === 'en') return text
  return TABLES[lang][text] ?? text
}

export function useT(): (text: string) => string {
  const lang = useLang()
  return (text: string) => tr(text, lang)
}

/** True when a translation exists for this phrase in this language. */
export const hasTranslation = (text: string, lang: Lang): boolean => lang === 'en' || text in TABLES[lang]
