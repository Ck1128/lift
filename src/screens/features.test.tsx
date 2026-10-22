import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { db, useDatabase, nowIso, uid } from '../db/schema'
import { profileToForm, resetAllData, saveProfile } from '../db/repo'
import { getSetting } from '../db/settings'
import { ensureStories, listStories } from '../db/storyRepo'

let n = 0
// 2026-10-21 is a Wednesday. The app was set up a week earlier, so the weigh-in prompt can show.
const WED = new Date(2026, 9, 21, 12, 0, 0)
const SUN = new Date(2026, 9, 25, 12, 0, 0)

async function seed(now: Date, createdDaysAgo = 7) {
  await resetAllData()
  await saveProfile({ ...profileToForm(), weightValue: '180', heightCm: '178', trainingLevel: 'intermediate' }, { preferredLocation: 'gym', gymType: 'planet_fitness' }, now)
  const p = (await db.profile.toArray())[0]
  await db.bodyWeights.clear() // onboarding logs the first weight; these tests start without one
  await db.profile.put({ ...p, createdAt: new Date(now.getTime() - createdDaysAgo * 86_400_000).toISOString() })
}

beforeEach(async () => {
  useDatabase(`feat-test-${++n}`)
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(WED)
  window.history.replaceState(null, '', '#/home')
  await resetAllData()
})
afterEach(async () => {
  vi.useRealTimers()
  cleanup()
  await new Promise((r) => setTimeout(r, 50))
  db.close()
})

describe("Today's Call on Home", () => {
  it('is the first card on Home, with Lift deciding by default', async () => {
    await seed(WED)
    render(<App />)
    const decides = await screen.findByRole('button', { name: 'Lift decides' })
    expect(decides).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText("Today's call")).toBeInTheDocument()
    const main = screen.getByRole('main')
    const cards = main.querySelectorAll('section.card')
    expect(cards[0].textContent).toMatch(/today's call/i)
  })

  it("lets the person choose a focus, says how ready it is, and keeps the choice", async () => {
    await seed(WED)
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: "I'll choose" }))
    expect(await screen.findByText(/what do you feel like today/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Upper body' }))
    expect(await screen.findByRole('status')).toHaveTextContent(/logged yet|recovered|recovering/i)
    expect(screen.getByRole('button', { name: /design my upper body workout/i })).toBeEnabled()
    expect(await getSetting('call.mode', 'tell')).toBe('ask')
  })

  it('designs the chosen workout and opens it', async () => {
    await seed(WED)
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: "I'll choose" }))
    await user.click(await screen.findByRole('button', { name: 'Lower body' }))
    await user.click(screen.getAllByRole('button', { name: '30 min' })[0])
    await user.click(screen.getByRole('button', { name: /design my lower body workout \(30 min\)/i }))
    await screen.findByRole('button', { name: /start workout/i })
    expect(window.location.hash).toBe('#/workout')
    const rows = await db.scheduled.where('date').equals('2026-10-21').toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].focus).toBe('Lower body')
    expect(rows[0].workout?.exercises.length).toBeGreaterThan(0)
  })
})

describe('express circuit', () => {
  it('is optional: offered as a choice, builds a 30 minute circuit with three rounds', async () => {
    await seed(WED)
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: "I'll choose" }))
    await user.click(await screen.findByRole('button', { name: 'Express circuit' }))
    expect(within(screen.getByText("Today's call").closest('section')!).queryByText(/how much time do you have/i)).toBeNull() // the length is fixed at 30
    await user.click(screen.getByRole('button', { name: /design my express circuit \(30 min\)/i }))
    await screen.findByRole('button', { name: /start workout/i })
    const row = (await db.scheduled.where('date').equals('2026-10-21').toArray())[0]
    expect(row.circuit).toBe(true)
    const w = row.workout!
    expect(w.availableMinutes).toBe(30)
    expect(w.estimatedMinutes).toBeLessThanOrEqual(30)
    expect(w.exercises.length).toBeGreaterThanOrEqual(4)
    expect(w.exercises.every((e) => e.sets === 3 && e.restSeconds === 30)).toBe(true)
    expect(w.notes.join(' ')).toMatch(/express circuit/i)
  })

  it('is not forced on anyone: the default call is a normal workout with a small link to the circuit', async () => {
    await seed(WED)
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Lift decides' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try the 30 minute express circuit/i })).toBeInTheDocument()
  })
})

