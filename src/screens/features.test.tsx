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
  await saveProfile({ ...profileToForm(), weightValue: '180', heightCm: '178', trainingLevel: 'intermediate', birthDate: '1990-05-15', sex: 'male' }, { preferredLocation: 'gym', gymType: 'standard' }, now)
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
    await screen.findByRole('button', { name: /express circuit/i })
    // One workout card: Lift's call, the main button and the two quiet options all live together.
    const main = screen.getByRole('main')
    const cards = main.querySelectorAll('section.card')
    expect(cards[0].textContent).toMatch(/today's focus/i)
    expect(within(cards[0] as HTMLElement).getByRole('button', { name: /generate workout/i })).toBeInTheDocument()
    expect(within(cards[0] as HTMLElement).getByRole('button', { name: "I'll choose" })).toBeInTheDocument()
    expect(main.querySelectorAll('section.card.hero').length).toBe(1)
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
    expect(screen.getByRole('button', { name: 'Let Lift decide' })).toBeInTheDocument()
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
    expect(await screen.findByRole('button', { name: /express circuit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /express circuit/i })).toBeInTheDocument()
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
    await user.click(within(group).getByRole('button', { name: /^quads/i }))
    expect((await db.profile.toArray())[0].injuredMuscles ?? []).toEqual([]) // waits for Save
    await user.click(await screen.findByRole('button', { name: 'Save changes' }))
    await waitFor(async () => expect((await db.profile.toArray())[0].injuredMuscles).toEqual(['quads']))
    expect(within(group).getByRole('button', { name: /^quads/i })).toHaveAttribute('aria-pressed', 'true')
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
    await screen.findByRole('button', { name: /express circuit/i })
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
    await screen.findByRole('button', { name: /express circuit/i })
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
    await screen.findByRole('button', { name: /express circuit/i })
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

describe('date of birth and sex', () => {
  it('age is worked out from the date of birth and moves on with the calendar', async () => {
    const { ageFromBirthDate, birthDateError } = await import('../engine/age')
    expect(ageFromBirthDate('1990-10-22', new Date(2026, 9, 21))).toBe(35) // birthday is tomorrow
    expect(ageFromBirthDate('1990-10-22', new Date(2026, 9, 22))).toBe(36)
    expect(ageFromBirthDate('1990-02-30', new Date(2026, 9, 22))).toBeUndefined()
    expect(birthDateError('')).toMatch(/enter your date of birth/i)
    expect(birthDateError('2099-01-01')).toMatch(/future/i)
    expect(birthDateError('1990-05-15', new Date(2026, 9, 22))).toBe('')
    await seed(WED)
    const { getProfile } = await import('../db/repo')
    expect((await getProfile())!.age).toBe(36)
    vi.setSystemTime(new Date(2027, 9, 21, 12))
    expect((await getProfile())!.age).toBe(37)
  })

  it('setup will not continue without both, and shows the age it worked out', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome' })
    await user.click(screen.getByRole('button', { name: 'Yoga' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText(/enter your date of birth/i)).toBeInTheDocument()
    expect(screen.getByText(/choose female or male/i)).toBeInTheDocument()
    expect(await db.profile.count()).toBe(0)
    await user.type(screen.getByLabelText('Date of birth'), '1990-05-15')
    expect(await screen.findByText('Age: 36')).toBeInTheDocument()
  })

  it('a saved profile without them gets one short card on Home, and generating waits until they are given', async () => {
    await seed(WED)
    const p = (await db.profile.toArray())[0]
    await db.profile.put({ ...p, birthDate: undefined, sex: undefined, age: undefined })
    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByText(/a couple of details for your plan/i)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /generate workout/i })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText(/enter your date of birth/i)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Date of birth'), '1990-05-15')
    await user.click(within(screen.getByRole('group', { name: 'Sex' })).getByRole('button', { name: 'Female' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await db.profile.toArray())[0].sex).toBe('female'))
    await waitFor(() => expect(screen.queryByText(/a couple of details for your plan/i)).toBeNull())
    expect(screen.getByRole('button', { name: /generate workout/i })).toBeEnabled()
  })
})

describe('injured areas on Home', () => {
  it('can be set without opening Settings and the call avoids them', async () => {
    await seed(WED)
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByText(/injured or recovering/i))
    await user.click(screen.getByRole('button', { name: /^chest, injured area/i }))
    await waitFor(async () => expect((await db.profile.toArray())[0].injuredMuscles).toEqual(['chest']))
    expect(await screen.findByText(/injured or recovering\? \(1\)/i)).toBeInTheDocument()
  })
})

