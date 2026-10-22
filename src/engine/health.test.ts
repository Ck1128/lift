import { describe, expect, it } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import {
  batchesOf, foodItems, liftIntervals, localStamp, parseHealthText, planMerge, runShortcutUrl, stampOf, unsentOnly, weightItem, workoutItem, yogaItem,
  type HealthBatch,
} from './health'
import { HealthXmlReader, readHealthExport, workoutTypeName } from './healthXml'
import type { WorkoutSession } from './types'
import type { YogaSession } from './yoga'

const XML = `<?xml version="1.0"?><HealthData>
<Record type="HKQuantityTypeIdentifierStepCount" unit="count" startDate="2026-10-20 08:00:00 -0400" value="900"/>
<Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Scale" unit="lb" startDate="2026-10-21 07:30:12 -0400" endDate="2026-10-21 07:30:12 -0400" value="172.4"><MetadataEntry key="a" value="b"/></Record>
<Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" startDate="2026-10-22 07:31:00 -0400" value="78"/>
<Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="32.5" durationUnit="min" sourceName="Apple Watch" startDate="2026-10-19 18:05:00 -0400" endDate="2026-10-19 18:37:30 -0400">
  <WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned" sum="310.4" unit="kcal"/>
</Workout>
<Workout workoutActivityType="HKWorkoutActivityTypeTraditionalStrengthTraining" duration="2400" durationUnit="sec" totalEnergyBurned="150" startDate="2026-10-18 09:00:00 -0400"/>
<Workout workoutActivityType="HKWorkoutActivityTypeYoga" duration="0.2" durationUnit="min" startDate="2026-10-17 09:00:00 -0400"/>
</HealthData>`

describe('reading Shortcut text', () => {
  it('reads weights and workouts, ignores bad lines, converts to kg', () => {
    const b = parseHealthText('B|2026-10-21 07:30:12|172.4|lb\nK|2026-10-21T18:05|Running|32|310\nB|2026-10-21T07:30|9999|kg\nhello\n\nK|bad|Run|10')
    expect(b.weights).toHaveLength(1)
    expect(b.weights[0].at).toBe('2026-10-21T07:30')
    expect(b.weights[0].kg).toBeCloseTo(78.2, 1)
    expect(b.workouts).toEqual([{ start: '2026-10-21T18:05', type: 'Running', minutes: 32, kcal: 310, source: undefined }])
    expect(b.ignored).toBe(3)
  })
  it('accepts JSON and decimal commas', () => {
    const b = parseHealthText('{"weights":[{"date":"2026-10-21","value":80,"unit":"kg"}],"workouts":[{"start":"2026-10-21T10:00","type":"Walking","minutes":20}]}')
    expect(b.weights[0].at).toBe('2026-10-21T12:00')
    expect(b.workouts[0].type).toBe('Walking')
    expect(parseHealthText('B|2026-10-21T07:30|77,5|kg').weights[0].kg).toBe(77.5)
  })
  it('normalises time stamps', () => {
    expect(localStamp('2026-10-21 07:30:12 -0400')).toBe('2026-10-21T07:30')
    expect(localStamp('2026-10-21')).toBe('2026-10-21T12:00')
    expect(localStamp('nope')).toBeNull()
  })
})

describe('reading the Apple Health export', () => {
  it('keeps body weight and workouts only, in any chunking', () => {
    for (const size of [7, 64, 100000]) {
      const r = new HealthXmlReader()
      for (let i = 0; i < XML.length; i += size) r.push(XML.slice(i, i + size))
      const b = r.finish()
      expect(b.weights.map((w) => w.at)).toEqual(['2026-10-21T07:30', '2026-10-22T07:31'])
      expect(b.workouts.map((w) => [w.type, w.minutes, w.kcal])).toEqual([['Running', 32.5, 310], ['Traditional Strength Training', 40, 150]])
      expect(b.ignored).toBe(1) // the 12 second yoga entry
    }
  })
  it('names workout types', () => {
    expect(workoutTypeName('HKWorkoutActivityTypeHighIntensityIntervalTraining')).toBe('High Intensity Interval Training')
    expect(workoutTypeName('HKWorkoutActivityTypeYoga')).toBe('Yoga')
  })
  it('reads a zip file and a bare xml file', async () => {
    const zip = zipSync({ 'apple_health_export/export.xml': strToU8(XML), 'apple_health_export/export_cda.xml': strToU8('<x/>') })
    const a = await readHealthExport(Object.assign(new Blob([zip]), { name: 'export.zip' }))
    expect(a.weights).toHaveLength(2)
    expect(a.workouts).toHaveLength(2)
    const b = await readHealthExport(Object.assign(new Blob([XML]), { name: 'export.xml' }))
    expect(b.weights).toHaveLength(2)
  })
  it('explains a zip without export.xml', async () => {
    const zip = zipSync({ 'other.txt': strToU8('hi') })
    await expect(readHealthExport(Object.assign(new Blob([zip]), { name: 'x.zip' }))).rejects.toThrow(/export\.xml/)
  })
})

