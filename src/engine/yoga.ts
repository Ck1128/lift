import {
  POSES, STYLES, YOGA_CATALOG_VERSION, poseById, styleById,
  type Phase, type Position, type PropId, type Restriction, type Role, type YogaLocation, type YogaPose, type YogaStyle, type YogaStyleId,
} from '../data/yoga'
import type { TrainingLevel } from './types'

export const YOGA_GENERATOR_VERSION = 'yoga-gen-1.0'
export const MIN_YOGA_MINUTES = 5
export const MAX_YOGA_MINUTES = 120
export const YOGA_DURATION_PRESETS: readonly number[] = [10, 20, 30, 45, 60, 90]

const RANK: Record<TrainingLevel, number> = { beginner: 0, intermediate: 1, regular: 2 }
/** Beginners and intermediates do not get the most demanding poses. */
const LEVEL_INTENSITY_CAP: Record<TrainingLevel, 1 | 2 | 3> = { beginner: 2, intermediate: 3, regular: 3 }
const HOLD_BY_LEVEL: Record<TrainingLevel, number> = { beginner: 1, intermediate: 1.1, regular: 1.25 }

export interface YogaInput {
  date: string
  style: YogaStyleId
  /** Required. The strength level is never used as a stand-in. */
  level: TrainingLevel | undefined
  minutes: number
  location: YogaLocation
  /** Props the user has. An empty list means no props. */
  props: PropId[]
  restrictions: Restriction[]
}

export interface YogaItem {
  index: number
  poseId: string
  name: string
  sanskrit?: string
  phase: string
  /** Seconds per side if `perSide`, otherwise in total. */
  seconds: number
  perSide: boolean
  /** A rest the user may skip. */
  optional?: boolean
  position: Position
  /** Props this pose needs. Empty means none. */
  props: PropId[]
  instructions: string[]
  cautions: string[]
  modifications: string[]
}

export interface YogaPlan {
  key: string
  date: string
  style: YogaStyleId
  styleName: string
  level: TrainingLevel
  location: YogaLocation
  props: PropId[]
  restrictions: Restriction[]
  minutes: number
  estimatedSeconds: number
  items: YogaItem[]
  /** Poses that were swapped because of a missing prop. */
  substitutions: string[]
  notes: string[]
  /** Safety text that must stay visible. */
  cautions: string[]
  catalogVersion: string
  generatorVersion: string
}

export type YogaResult = { kind: 'plan'; plan: YogaPlan } | { kind: 'error'; message: string }

export type YogaStatus = 'in_progress' | 'completed' | 'partial' | 'abandoned'

export interface YogaSession {
  id: string
  date: string
  style: YogaStyleId
  styleName: string
  level: TrainingLevel
  location: YogaLocation
  props: PropId[]
  restrictions: Restriction[]
  /** Minutes the plan was built for. */
  plannedMinutes: number
  /** A frozen copy: later catalog changes never rewrite a saved session. */
  plan: YogaPlan
  planKey: string
  completedItems: number[]
  skippedItems: number[]
  status: YogaStatus
  notes?: string
  /** Time of the poses marked done, in seconds. Not wall-clock time. */
  durationSeconds: number
  startedAt: string
  finishedAt?: string
  createdAt: string
  updatedAt: string
}

export function yogaCacheKey(i: Pick<YogaInput, 'date' | 'style' | 'level' | 'minutes' | 'location' | 'props' | 'restrictions'>): string {
  return [
    YOGA_CATALOG_VERSION, YOGA_GENERATOR_VERSION, i.date, i.style, i.level ?? '', i.minutes, i.location,
    [...i.props].sort().join(','), [...i.restrictions].sort().join(','),
  ].join('|')
}