describe('confirmations and saving', () => {
  it('Settings shows a Save bar only while something is changed, and Discard puts it back', async () => {
    await seed(WED)
    window.history.replaceState(null, '', '#/settings')
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByText('Yoga and food'))
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull()
    const section = (await screen.findByText('Yoga and food')).closest('details') as HTMLElement
    const box = within(section).getByRole('checkbox', { name: /gentle next-day food guidance/i })
    const before = (box as HTMLInputElement).checked
    await user.click(box)
    expect(await screen.findByRole('button', { name: 'Save changes' })).toBeInTheDocument()
    expect((await db.profile.toArray())[0].nutritionGuidance).toBe(before) // nothing saved yet
    await user.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull()
    expect((within(section).getByRole('checkbox', { name: /gentle next-day food guidance/i }) as HTMLInputElement).checked).toBe(before)
  })

  it('an action asks OK or Cancel, and Cancel changes nothing', async () => {
    await seed(WED)
    window.history.replaceState(null, '', '#/settings')
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByText('Weekly schedule'))
    await user.click(await screen.findByRole('button', { name: 'Rebuild upcoming plan' }))
    const dlg = await screen.findByRole('dialog', { name: /rebuild the upcoming plan/i })
    await user.click(within(dlg).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /rebuild the upcoming plan/i })).toBeNull())
  })
})

describe('deleting a yoga session takes three steps', () => {
  it('needs the warning, the typed word and a separate final button', async () => {
    await seed(WED)
    const now = new Date().toISOString()
    const plan = { items: [], key: 'k', date: '2026-10-21', style: 'hatha', styleName: 'Hatha', level: 'beginner', location: 'home', props: [], restrictions: [], minutes: 20, cautions: [] }
    await db.yogaSessions.put({
      id: 'y1', date: '2026-10-21', style: 'hatha', styleName: 'Hatha', level: 'beginner', location: 'home', props: [], restrictions: [], plannedMinutes: 20,
      plan, planKey: 'k', completedItems: [], skippedItems: [], status: 'completed', durationSeconds: 0, startedAt: now, finishedAt: now, createdAt: now, updatedAt: now,
    } as never)
    window.history.replaceState(null, '', '#/yoga/session/y1')
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Delete this session' }))
    // Step 1: the warning. Cancel here keeps everything.
    let dlg = await screen.findByRole('dialog', { name: /step 1 of 3/i })
    await user.click(within(dlg).getByRole('button', { name: 'Continue' }))
    // Step 2: the word. Continue stays off until it is typed exactly.
    dlg = await screen.findByRole('dialog', { name: /step 2 of 3/i })
    expect(within(dlg).getByRole('button', { name: 'Continue' })).toBeDisabled()
    await user.type(within(dlg).getByLabelText(/type delete/i), 'delet')
    expect(within(dlg).getByRole('button', { name: 'Continue' })).toBeDisabled()
    await user.type(within(dlg).getByLabelText(/type delete/i), 'e{Enter}')
    expect(screen.queryByRole('dialog', { name: /step 3 of 3/i })).toBeNull() // Enter does not advance
    await user.click(within(dlg).getByRole('button', { name: 'Continue' }))
    // Step 3: a different, final button.
    dlg = await screen.findByRole('dialog', { name: /step 3 of 3/i })
    expect(await db.yogaSessions.count()).toBe(1)
    await user.click(within(dlg).getByRole('button', { name: 'Delete for good' }))
    await waitFor(async () => expect(await db.yogaSessions.count()).toBe(0))
  })

  it('cancelling at any step deletes nothing', async () => {
    await seed(WED)
    const now = new Date().toISOString()
    const plan = { items: [], key: 'k', date: '2026-10-21', style: 'hatha', styleName: 'Hatha', level: 'beginner', location: 'home', props: [], restrictions: [], minutes: 20, cautions: [] }
    await db.yogaSessions.put({
      id: 'y2', date: '2026-10-21', style: 'hatha', styleName: 'Hatha', level: 'beginner', location: 'home', props: [], restrictions: [], plannedMinutes: 20,
      plan, planKey: 'k', completedItems: [], skippedItems: [], status: 'completed', durationSeconds: 0, startedAt: now, finishedAt: now, createdAt: now, updatedAt: now,
    } as never)
    window.history.replaceState(null, '', '#/yoga/session/y2')
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Delete this session' }))
    await user.click(within(await screen.findByRole('dialog', { name: /step 1 of 3/i })).getByRole('button', { name: 'Continue' }))
    await user.click(within(await screen.findByRole('dialog', { name: /step 2 of 3/i })).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /of 3/i })).toBeNull())
    expect(await db.yogaSessions.count()).toBe(1)
  })
})