describe('injured areas', () => {
  it('can be marked in Settings, are saved, and show in the recovery explanation', async () => {
    await seed(WED)
    window.history.replaceState(null, '', '#/settings')
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByText('Exercises to avoid'))
    const group = await screen.findByRole('group', { name: 'Injured areas' })
    await user.click(within(group).getByRole('button', { name: 'Quads' }))
    await waitFor(async () => expect((await db.profile.toArray())[0].injuredMuscles).toEqual(['quads']))
    expect(within(group).getByRole('button', { name: 'Quads' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('weekly weigh-in popup', () => {
  it('appears, can be closed, and returns the next day until a weight is saved', async () => {
    await seed(WED)
    const user = userEvent.setup()
    const first = render(<App />)
    const dlg = await screen.findByRole('dialog', { name: /weekly weigh-in/i })
    await user.click(within(dlg).getByRole('button', { name: 'Not now' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /weekly weigh-in/i })).toBeNull())
    expect(await getSetting('weighin.dismissed', '')).toBe('2026-10-21')

    // Same day, reopened: still hidden.
    first.unmount()
    render(<App />)
    await screen.findByRole('button', { name: 'Lift decides' })
    expect(screen.queryByRole('dialog', { name: /weekly weigh-in/i })).toBeNull()

    // Next day: back again.
    cleanup()
    vi.setSystemTime(new Date(2026, 9, 22, 9, 0, 0))
    render(<App />)
    const again = await screen.findByRole('dialog', { name: /weekly weigh-in/i })
    await user.type(within(again).getByLabelText('Your weight today'), '178.4')
    await user.click(within(again).getByRole('button', { name: 'Save weight' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /weekly weigh-in/i })).toBeNull())
    const rows = await db.bodyWeights.toArray()
    expect(rows.map((r) => r.value)).toContain(178.4)
    expect((await db.profile.toArray())[0].weightKg).toBeCloseTo(178.4 / 2.2046, 1)

    // Later in the same week: no more prompts.
    cleanup()
    vi.setSystemTime(new Date(2026, 9, 24, 9, 0, 0))
    render(<App />)
    await screen.findByRole('button', { name: 'Lift decides' })
    expect(screen.queryByRole('dialog', { name: /weekly weigh-in/i })).toBeNull()
  })

  it('rejects an impossible weight with a plain message', async () => {
    await seed(WED)
    const user = userEvent.setup()
    render(<App />)
    const dlg = await screen.findByRole('dialog', { name: /weekly weigh-in/i })
    await user.type(within(dlg).getByLabelText('Your weight today'), '5')
    await user.click(within(dlg).getByRole('button', { name: 'Save weight' }))
    expect(await within(dlg).findByText(/enter your weight in/i)).toBeInTheDocument()
  })

  it('does not show on the day the app was set up', async () => {
    await seed(WED, 0)
    render(<App />)
    await screen.findByRole('button', { name: 'Lift decides' })
    expect(screen.queryByRole('dialog', { name: /weekly weigh-in/i })).toBeNull()
  })
})

describe('Body Story', () => {
  async function finishedWorkout(date: string) {
    const t = `${date}T10:00:00.000Z`
    await db.sessions.add({
      id: uid(), date, startedAt: t, finishedAt: `${date}T10:40:00.000Z`, status: 'completed', plannedExercises: [], actualExercises: [], title: 'Upper', planVersion: 1,
      generatorVersion: 'g', targetMuscles: [], pausedMs: 0, weightUnit: 'lb', updatedAt: nowIso(),
    } as never)
  }

  it('is saved on Sunday, again not duplicated, and offered on Home', async () => {
    await seed(SUN)
    vi.setSystemTime(SUN)
    await finishedWorkout('2026-10-20')
    const made = await ensureStories('2026-10-25')
    expect(made.map((s) => s.kind)).toEqual(['week'])
    expect((await ensureStories('2026-10-25')).length).toBe(0)
    expect((await listStories())[0].workouts).toBe(1)

    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByText(/your weekly story is ready/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /view my body story/i }))
    expect(await screen.findByRole('heading', { name: 'Body Story' })).toBeInTheDocument()
    expect(screen.getAllByText('Oct 19 to Oct 25').length).toBeGreaterThan(0)
  })

  it('saves the month on its last day, and catches up a missed Sunday on the next open', async () => {
    await seed(new Date(2026, 9, 31, 12))
    await finishedWorkout('2026-10-20')
    const made = await ensureStories('2026-10-31')
    expect(made.map((s) => s.kind).sort()).toEqual(['month', 'week'])
    // Opened only on a Wednesday: the week that ended last Sunday is still caught up.
    await resetAllData()
    await seed(WED)
    await finishedWorkout('2026-10-14')
    expect((await ensureStories('2026-10-21')).map((s) => s.id)).toEqual(['week:2026-10-18'])
  })

  it('can be opened any time, with body weight in the story and in sharing by default', async () => {
    await seed(WED)
    await finishedWorkout('2026-10-20')
    await db.bodyWeights.add({ id: 'w0', date: '2026-10-14', value: 180, unit: 'lb' })
    await db.bodyWeights.add({ id: 'w1', date: '2026-10-21', value: 178, unit: 'lb' })
    window.history.replaceState(null, '', '#/story')
    render(<App />)
    expect(await screen.findByText(/this week so far/i)).toBeInTheDocument()
    expect((await screen.findAllByText(/178 lb/)).length).toBeGreaterThan(0)
    expect(screen.getByRole('checkbox', { name: /include body weight/i })).toBeChecked()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Monthly' }))
    expect(await screen.findByText(/this month so far/i)).toBeInTheDocument()
  })
})

describe('Privacy page', () => {
  it('lists what is stored and what can leave', async () => {
    await seed(WED)
    window.history.replaceState(null, '', '#/privacy')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Privacy' })).toBeInTheDocument()
    expect(screen.getByText(/no account and no lift server/i)).toBeInTheDocument()
    expect(screen.getByText(/open food facts/i)).toBeInTheDocument()
  })
})