/** Small stable hash so the same date and settings always rotate to the same poses. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5)

interface Block { reason: 'props' | 'other'; missing: PropId[] }

function blockedBy(p: YogaPose, input: YogaInput, style: YogaStyle): Block | null {
  const have = new Set(input.props)
  if (RANK[p.minLevel] > RANK[input.level!]) return { reason: 'other', missing: [] }
  if (p.intensity > Math.min(style.maxIntensity, LEVEL_INTENSITY_CAP[input.level!])) return { reason: 'other', missing: [] }
  if (p.styles && !p.styles.includes(style.id)) return { reason: 'other', missing: [] }
  if (p.tags.some((t) => input.restrictions.includes(t))) return { reason: 'other', missing: [] }
  if (style.hot && p.tags.includes('inversions')) return { reason: 'other', missing: [] }
  const missing = p.requires.filter((r) => !have.has(r))
  if (p.needsPadding && !have.has('mat') && !have.has('blanket')) missing.push('mat')
  if (missing.length > 0) return { reason: 'props', missing }
  return null
}

function holdFor(p: YogaPose, style: YogaStyle, level: TrainingLevel): number {
  const quiet = p.roles.includes('centering') || p.roles.includes('breath')
  if (style.fixedHold && !quiet && !p.roles.includes('relax')) return style.fixedHold[level]
  if (quiet) return p.hold
  return round5(p.hold * style.holdScale * HOLD_BY_LEVEL[level])
}

const itemSeconds = (seconds: number, perSide: boolean, transition: number) => (perSide ? seconds * 2 + transition * 2 : seconds + transition)

function propsText(missing: PropId[]): string {
  const names = [...new Set(missing)].map((m) => (m === 'mat' ? 'mat or blanket' : m))
  return names.join(' and ')
}

function toItem(p: YogaPose, phase: string, seconds: number, index: number, optional = false): YogaItem {
  return {
    index, poseId: p.id, name: p.name, sanskrit: p.sanskrit, phase, seconds, perSide: !!p.sides, optional,
    position: p.position, props: p.requires, instructions: p.instructions, cautions: p.cautions, modifications: p.modifications,
  }
}

const NIDRA_ORDER: [string, number][] = [
  ['nidra-settle', 0.1], ['nidra-scan', 0.35], ['nidra-breath', 0.15], ['nidra-sensation', 0.1], ['nidra-imagery', 0.15], ['nidra-return', 0.15],
]

export function generateYoga(input: YogaInput): YogaResult {
  if (!input.level) return { kind: 'error', message: 'Choose your yoga level first. It is separate from your strength level.' }
  const style = styleById(input.style)
  if (!style) return { kind: 'error', message: 'That yoga style is not available.' }
  if (!Number.isInteger(input.minutes) || input.minutes < MIN_YOGA_MINUTES || input.minutes > MAX_YOGA_MINUTES) {
    return { kind: 'error', message: `Choose a yoga length between ${MIN_YOGA_MINUTES} and ${MAX_YOGA_MINUTES} minutes.` }
  }
  const level = input.level
  const have = new Set(input.props)
  for (const need of style.needs ?? []) {
    if (!have.has(need)) return { kind: 'error', message: `${style.name} needs a ${need}. Add one to your props, or choose another style such as Gentle yoga.` }
  }

  const total = input.minutes * 60
  const notes: string[] = [...(style.notes ?? [])]
  const substitutions: string[] = []
  const cautions: string[] = []
  if (style.caution) cautions.push(style.caution)
  if (style.hot && input.location !== 'gym') cautions.push('You are not in a studio. Do not raise the temperature of your space to do this style.')
  cautions.push('Stop if you feel sharp pain, dizziness or numbness. This is not a substitute for a qualified teacher. If you have a medical condition or are pregnant, check with a health professional first.')
  if (input.location === 'gym') notes.push('At the gym: find a clear patch of floor with room to stretch your arms and legs.')
  if (input.location === 'other') notes.push('Check that the floor is flat and not slippery before you start.')
  if (input.props.length === 0) notes.push('No props selected. This plan uses poses you can do without any. Follow the modification tips if a pose feels hard.')
  if (level === 'beginner') notes.push('As a beginner, rest in child\'s pose or lie down any time. Every pose has a modification below it.')
  const [minRec, maxRec] = style.recommendedMinutes
  if (input.minutes < minRec) notes.push(`${style.name} works best for about ${minRec} to ${maxRec} minutes. This shorter session covers fewer poses.`)

  const items: YogaItem[] = []
  const used = new Set<string>()
  const seed = hash(`${input.date}|${input.style}|${level}`)

  // ---- yoga nidra: a fixed script of steps, scaled to the time ----
  if (style.id === 'nidra') {
    for (const [id, share] of NIDRA_ORDER) {
      const p = poseById(id)!
      items.push(toItem(p, 'Guided relaxation', Math.max(30, round5(total * share)), items.length))
    }
    const estimated = items.reduce((n, i) => n + i.seconds, 0)
    const plan: YogaPlan = {
      key: yogaCacheKey(input), date: input.date, style: style.id, styleName: style.name, level, location: input.location,
      props: [...input.props], restrictions: [...input.restrictions], minutes: input.minutes, estimatedSeconds: estimated,
      items, substitutions, notes, cautions, catalogVersion: YOGA_CATALOG_VERSION, generatorVersion: YOGA_GENERATOR_VERSION,
    }
    return { kind: 'plan', plan }
  }

  const allowed = (p: YogaPose) => blockedBy(p, input, style) === null
  const rotate = <T,>(list: T[], by: number): T[] => (list.length === 0 ? list : [...list.slice(by % list.length), ...list.slice(0, by % list.length)])
  const byRole = (role: Role, avoid: Set<string>): YogaPose | undefined =>
    rotate(POSES.filter((p) => p.roles.includes(role) && allowed(p) && !avoid.has(p.id)), seed + role.length).find(() => true)
  const skippedForSettings = new Set<string>()

  let mainCount = 0
  style.phases.forEach((phase: Phase, phaseIndex) => {
    const budget = Math.round(total * phase.share)
    const isRest = phase.roles.length === 1 && phase.roles[0] === 'relax'
    const isMain = phaseIndex >= 1 && phase.roles.some((r) => r === 'flow' || r === 'standing' || r === 'core' || r === 'balance')

    if (isRest) {
      const choices = [...(phase.prefer ?? []), 'savasana', 'side-lying-rest', 'constructive-rest', ...(style.id === 'chair' ? ['chair-relax'] : [])]
      let pick: YogaPose | undefined
      for (const id of choices) {
        const p = poseById(id)
        if (p && allowed(p) && !used.has(p.id)) { pick = p; break }
      }
      if (style.id === 'chair') pick = poseById('chair-relax')
      pick ??= byRole('relax', used)
      if (!pick) return
      used.add(pick.id)
      const seconds = Math.min(1200, Math.max(60, budget - style.transition))
      items.push(toItem(pick, phase.name, seconds, items.length))
      return
    }

    let spent = 0
    const queue = [...(phase.prefer ?? [])]
    let cycle = 0
    let guard = 0
    while (spent < budget * 0.92 && guard++ < 60) {
      let pose: YogaPose | undefined
      const want = queue.shift()
      if (want) {
        const p = poseById(want)
        if (!p || used.has(p.id)) continue
        const block = blockedBy(p, input, style)
        if (!block) pose = p
        else if (block.reason === 'props') {
          const sub = byRole(p.roles[0], used)
          if (sub) {
            substitutions.push(`${p.name} needs ${propsText(block.missing)}. ${sub.name} is used instead.`)
            pose = sub
          }
        } else if (p.tags.some((t) => input.restrictions.includes(t))) skippedForSettings.add(p.name)
        if (!pose) continue
      } else {
        const roles = phase.roles
        let tries = 0
        while (!pose && tries++ < roles.length) pose = byRole(roles[cycle++ % roles.length], used)
        if (!pose) break
      }
      used.add(pose.id)
      const hold = holdFor(pose, style, level)
      let seconds = hold
      let cost = itemSeconds(seconds, !!pose.sides, style.transition)
      if (spent === 0 && cost > budget * 1.5) {
        seconds = Math.max(20, Math.floor((budget - style.transition * (pose.sides ? 2 : 1)) / (pose.sides ? 2 : 1)))
        cost = itemSeconds(seconds, !!pose.sides, style.transition)
      } else if (spent > 0 && spent + cost > budget * 1.12) {
        used.delete(pose.id)
        break
      }
      items.push(toItem(pose, phase.name, seconds, items.length))
      spent += cost
      if (isMain) {
        mainCount += 1
        if (level === 'beginner' && style.beginnerRests && mainCount % 4 === 0 && spent < budget * 0.9) {
          const rest = poseById('child')
          const alt = poseById('constructive-rest')
          const r = rest && allowed(rest) ? rest : alt
          if (r) {
            items.push(toItem(r, phase.name, 30, items.length, true))
            spent += 30 + style.transition
          }
        }
      }
    }
  })

  if (skippedForSettings.size > 0) notes.push(`Left out because of your settings: ${[...skippedForSettings].join(', ')}.`)

  const mainItems = items.filter((i) => i.phase !== 'Final rest' && i.phase !== 'Rest')
  if (mainItems.length === 0) {
    return { kind: 'error', message: 'No poses match your props, level and settings. Try adding a prop, removing a restriction or choosing another style.' }
  }

  // Index and total time. Optional rests count in the estimate.
  items.forEach((it, i) => { it.index = i })
  const estimated = items.reduce((n, i) => n + itemSeconds(i.seconds, i.perSide, style.transition), 0)
  if (estimated < total * 0.8) {
    notes.push(`There were not enough different poses for the full ${input.minutes} minutes with your props and settings. This plan is about ${Math.ceil(estimated / 60)} minutes. Add a prop, remove a restriction, or end with extra rest.`)
  }
  const plan: YogaPlan = {
    key: yogaCacheKey(input), date: input.date, style: style.id, styleName: style.name, level, location: input.location,
    props: [...input.props], restrictions: [...input.restrictions], minutes: input.minutes, estimatedSeconds: estimated,
    items, substitutions, notes, cautions, catalogVersion: YOGA_CATALOG_VERSION, generatorVersion: YOGA_GENERATOR_VERSION,
  }
  return { kind: 'plan', plan }
}

/** Props a typical location is likely to have. Only a starting suggestion that the user confirms. */
export function suggestedProps(location: YogaLocation): PropId[] {
  if (location === 'gym') return ['mat', 'blocks', 'strap']
  if (location === 'home') return ['mat']
  return []
}

export function itemTotalSeconds(item: Pick<YogaItem, 'seconds' | 'perSide'>): number {
  return item.perSide ? item.seconds * 2 : item.seconds
}

/** Rough calorie range for a yoga session. Only shown when the method and weight are known. */
export function yogaCalories(style: YogaStyleId, durationSeconds: number, weightKg: number | undefined): { low: number; high: number } | null {
  if (!weightKg || weightKg <= 0 || durationSeconds < 300) return null
  if (style === 'nidra' || style === 'restorative') return null // close to resting energy use, so no estimate is shown
  const vigorous = style === 'vinyasa' || style === 'power' || style === 'ashtanga' || style === 'hot'
  // Compendium of Physical Activities: Hatha yoga 2.5, power yoga 4.0, nadi shodhana 2.0 (rounded).
  const [lo, hi] = vigorous ? [2.5, 4.0] : [2.0, 2.5]
  const h = durationSeconds / 3600
  const r10 = (n: number) => Math.round(n / 10) * 10
  return { low: r10(lo * weightKg * h), high: r10(hi * weightKg * h) }
}

export { STYLES, YOGA_CATALOG_VERSION }