const session = (over: Partial<WorkoutSession>): WorkoutSession => ({
  id: 's1', date: '2026-10-21', startedAt: new Date(2026, 9, 21, 18, 0).toISOString(), finishedAt: new Date(2026, 9, 21, 18, 45).toISOString(),
  status: 'completed', plannedExercises: [], actualExercises: [], title: 'Full body', planVersion: 1, generatorVersion: 'x', targetMuscles: [], pausedMs: 0, weightUnit: 'lb', ...over,
})

describe('merging with Lift', () => {
  const unit = 'lb' as const
  const base = { existingWeights: [], existingHealthIds: new Set<string>(), intervals: [], unit, now: '2026-10-22T00:00:00Z' }
  const batch = (b: Partial<HealthBatch>): HealthBatch => ({ weights: [], workouts: [], ignored: 0, ...b })

  it('adds new records once and shows them in the chosen unit', () => {
    const b = batch({ weights: [{ at: '2026-10-21T07:30', kg: 78.2 }], workouts: [{ start: '2026-10-21T07:00', type: 'Running', minutes: 30, kcal: 300 }] })
    const p = planMerge({ ...base, batch: b })
    expect(p.newWeights).toEqual([{ id: 'hk-b-2026-10-21T07:30', date: '2026-10-21', value: 172.4, unit: 'lb' }])
    expect(p.newWorkouts).toHaveLength(1)
    const again = planMerge({ ...base, batch: b, existingHealthIds: new Set([p.newWeights[0].id, p.newWorkouts[0].id]) })
    expect(again.newWeights).toHaveLength(0)
    expect(again.newWorkouts).toHaveLength(0)
    expect(again.alreadyHere).toBe(2)
  })
  it('does not bring back a weight Lift already has', () => {
    const p = planMerge({ ...base, existingWeights: [{ id: 'x', date: '2026-10-21', value: 172.4, unit: 'lb' }], batch: batch({ weights: [{ at: '2026-10-21T07:30', kg: 78.2 }] }) })
    expect(p.newWeights).toHaveLength(0)
    expect(p.alreadyHere).toBe(1)
  })
  it('skips a Health workout that overlaps one logged in Lift', () => {
    const iv = liftIntervals([session({})], [])
    const p = planMerge({ ...base, intervals: iv, batch: batch({ workouts: [{ start: stampOf(new Date(2026, 9, 21, 18, 5)), type: 'Strength', minutes: 40 }, { start: '2026-10-21T07:00', type: 'Walking', minutes: 20 }] }) })
    expect(p.overlapLift).toBe(1)
    expect(p.newWorkouts.map((w) => w.type)).toEqual(['Walking'])
  })
  it('honours a start date', () => {
    const p = planMerge({ ...base, since: '2026-10-21', batch: batch({ weights: [{ at: '2026-10-01T07:30', kg: 80 }, { at: '2026-10-21T07:30', kg: 80 }] }) })
    expect(p.newWeights).toHaveLength(1)
  })
})

describe('sending to Health', () => {
  it('builds lines for workouts, yoga, weight and food, and only the unsent ones', () => {
    const w = workoutItem(session({}), false)!
    expect(w.line).toBe(`K|${stampOf(new Date(2026, 9, 21, 18, 0))}|Strength|45`)
    expect(workoutItem(session({}), true, 187.6)!.line.endsWith('|Strength|45|188')).toBe(true)
    expect(workoutItem(session({ status: 'abandoned' }), false)).toBeNull()
    const y = { id: 'y1', date: '2026-10-21', status: 'completed', durationSeconds: 1500, startedAt: new Date(2026, 9, 21, 7, 0).toISOString() } as YogaSession
    expect(yogaItem(y, false)!.line).toBe(`K|${stampOf(new Date(2026, 9, 21, 7, 0))}|Yoga|25`)
    expect(weightItem({ id: 'b1', date: '2026-10-21', value: 172.4, unit: 'lb' })!.line).toBe('B|2026-10-21T12:00|172.4|lb')
    expect(weightItem({ id: 'b2', date: '2026-10-21', value: 80, unit: 'kg', source: 'health' })).toBeNull()
    const food = foodItems([{ date: '2026-10-21', kcal: 500 }, { date: '2026-10-21', kcal: 700 }, { date: '2026-10-22' }] as never)
    expect(food.map((f) => f.line)).toEqual(['F|2026-10-21|1200'])
    expect(unsentOnly([w, ...food], { [w.id]: 'x' })).toEqual(food)
  })
  it('splits long lists and builds the Shortcuts link', () => {
    const items = Array.from({ length: 60 }, (_, i) => ({ id: String(i), line: 'x', label: 'x' }))
    expect(batchesOf(items).map((b) => b.length)).toEqual([25, 25, 10])
    const url = runShortcutUrl('Lift to Health', 'K|a|b')
    expect(url).toBe('shortcuts://run-shortcut?name=Lift%20to%20Health&input=text&text=K%7Ca%7Cb')
    expect(runShortcutUrl('Health to Lift')).toBe('shortcuts://run-shortcut?name=Health%20to%20Lift')
  })
})
