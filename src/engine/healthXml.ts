/**
 * Reads Apple Health's own export (Health app > profile picture > Export All Health Data gives export.zip).
 * The file can be hundreds of megabytes, so it is read as a stream and only body weight and workouts are kept.
 * Nothing is uploaded: this runs on the phone.
 */
import { Unzip, UnzipInflate } from 'fflate'
import { emptyBatch, localStamp, toKg, type HealthBatch } from './health'

const attr = (tag: string, name: string): string | undefined => {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag)
  return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>') : undefined
}

/** "HKWorkoutActivityTypeTraditionalStrengthTraining" becomes "Traditional Strength Training". */
export function workoutTypeName(raw: string): string {
  return raw.replace(/^HKWorkoutActivityType/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').trim() || 'Workout'
}

const minutesOf = (value: number, unit: string): number => {
  const u = unit.toLowerCase()
  return u === 'sec' || u === 's' ? value / 60 : u === 'hr' || u === 'h' ? value * 60 : value
}

/** Feed it text in any size of pieces. Call `finish()` once at the end. */
export class HealthXmlReader {
  private buf = ''
  private batch: HealthBatch = emptyBatch()
  private open: { start: string; type: string; minutes: number; kcal?: number; source?: string } | null = null
  records = 0

  push(text: string): void {
    this.buf += text
    let pos = 0
    for (;;) {
      const lt = this.buf.indexOf('<', pos)
      if (lt < 0) { pos = this.buf.length; break }
      const gt = this.buf.indexOf('>', lt)
      if (gt < 0) { pos = lt; break } // the tag is not complete yet
      this.tag(this.buf.slice(lt, gt + 1))
      pos = gt + 1
    }
    this.buf = this.buf.slice(pos)
  }

  private tag(t: string): void {
    if (t.startsWith('<Record ')) {
      this.records++
      if (!t.includes('HKQuantityTypeIdentifierBodyMass')) return
      const v = Number(attr(t, 'value'))
      const at = localStamp(attr(t, 'startDate') ?? '')
      const kg = toKg(v, attr(t, 'unit') ?? 'kg')
      if (at && kg !== null && kg >= 20 && kg <= 400) this.batch.weights.push({ at, kg: Math.round(kg * 1000) / 1000 })
      else this.batch.ignored++
    } else if (t.startsWith('<Workout ')) {
      this.close()
      const start = localStamp(attr(t, 'startDate') ?? '')
      const dur = Number(attr(t, 'duration'))
      if (!start || !Number.isFinite(dur)) { this.batch.ignored++; return }
      const kcalAttr = attr(t, 'totalEnergyBurned')
      this.open = {
        start, type: workoutTypeName(attr(t, 'workoutActivityType') ?? ''), minutes: minutesOf(dur, attr(t, 'durationUnit') ?? 'min'),
        kcal: kcalAttr !== undefined && Number.isFinite(Number(kcalAttr)) ? Number(kcalAttr) : undefined, source: attr(t, 'sourceName'),
      }
      if (t.endsWith('/>')) this.close()
    } else if (t.startsWith('<WorkoutStatistics ') && this.open) {
      if (attr(t, 'type') === 'HKQuantityTypeIdentifierActiveEnergyBurned') {
        const sum = Number(attr(t, 'sum'))
        if (Number.isFinite(sum)) this.open.kcal = sum
      }
    } else if (t.startsWith('</Workout>')) {
      this.close()
    }
  }

  private close(): void {
    const w = this.open
    this.open = null
    if (!w) return
    if (w.minutes >= 1 && w.minutes <= 1440) {
      this.batch.workouts.push({ start: w.start, type: w.type, minutes: Math.round(w.minutes * 10) / 10, kcal: w.kcal !== undefined ? Math.round(w.kcal) : undefined, source: w.source })
    } else this.batch.ignored++
  }

  finish(): HealthBatch {
    this.close()
    return this.batch
  }
}

const CHUNK = 4 * 1024 * 1024

/** Reads export.zip (or a bare export.xml) from a file the person picked. `onProgress` gets 0..1. */
export async function readHealthExport(file: Blob & { name?: string }, onProgress?: (p: number) => void): Promise<HealthBatch> {
  const reader = new HealthXmlReader()
  const dec = new TextDecoder()
  const name = (file.name ?? '').toLowerCase()
  const isZip = name.endsWith('.zip') || await startsWithZip(file)
  if (!isZip) {
    for (let at = 0; at < file.size; at += CHUNK) {
      reader.push(dec.decode(new Uint8Array(await file.slice(at, at + CHUNK).arrayBuffer()), { stream: true }))
      onProgress?.(Math.min(1, (at + CHUNK) / file.size))
    }
    return reader.finish()
  }
  let found = false
  let failure: Error | null = null
  const unzip = new Unzip((f) => {
    // The main file is export.xml. export_cda.xml is a different, much larger copy and is skipped.
    if (!/(^|\/)export\.xml$/i.test(f.name)) return
    found = true
    f.ondata = (err, chunk) => {
      if (err) { failure = err; return }
      reader.push(dec.decode(chunk, { stream: true }))
    }
    f.start()
  })
  unzip.register(UnzipInflate)
  for (let at = 0; at < file.size; at += CHUNK) {
    const last = at + CHUNK >= file.size
    unzip.push(new Uint8Array(await file.slice(at, at + CHUNK).arrayBuffer()), last)
    if (failure) throw failure
    onProgress?.(Math.min(1, (at + CHUNK) / file.size))
    // Let the page breathe between chunks.
    await new Promise((r) => setTimeout(r, 0))
  }
  if (!found) throw new Error('This zip does not contain export.xml. Use the file from Health > your picture > Export All Health Data.')
  return reader.finish()
}

async function startsWithZip(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer())
  return head[0] === 0x50 && head[1] === 0x4b
}
