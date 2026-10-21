import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { db, useDatabase } from './db/schema'
import { exportBackup } from './db/backup'
import { encryptText } from './db/crypto'
import { profileToForm, resetAllData, saveProfile, scheduledOn } from './db/repo'

const NOW = new Date(2026, 9, 21, 12, 0, 0) // Wednesday, a training day in the default plan
const TODAY = '2026-10-21'

async function seed(extra: Partial<ReturnType<typeof profileToForm>> = {}) {
  await resetAllData()
  await saveProfile(
    { ...profileToForm(), weightValue: '180', heightCm: '178', trainingLevel: 'intermediate', ...extra },
    { preferredLocation: 'gym', gymType: 'planet_fitness' },
    NOW,
  )
}

// A fresh database for every test. Live queries cache their results per database, so reusing one could show the
// previous test's data for a moment, which is a test artefact and never happens in the app.
let dbCounter = 0
beforeEach(async () => {
  useDatabase(`app-test-${++dbCounter}`)
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  window.history.replaceState(null, '', '#/home')
  await resetAllData()
})
afterEach(async () => {
  vi.useRealTimers()
  // Unmount first, let any last write finish, then close, so nothing leaks into the next test's database.
  cleanup()
  await new Promise((r) => setTimeout(r, 50))
  db.close()
})

const tab = async (name: string) => within(await screen.findByRole('navigation', { name: /main navigation/i })).getByRole('button', { name })

async function generateAndOpen(user: ReturnType<typeof userEvent.setup>, minutes = 45) {
  await user.click(await screen.findByRole('button', { name: new RegExp(`generate workout \\(${minutes} min\\)`, 'i') }))
  await screen.findByRole('button', { name: /start workout/i })
}

async function startWorkout(user: ReturnType<typeof userEvent.setup>, minutes = 30) {
  await screen.findByText(/today's focus/i)
  await user.click(screen.getByRole('button', { name: `${minutes} min` }))
  await generateAndOpen(user, minutes)
  await user.click(screen.getByRole('button', { name: /start workout/i }))
  await screen.findAllByLabelText('Set 1 weight')
}

describe('onboarding', () => {
  it('shows the welcome form first and explains why it asks', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeInTheDocument()
    expect(screen.getByText(/nothing leaves this phone/i)).toBeInTheDocument()
  })

  it('offers three training levels and defaults to Beginner', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome' })
    await user.click(screen.getByRole('button', { name: 'Workout' }))
    const group = screen.getByRole('radiogroup', { name: 'Training level' })
    expect(within(group).getAllByRole('radio')).toHaveLength(3)
    expect(within(group).getByRole('radio', { name: /beginner/i })).toBeChecked()
    expect(within(group).getByRole('radio', { name: /intermediate/i })).not.toBeChecked()
    expect(within(group).getByRole('radio', { name: /regular gym-goer/i })).not.toBeChecked()
  })

  it('rejects invalid values with understandable messages', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome' })
    await user.click(screen.getByRole('button', { name: 'Workout' }))
    for (const d of ['Mon', 'Wed', 'Fri']) await user.click(screen.getByRole('button', { name: d }))
    const dur = screen.getByLabelText(/usual workout length/i)
    await user.clear(dur)
    await user.type(dur, '5')
    await user.click(screen.getByText('Optional details'))
    await user.type(screen.getByLabelText('Age'), '3')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText(/pick at least one training day/i)).toBeInTheDocument()
    expect(screen.getByText(/between 15 and 180/i)).toBeInTheDocument()
    expect(screen.getByText(/between 13 and 100/i)).toBeInTheDocument()
    expect(await db.profile.count()).toBe(0)
  })

  it('a beginner must give height and weight before continuing', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome' })
    await user.click(screen.getByRole('button', { name: 'Workout' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText(/need your height/i)).toBeInTheDocument()
    expect(screen.getByText(/need your body weight/i)).toBeInTheDocument()
    expect(await db.profile.count()).toBe(0)
  })

  it('creates a profile with no network, confirms equipment, then lands on Home', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome' })
    await user.click(screen.getByRole('button', { name: 'Workout' }))
    await user.type(screen.getByLabelText(/nickname/i), 'Sam')
    await user.click(within(screen.getByRole('radiogroup', { name: 'Training level' })).getByRole('radio', { name: /intermediate/i }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('heading', { name: /confirm your equipment/i })).toBeInTheDocument()
    expect(await screen.findByLabelText('Weight machines')).toBeChecked()
    expect(screen.getByText(/planet fitness equipment applied automatically/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /looks right/i }))
    expect(await screen.findByRole('heading', { name: 'Hi, Sam' })).toBeInTheDocument()
    expect((await db.profile.toArray())[0].displayName).toBe('Sam')
  })

  it('can start with Home equipment instead of a gym', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome' })
    await user.click(screen.getByRole('button', { name: 'Workout' }))
    await user.click(within(screen.getByRole('radiogroup', { name: 'Training level' })).getByRole('radio', { name: /intermediate/i }))
    await user.selectOptions(screen.getByLabelText('Where do you train?'), 'home')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: /confirm your equipment/i })
    expect(await screen.findByLabelText('Weight machines')).not.toBeChecked()
    await user.click(screen.getByLabelText('Dumbbells'))
    await waitFor(async () => expect((await db.equipment.get('home'))?.items.dumbbell?.available).toBe(true))
  })

  it('requires a choice of Workout, Yoga, or both, and saves nothing until one is picked', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome' })
    expect(screen.getByRole('button', { name: 'Workout' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Yoga' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('radiogroup', { name: 'Training level' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText(/choose workout, yoga, or both/i)).toBeInTheDocument()
    expect(await db.profile.count()).toBe(0)
  })

  it('yoga only skips body basics and equipment and lands on a Yoga-first Home with no workout tabs', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome' })
    await user.click(screen.getByRole('button', { name: 'Yoga' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('button', { name: /plan a yoga session/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /confirm your equipment/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/training level/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/height and weight/i)).not.toBeInTheDocument()
    const nav = screen.getByRole('navigation')
    await waitFor(() => expect(within(nav).queryByText('Plan')).not.toBeInTheDocument())
    expect(within(nav).queryByText('Workout')).not.toBeInTheDocument()
    expect((await db.profile.toArray())[0].tracks).toEqual(['yoga'])
  })
})

describe('units (height and weight)', () => {
  it('keeps one canonical height when switching between ft/in and cm', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome' })
    await user.type(screen.getByLabelText('Height, feet'), '5')
    await user.type(screen.getByLabelText('Height, inches'), '10')
    await user.selectOptions(screen.getByLabelText('Height unit'), 'cm')
    expect(screen.getByLabelText('Height in centimetres')).toHaveValue('177.8')
    await user.selectOptions(screen.getByLabelText('Height unit'), 'ft-in')
    expect(screen.getByLabelText('Height, feet')).toHaveValue('5')
    expect(screen.getByLabelText('Height, inches')).toHaveValue('10')
  })

  it('has a kg/lb selector beside body weight that converts the number', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome' })
    const w = screen.getByLabelText('Body weight')
    await user.type(w, '180')
    await user.selectOptions(screen.getByLabelText('Body weight unit'), 'kg')
    expect(w).toHaveValue('81.6')
    await user.selectOptions(screen.getByLabelText('Body weight unit'), 'lb')
    expect(Number(w.getAttribute('value') ?? (w as HTMLInputElement).value)).toBeCloseTo(179.9, 0)
  })

  it('the page default unit moves a field that has no override, and leaves an overridden one alone', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome' })
    await user.type(screen.getByLabelText('Body weight'), '100')
    await user.click(within(screen.getByRole('group', { name: 'Weight units' })).getByRole('button', { name: 'kg' }))
    expect(screen.getByLabelText('Body weight unit')).toHaveValue('kg')
    expect(screen.getByLabelText('Body weight')).toHaveValue('45.4')
    // give the field its own unit (lb) while the page default stays kg: the field says so and keeps it
    await user.selectOptions(screen.getByLabelText('Body weight unit'), 'lb')
    expect(screen.getByText(/this field uses lb; the page default is kg/i)).toBeInTheDocument()
    expect(Number((screen.getByLabelText('Body weight') as HTMLInputElement).value)).toBeCloseTo(100, 0)
    await user.click(within(screen.getByRole('group', { name: 'Weight units' })).getByRole('button', { name: 'kg' }))
    expect(screen.getByLabelText('Body weight unit')).toHaveValue('lb')
  })
})

describe('navigation and banners', () => {
  it('opens all six tabs', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Today' })
    for (const [name, heading] of [['Plan', 'Weekly Plan'], ['Workout', 'Workout'], ['Food', 'Food'], ['Progress', 'Health & Fitness Progress'], ['Settings', 'Settings'], ['Home', 'Today']] as const) {
      await user.click(await tab(name))
      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    }
  })

  it('shows an offline indicator and hides it again', async () => {
    await seed()
    render(<App />)
    await screen.findByRole('heading', { name: 'Today' })
    act(() => { window.dispatchEvent(new Event('offline')) })
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument()
    act(() => { window.dispatchEvent(new Event('online')) })
    expect(screen.queryByText(/you are offline/i)).not.toBeInTheDocument()
  })

  it('pages that are not main tabs have a Back control that returns to the page you came from', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /plan a yoga session/i }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Yoga' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument() // a main tab has no Back
  })

  it('Back still works after a refresh, when there is no earlier page', async () => {
    await seed()
    window.history.replaceState(null, '', '#/yoga')
    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Yoga' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
  })

  it('keeps the page on a refresh because the page is in the address', async () => {
    await seed()
    window.history.replaceState(null, '', '#/food')
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Food' })).toBeInTheDocument()
  })
})

describe('plan', () => {
  it('shows training days, rest days and muscle coverage', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Plan'))
    expect(await screen.findByText('Wednesday')).toBeInTheDocument()
    expect(screen.getAllByText('Rest day').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText(/muscle coverage each week/i)).toBeInTheDocument()
  })
})

describe('home: level, duration, beginner gate', () => {
  it('shows 30/45/60/75/90 and Custom, and rejects a custom length that is too short', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    const group = await screen.findByRole('group', { name: 'Workout length' })
    for (const m of [30, 45, 60, 75, 90]) expect(within(group).getByRole('button', { name: `${m} min` })).toBeInTheDocument()
    await user.click(within(group).getByRole('button', { name: 'Custom' }))
    const box = screen.getByLabelText('Minutes')
    await user.clear(box)
    await user.type(box, '5')
    expect(await screen.findByRole('alert')).toHaveTextContent(/from 15 to 180/i)
    expect(screen.getByRole('button', { name: /generate workout/i })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /use 15 minutes/i }))
    expect(screen.getByRole('button', { name: /generate workout \(15 min\)/i })).toBeEnabled()
  })

  it('a beginner without height and weight is asked for them, and cannot generate until they are saved', async () => {
    await seed({ trainingLevel: 'beginner', heightCm: '', weightValue: '' })
    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByText(/one more thing for your beginner plan/i)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /generate workout/i })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /save height and weight/i }))
    expect(await screen.findByText('Enter your height.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Height, feet'), '5')
    await user.type(screen.getByLabelText('Height, inches'), '9')
    await user.type(screen.getByLabelText('Body weight'), '170')
    await user.click(screen.getByRole('button', { name: /save height and weight/i }))
    await waitFor(async () => expect((await db.profile.toArray())[0].heightCm).toBeCloseTo(175.3, 0))
    await waitFor(() => expect(screen.queryByText(/one more thing for your beginner plan/i)).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: /generate workout/i })).toBeEnabled()
  })

  it('changing the level asks what to do with upcoming workouts', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Change' }))
    const dlg = await screen.findByRole('dialog', { name: /change training level/i })
    await user.click(within(dlg).getByRole('radio', { name: /regular gym-goer/i }))
    expect(within(dlg).getByText(/workouts already planned/i)).toBeInTheDocument()
    await user.click(within(dlg).getByRole('button', { name: 'Apply' }))
    await waitFor(async () => expect((await db.profile.toArray())[0].trainingLevel).toBe('regular'))
  })
})

describe('workout flow', () => {
  it('generates, starts, logs a set, replaces an exercise, finishes, and shows history', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText(/today's focus/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '30 min' }))
    await generateAndOpen(user, 30)
    expect(screen.getByText(/\(estimate, you chose 30\)/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /start workout/i }))
    const first = (await screen.findAllByLabelText('Set 1 weight'))[0]
    expect(screen.getByText(/0 of \d+ sets done/)).toBeInTheDocument()

    await user.clear(first)
    await user.type(first, '55')
    const reps = screen.getAllByLabelText('Set 1 reps')[0]
    await user.clear(reps)
    await user.type(reps, '9')
    await user.click(screen.getAllByRole('button', { name: /mark set 1 done/i })[0])
    expect(await screen.findByRole('timer')).toHaveTextContent(/rest/i)
    await waitFor(async () => {
      const logs = (await db.setLogs.toArray()).filter((l) => l.completed)
      expect(logs).toHaveLength(1)
      expect(logs[0].actualWeight).toBe(55)
      expect(logs[0].actualReps).toBe(9)
      expect(logs[0].plannedRepMax).toBeGreaterThan(0)
    })
    expect(screen.getByText(/1 of \d+ sets done/)).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /set 1 done\. tap to undo/i })[0])
    await waitFor(async () => expect((await db.setLogs.toArray()).filter((l) => l.completed)).toHaveLength(0))
    await user.click(screen.getAllByRole('button', { name: /mark set 1 done/i })[0])

    // the last exercise has no logged sets, so it swaps straight away
    await user.click(screen.getAllByRole('button', { name: 'Replace' }).at(-1)!)
    const dlg = await screen.findByRole('dialog', { name: /replace exercise/i })
    const alts = within(dlg).getAllByRole('button').filter((b) => b.className.includes('alt'))
    expect(alts.length).toBeGreaterThan(0)
    await user.click(alts[0])
    expect(await screen.findByText(/^Replaced /)).toBeInTheDocument()
    const session = (await db.sessions.toArray())[0]
    const swapped = session.actualExercises.find((a) => a.replacedFromId)!
    expect(swapped.replacedFromId).toBe(session.plannedExercises.find((p) => p.slotId === swapped.slotId)!.exerciseId)
    expect(session.actualExercises.filter((a) => a.replacedFromId)).toHaveLength(1)

    await user.click(screen.getAllByRole('button', { name: 'Finish workout' })[0])
    const confirm = await screen.findByRole('dialog', { name: /finish workout/i })
    expect(within(confirm).getByText(/not marked done will be saved as not completed/i)).toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: /save and finish/i }))
    expect(await screen.findByRole('heading', { name: 'Workout saved' })).toBeInTheDocument()
    expect(screen.getByText(/partly completed/i)).toBeInTheDocument()
    expect(screen.getByText(/too short to estimate calories/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Done' }))

    await user.click(await tab('Progress'))
    expect(await screen.findByRole('heading', { name: 'Workouts per week' })).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: new RegExp(session.title, 'i') }))
    expect(await screen.findByText(/^Saved workout$/)).toBeInTheDocument()
    expect(screen.getAllByText(/Not done|reps/).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(await screen.findByRole('heading', { name: 'Workouts per week' })).toBeInTheDocument()
  })

  it('has a Finish button at the top and at the bottom, and both do the same thing once', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await startWorkout(user)
    const buttons = screen.getAllByRole('button', { name: 'Finish workout' })
    expect(buttons).toHaveLength(2)
    // both open the same confirmation
    await user.click(buttons[1])
    const dlg = await screen.findByRole('dialog', { name: /finish workout/i })
    await user.click(within(dlg).getByRole('button', { name: /save and finish/i }))
    await screen.findByRole('heading', { name: /workout (saved|discarded)/i })
    expect(await db.sessions.count()).toBe(1)
  })

  describe('per-exercise equipment and safe replace (US-064, US-065)', () => {
    /** The first exercise card that offers at least one other usable equipment choice. */
    const swappable = () => {
      for (const sel of screen.getAllByLabelText(/ equipment$/i) as HTMLSelectElement[]) {
        const other = [...sel.options].find((o) => !o.disabled && o.value !== sel.value)
        if (other) return { sel, other, card: sel.closest('section') as HTMLElement }
      }
      throw new Error('no exercise offers another equipment choice')
    }

    it('changes only the chosen exercise, shows why some equipment is unavailable, and persists', async () => {
      await seed()
      const user = userEvent.setup()
      const first = render(<App />)
      await startWorkout(user)
      const before = (await db.sessions.toArray())[0].actualExercises.map((a) => a.exerciseId)
      const { sel, other, card } = swappable()
      await user.selectOptions(sel, other.value)
      await waitFor(async () => expect((await db.sessions.toArray())[0].actualExercises.filter((a) => a.replacedFromId)).toHaveLength(1))
      const after = (await db.sessions.toArray())[0].actualExercises.map((a) => a.exerciseId)
      expect(after.filter((id, i) => id !== before[i])).toHaveLength(1)
      expect(await screen.findByText(/^Swapped /)).toBeInTheDocument()
      expect(within(card).queryByText(/why are some options unavailable/i) ?? screen.getAllByText(/why are some options unavailable/i)[0]).toBeTruthy()
      first.unmount()
      window.history.replaceState(null, '', '#/home')
      render(<App />)
      await userEvent.setup().click(await screen.findByRole('button', { name: /resume workout/i }))
      await screen.findAllByLabelText('Set 1 weight')
      expect((await db.sessions.toArray())[0].actualExercises.map((a) => a.exerciseId)).toEqual(after)
    })

    it('keeps bodyweight as a choice and never disables it because other equipment is selected', async () => {
      await seed()
      const user = userEvent.setup()
      render(<App />)
      await startWorkout(user)
      const selects = screen.getAllByLabelText(/ equipment$/i) as HTMLSelectElement[]
      const withBodyweight = selects.find((s) => [...s.options].some((o) => o.value === 'bodyweight'))
      expect(withBodyweight).toBeTruthy()
      const o = [...withBodyweight!.options].find((x) => x.value === 'bodyweight')!
      expect(o.disabled).toBe(false)
    })

    it('asks before touching logged sets: cancel changes nothing, reset clears only that exercise, undo restores', async () => {
      await seed()
      const user = userEvent.setup()
      render(<App />)
      await startWorkout(user)
      const { sel, other, card } = swappable()
      await user.click(within(card).getAllByRole('button', { name: /mark set 1 done/i })[0])
      await waitFor(async () => expect((await db.setLogs.toArray()).filter((l) => l.completed)).toHaveLength(1))
      const original = (await db.sessions.toArray())[0].actualExercises.map((a) => a.exerciseId)

      await user.selectOptions(sel, other.value)
      let dlg = await screen.findByRole('dialog', { name: /you already logged sets/i })
      await user.click(within(dlg).getByRole('button', { name: /cancel, change nothing/i }))
      expect((await db.sessions.toArray())[0].actualExercises.map((a) => a.exerciseId)).toEqual(original)

      await user.selectOptions(sel, other.value)
      dlg = await screen.findByRole('dialog', { name: /you already logged sets/i })
      await user.click(within(dlg).getByRole('button', { name: /reset this exercise's sets and switch/i }))
      await waitFor(async () => expect((await db.setLogs.toArray()).filter((l) => l.completed)).toHaveLength(0))
      expect((await db.sessions.toArray())[0].actualExercises.filter((a) => a.replacedFromId)).toHaveLength(1)

      await user.click(await screen.findByRole('button', { name: 'Undo swap' }))
      await waitFor(async () => expect((await db.sessions.toArray())[0].actualExercises.map((a) => a.exerciseId)).toEqual(original))
      expect((await db.setLogs.toArray()).filter((l) => l.completed)).toHaveLength(1) // the reset set is back
    })

    it('shows an estimated session length that follows the session', async () => {
      await seed()
      const user = userEvent.setup()
      render(<App />)
      await startWorkout(user, 30)
      const line = await screen.findByText(/estimated session length: about \d+ min \(you chose 30\)/i)
      expect(line).toBeInTheDocument()
    })
  })

  it('shows the rest timer with pause, resume, +15s and skip', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await startWorkout(user)
    await user.click(screen.getAllByRole('button', { name: /mark set 1 done/i })[0])
    const timer = await screen.findByRole('timer', { name: /rest timer/i })
    expect(within(timer).getByRole('button', { name: '+15s' })).toBeInTheDocument()
    await user.click(within(timer).getByRole('button', { name: 'Pause' }))
    expect(timer).toHaveTextContent(/rest paused/i)
    await user.click(within(timer).getByRole('button', { name: 'Resume' }))
    expect(timer).not.toHaveTextContent(/paused/i)
    await user.click(within(timer).getByRole('button', { name: 'Skip' }))
    expect(screen.queryByRole('timer', { name: /rest timer/i })).not.toBeInTheDocument()
  })

  it('a workout in progress survives closing and reopening the app', async () => {
    await seed()
    const user = userEvent.setup()
    const first = render(<App />)
    await generateAndOpen(user)
    await user.click(screen.getByRole('button', { name: /start workout/i }))
    await user.click((await screen.findAllByRole('button', { name: /mark set 1 done/i }))[0])
    await waitFor(async () => expect((await db.setLogs.toArray()).some((l) => l.completed)).toBe(true))
    first.unmount()
    window.history.replaceState(null, '', '#/home')

    render(<App />)
    expect(await screen.findByText(/workout in progress/i)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: /resume workout/i }))
    expect(await screen.findByText(/1 of \d+ sets done/)).toBeInTheDocument()
  })

  it('shows a rest-day message and lets the user choose to train anyway, including cardio only', async () => {
    await seed({ trainingDays: [0, 4] })
    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByText(/today is a rest day/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /train anyway/i }))
    expect(screen.getByRole('button', { name: 'Cardio only' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Lower body' }))
    expect(await screen.findByRole('button', { name: /start workout/i })).toBeInTheDocument()
  })
})

describe('equipment', () => {
  it('Bodyweight is an ordinary checkbox that can be unticked and ticked again', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Settings'))
    // Planet Fitness uses its maintained list: Bodyweight is on the list and is not greyed out.
    const bw = await screen.findByLabelText('Bodyweight / no equipment')
    expect(bw).toBeEnabled()
    expect(bw).toBeChecked()
    await user.click(bw)
    await waitFor(async () => expect((await db.equipment.get('gym'))?.excluded).toContain('bodyweight'))
    expect(screen.getByLabelText('Bodyweight / no equipment')).not.toBeChecked()
    await user.click(screen.getByLabelText('Bodyweight / no equipment'))
    await waitFor(async () => expect((await db.equipment.get('gym'))?.excluded).not.toContain('bodyweight'))
  })

  it('Planet Fitness applies its equipment automatically and lets you exclude what your club lacks', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Settings'))
    expect(await screen.findByText(/planet fitness equipment applied automatically/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Treadmill')).toBeChecked()
    await user.click(screen.getByLabelText('Treadmill'))
    await waitFor(async () => expect((await db.equipment.get('gym'))?.excluded).toContain('treadmill'))
    expect(screen.getByText(/applied now:/i)).not.toHaveTextContent(/treadmill/i)
  })

  it('switching the gym type to Planet Fitness refreshes the equipment', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Settings'))
    await user.click(within(await screen.findByRole('group', { name: 'Which gym' })).getByRole('button', { name: 'Another gym' }))
    await waitFor(async () => expect((await db.equipment.get('gym'))?.preset).toBeUndefined())
    await user.click(within(screen.getByRole('group', { name: 'Which gym' })).getByRole('button', { name: 'Planet Fitness' }))
    await waitFor(async () => expect((await db.equipment.get('gym'))?.preset).toBe('planet_fitness'))
  })
})

describe('reopen and reset', () => {
  async function finishedToday(user: ReturnType<typeof userEvent.setup>) {
    await startWorkout(user)
    await user.click((await screen.findAllByRole('button', { name: /mark set 1 done/i }))[0])
    await user.click(screen.getAllByRole('button', { name: 'Finish workout' })[0])
    await user.click(within(await screen.findByRole('dialog', { name: /finish workout/i })).getByRole('button', { name: /save and finish/i }))
    await screen.findByRole('heading', { name: 'Workout saved' })
    return (await db.sessions.toArray())[0]
  }

  it('resumes a finished workout as the same session, with no duplicate and no Discard button', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    const s = await finishedToday(user)
    await user.click(screen.getByRole('button', { name: /review or edit this workout/i }))
    await user.click(await screen.findByRole('button', { name: 'Resume workout' }))
    expect(await screen.findByText(/you reopened this workout/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Discard' })).not.toBeInTheDocument()
    expect(await db.sessions.count()).toBe(1)
    expect((await db.sessions.toArray())[0].id).toBe(s.id)
    expect((await db.sessions.toArray())[0].status).toBe('in_progress')
  })

  it('lets you edit a saved workout and recalculates its status', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await finishedToday(user)
    await user.click(screen.getByRole('button', { name: /review or edit this workout/i }))
    await user.click(await screen.findByRole('button', { name: 'Edit sets' }))
    const reps = (await screen.findAllByLabelText(/set 1 reps/i))[1]
    await user.clear(reps)
    await user.type(reps, '12')
    await user.click(screen.getAllByRole('button', { name: /mark set 1 done/i })[0])
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText(/status was recalculated/i)).toBeInTheDocument()
    expect((await db.setLogs.toArray()).filter((l) => l.completed).length).toBeGreaterThanOrEqual(2)
  })

  it('resetting a day needs three separate confirmations and touches nothing else', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    const s = await finishedToday(user)
    await db.foodLog.add({ id: 'keep-me', date: TODAY, mealCategory: 'lunch', name: 'Rice', provider: 'x', providerId: 'x', source: 'x', state: 'cooked', portionValue: 1, portionUnit: 'g', kcal: 1, basis: { basis: 'g', kcalPer100: 1, unitSize: {} }, createdAt: 'x', updatedAt: 'x' } as never)
    await user.click(screen.getByRole('button', { name: /review or edit this workout/i }))
    await user.click(await screen.findByRole('button', { name: /reset today/i }))

    // step 1: review, checkbox needed
    let dlg = await screen.findByRole('dialog', { name: /step 1 of 3/i })
    expect(within(dlg).getByRole('button', { name: 'Continue' })).toBeDisabled()
    await user.click(within(dlg).getByRole('checkbox'))
    await user.click(within(dlg).getByRole('button', { name: 'Continue' }))

    // step 2: type the phrase
    dlg = await screen.findByRole('dialog', { name: /step 2 of 3/i })
    expect(within(dlg).getByRole('button', { name: 'Continue' })).toBeDisabled()
    await user.type(within(dlg).getByLabelText(/confirmation phrase/i), "reset today’s workout")
    await user.click(within(dlg).getByRole('button', { name: 'Continue' }))

    // step 3: separate final button; nothing has changed yet
    expect(await db.sessions.count()).toBe(1)
    dlg = await screen.findByRole('dialog', { name: /step 3 of 3/i })
    await user.click(within(dlg).getByRole('button', { name: /reset this day now/i }))
    await waitFor(async () => expect(await db.sessions.count()).toBe(0))
    expect(await db.setLogs.where('sessionId').equals(s.id).count()).toBe(0)
    expect(await db.profile.count()).toBe(1)
    expect(await db.foodLog.count()).toBe(1)
    expect((await scheduledOn(TODAY))?.status).toBe('planned')
  })

  it('cancelling at any step changes nothing', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await finishedToday(user)
    await user.click(screen.getByRole('button', { name: /review or edit this workout/i }))
    await user.click(await screen.findByRole('button', { name: /reset today/i }))
    await user.click(within(await screen.findByRole('dialog', { name: /step 1 of 3/i })).getByRole('button', { name: 'Cancel' }))
    expect(await db.sessions.count()).toBe(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('food', () => {
  it('starts with an empty state, then logs raw and cooked rice with different calories', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Food'))
    expect(await screen.findByText(/nothing logged yet/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start logging' }))
    for (const m of ['Breakfast', 'Lunch', 'Dinner', 'Evening snacks', 'Other snacks & extras']) {
      expect((await screen.findAllByText(new RegExp(m, 'i'))).length).toBeGreaterThan(0)
    }
    await user.click(screen.getByRole('button', { name: /add to lunch/i }))
    await user.type(await screen.findByLabelText('Search foods'), 'white rice')
    const rows = await screen.findAllByRole('button', { name: /rice/i })
    expect(rows.some((r) => /\(dry \/ raw\)/i.test(r.textContent ?? ''))).toBe(true)
    expect(rows.some((r) => /\(cooked\)/i.test(r.textContent ?? ''))).toBe(true)
    const cooked = rows.find((r) => /\(cooked\)/i.test(r.textContent ?? '') && /white/i.test(r.textContent ?? ''))!
    await user.click(cooked)
    await user.click(screen.getByRole('button', { name: /add to lunch/i }))
    await waitFor(async () => expect(await db.foodLog.count()).toBe(1))
    const entry = (await db.foodLog.toArray())[0]
    expect(entry.state).toBe('cooked')
    expect(entry.mealCategory).toBe('lunch')
    expect(await screen.findByRole('heading', { level: 1, name: 'Food' })).toBeInTheDocument()
    expect(screen.getByText(/1 entry/)).toBeInTheDocument()
  })

  it('deleting an entry asks first', async () => {
    await seed()
    await db.settings.put({ key: 'food.intro', value: true })
    await db.foodLog.add({ id: 'e1', date: TODAY, mealCategory: 'breakfast', name: 'Banana', provider: 'local', providerId: 'banana', source: 's', state: 'ready', portionValue: 1, portionUnit: 'piece', kcal: 105, basis: { basis: 'g', kcalPer100: 89, unitSize: { piece: 118 } }, createdAt: 'x', updatedAt: 'x' } as never)
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Food'))
    await user.click(await screen.findByRole('button', { name: /delete banana/i }))
    const dlg = await screen.findByRole('dialog', { name: /delete this entry/i })
    await user.click(within(dlg).getByRole('button', { name: 'Cancel' }))
    expect(await db.foodLog.count()).toBe(1)
    await user.click(screen.getByRole('button', { name: /delete banana/i }))
    await user.click(within(await screen.findByRole('dialog', { name: /delete this entry/i })).getByRole('button', { name: 'Delete' }))
    await waitFor(async () => expect(await db.foodLog.count()).toBe(0))
  })

  it('online search is off by default and says what it sends when turned on', async () => {
    await seed()
    await db.settings.put({ key: 'food.intro', value: true })
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Food'))
    const sw = await screen.findByRole('switch', { name: /search packaged foods online/i })
    expect(sw).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText(/sent to world\.openfoodfacts\.org/i)).toBeInTheDocument()
    await user.click(sw)
    await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'true'))
    await user.click(sw)
    await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'false'))
  })
})

describe('yoga', () => {
  it('asks for a yoga level first, then builds a plan, runs it and saves history', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /plan a yoga session/i }))
    expect(await screen.findByText(/what is your yoga level/i)).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /beginner/i }))
    await user.click(await screen.findByRole('button', { name: /show my yoga plan/i }))
    expect(await screen.findByRole('button', { name: /start this session/i })).toBeInTheDocument()
    expect(screen.getAllByRole('note').length).toBeGreaterThan(0) // safety notes stay visible
    await user.click(screen.getByRole('button', { name: /start this session/i }))
    await screen.findAllByRole('button', { name: /mark done/i })
    await user.click(screen.getAllByRole('button', { name: /mark done/i })[0])
    await user.click(screen.getAllByRole('button', { name: 'Finish session' })[0])
    await waitFor(async () => expect((await db.yogaSessions.toArray())[0].status).toBe('partial'))
    expect(await db.yogaSessions.count()).toBe(1)
  })

  it('the 13 styles are all offered', async () => {
    await seed()
    await db.profile.toCollection().modify({ yogaLevel: 'beginner' })
    render(<App />)
    window.history.replaceState(null, '', '#/yoga')
    window.dispatchEvent(new Event('hashchange'))
    const select = await screen.findByLabelText('Yoga style')
    expect(within(select).getAllByRole('option')).toHaveLength(13)
  })

  it('filters styles by intent and offers an explicit No props choice', async () => {
    await seed()
    await db.profile.toCollection().modify({ yogaLevel: 'beginner' })
    const user = userEvent.setup()
    render(<App />)
    window.history.replaceState(null, '', '#/yoga')
    window.dispatchEvent(new Event('hashchange'))
    const select = await screen.findByLabelText('Yoga style')
    await user.click(screen.getByRole('button', { name: 'Relaxation' }))
    const count = within(select).getAllByRole('option').length
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThan(13)
    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(within(select).getAllByRole('option')).toHaveLength(13)
    await user.click(screen.getByRole('button', { name: 'Blocks' }))
    await user.click(screen.getByRole('button', { name: 'No props' }))
    expect(screen.getByRole('button', { name: 'No props' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Blocks' })).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('settings', () => {
  it('switches location and edits equipment per location', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Settings'))
    await user.click(within(await screen.findByRole('group', { name: 'Training location' })).getByRole('button', { name: 'Home' }))
    expect((await db.profile.toArray())[0].preferredLocation).toBe('home')
    await user.click(screen.getByRole('button', { name: 'Home list' }))
    await user.click(await screen.findByLabelText('Dumbbells'))
    await waitFor(async () => expect((await db.equipment.get('home'))?.items.dumbbell?.available).toBe(true))
    expect((await db.equipment.get('gym'))?.preset).toBe('planet_fitness') // gym list untouched
  })

  it('excludes and un-excludes an exercise', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Settings'))
    await user.type(await screen.findByLabelText(/find an exercise to exclude/i), 'squat')
    const boxes = await screen.findAllByRole('checkbox', { name: /squat/i })
    await user.click(boxes[0])
    await waitFor(async () => expect((await db.profile.toArray())[0].excludedExerciseIds).toHaveLength(1))
    await user.click(await screen.findByRole('button', { name: 'Remove' }))
    await waitFor(async () => expect((await db.profile.toArray())[0].excludedExerciseIds).toHaveLength(0))
  })

  it('is honest about Apple Health', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Settings'))
    expect(await screen.findByText(/apple health is not connected/i)).toBeInTheDocument()
  })

  async function readBlob(blob: Blob): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(String(r.result))
      r.onerror = () => rej(r.error)
      r.readAsText(blob)
    })
  }

  it('offers an encrypted export by default, needs a matching password, and clears the password afterwards', async () => {
    await seed()
    await db.profile.toCollection().modify({ displayName: 'Sam Private' })
    let blob: Blob | null = null
    URL.createObjectURL = vi.fn((b: Blob) => { blob = b; return 'blob:x' })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Settings'))
    expect(await screen.findByRole('radio', { name: /encrypted export \(recommended\)/i })).toBeChecked()
    const go = screen.getByRole('button', { name: 'Export encrypted backup' })
    expect(go).toBeDisabled()
    await user.type(screen.getByLabelText(/^password \(at least 8/i), 'correct horse')
    await user.type(screen.getByLabelText(/type the password again/i), 'different one')
    expect(go).toBeDisabled()
    expect(screen.getByText(/do not match/i)).toBeInTheDocument()
    await user.clear(screen.getByLabelText(/type the password again/i))
    await user.type(screen.getByLabelText(/type the password again/i), 'correct horse')
    expect(go).toBeEnabled()
    await user.click(go)
    expect(await screen.findByText(/and encrypted\. Keep the password/i)).toBeInTheDocument()
    const text = await readBlob(blob as unknown as Blob)
    expect(JSON.parse(text).format).toBe('lift-encrypted')
    expect(text).not.toContain('Sam Private')
    expect(text).not.toContain('correct horse')
    expect(screen.getByLabelText(/^password \(at least 8/i)).toHaveValue('')
  }, 30000)

  it('lets you choose categories, requires at least one, and exports only those', async () => {
    await seed()
    await db.foodLog.add({ id: 'f', date: '2026-10-20', mealCategory: 'lunch', name: 'Rice', provider: 'x', providerId: 'x', source: 'x', state: 'ready', portionValue: 1, portionUnit: 'g', kcal: 100, basis: { basis: 'g', kcalPer100: 1, unitSize: {} }, createdAt: 'x', updatedAt: 'x' } as never)
    let blob: Blob | null = null
    URL.createObjectURL = vi.fn((b: Blob) => { blob = b; return 'blob:x' })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Settings'))
    expect(await screen.findByRole('checkbox', { name: /food log/i })).not.toBeChecked()
    for (const n of [/profile, equipment/i, /workout plans/i, /body weight entries/i, /yoga sessions/i]) await user.click(screen.getByRole('checkbox', { name: n }))
    expect(screen.getByText(/choose at least one thing/i)).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /plain file/i }))
    expect(screen.getByRole('button', { name: /export plain backup/i })).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /food log/i }))
    expect(screen.getByText(/this file will include: food log\./i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /export plain backup/i }))
    await user.click(within(await screen.findByRole('dialog', { name: /without a password/i })).getByRole('button', { name: /export without a password/i }))
    await waitFor(() => expect(blob).not.toBeNull())
    const file = JSON.parse(await readBlob(blob as unknown as Blob))
    expect(file.includes).toEqual(['food'])
    expect(file.data.foodLog).toHaveLength(1)
    expect(file.data.profile).toHaveLength(0)
  })

  it('shows a plain-export warning and exports only after confirming', async () => {
    await seed()
    let blob: Blob | null = null
    URL.createObjectURL = vi.fn((b: Blob) => { blob = b; return 'blob:x' })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Settings'))
    await user.click(await screen.findByRole('radio', { name: /plain file/i }))
    expect(screen.getByText(/readable by anyone who gets the file/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /export plain backup/i }))
    const dlg = await screen.findByRole('dialog', { name: /without a password/i })
    expect(blob).toBeNull()
    await user.click(within(dlg).getByRole('button', { name: 'Cancel' }))
    expect(blob).toBeNull()
    await user.click(screen.getByRole('button', { name: /export plain backup/i }))
    await user.click(within(await screen.findByRole('dialog', { name: /without a password/i })).getByRole('button', { name: /export without a password/i }))
    await waitFor(() => expect(blob).not.toBeNull())
    expect(JSON.parse(await readBlob(blob as unknown as Blob)).format).toBe('lift-backup')
  })

  it('previews an import without changing anything, then merges and reports counts', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Settings'))
    const input = await screen.findByLabelText(/import data from a backup file/i)
    await user.upload(input, new File(['not json'], 'bad.json', { type: 'application/json' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/not valid json/i)

    await db.yogaSessions.add({ id: 'y1', date: '2026-10-20', style: 'hatha', status: 'completed', durationSeconds: 60 } as never)
    const good = JSON.stringify(await exportBackup())
    await db.yogaSessions.clear()
    const before = { sessions: await db.sessions.count(), yoga: await db.yogaSessions.count() }
    await user.upload(input, new File([good], 'good.json', { type: 'application/json' }))
    const preview = await screen.findByRole('region', { name: /preview of the backup file/i })
    expect(within(preview).getByText(/nothing has been imported yet/i)).toBeInTheDocument()
    expect(within(preview).getByText(/1 yoga sessions/)).toBeInTheDocument()
    expect(within(preview).getByText(/already on this device: 0 workouts, 0 yoga sessions/i)).toBeInTheDocument()
    expect(await db.yogaSessions.count()).toBe(before.yoga) // preview wrote nothing

    await user.click(within(preview).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('region', { name: /preview of the backup file/i })).not.toBeInTheDocument()
    expect(await db.yogaSessions.count()).toBe(0)

    await user.upload(input, new File([good], 'good.json', { type: 'application/json' }))
    await user.click(await screen.findByRole('button', { name: /merge into this device/i }))
    await user.click(within(await screen.findByRole('dialog', { name: /merge this backup/i })).getByRole('button', { name: 'Merge' }))
    const result = await screen.findByRole('status', { name: /import result/i })
    expect(result).toHaveTextContent(/Added: \d+/)
    expect(result).toHaveTextContent(/Failed: 0/)
    expect(await db.yogaSessions.count()).toBe(1)
    expect(await db.sessions.count()).toBe(before.sessions)
  })

  it('asks for the password of an encrypted file, rejects a wrong one, and never keeps it', async () => {
    await seed()
    const file = JSON.stringify(await encryptText(JSON.stringify(await exportBackup()), 'right password', { iterations: 100_000 }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Settings'))
    const input = await screen.findByLabelText(/import data from a backup file/i)
    await user.upload(input, new File([file], 'enc.json', { type: 'application/json' }))
    expect(await screen.findByText(/this backup is password-protected/i)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /preview of the backup file/i })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText(/password for enc\.json/i), 'wrong password')
    await user.click(screen.getByRole('button', { name: 'Open file' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/wrong password, or the file was changed/i)
    expect(screen.queryByRole('region', { name: /preview of the backup file/i })).not.toBeInTheDocument()
    await user.clear(screen.getByLabelText(/password for enc\.json/i))
    await user.type(screen.getByLabelText(/password for enc\.json/i), 'right password')
    await user.click(screen.getByRole('button', { name: 'Open file' }))
    expect(await screen.findByRole('region', { name: /preview of the backup file/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/password for enc\.json/i)).not.toBeInTheDocument()
    for (const store of [window.localStorage, window.sessionStorage]) expect(JSON.stringify({ ...store })).not.toContain('right password')
  }, 30000)

  it('replace is behind its own warning, a checkbox and a typed phrase', async () => {
    await seed()
    const good = JSON.stringify(await exportBackup())
    await db.yogaSessions.add({ id: 'local-only', date: '2026-10-01', style: 'yin', status: 'completed', durationSeconds: 1 } as never)
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Settings'))
    await user.upload(await screen.findByLabelText(/import data from a backup file/i), new File([good], 'good.json', { type: 'application/json' }))
    await screen.findByRole('region', { name: /preview of the backup file/i })
    await user.click(screen.getByText(/replace instead/i))
    await user.click(screen.getByRole('button', { name: /replace this device's data/i }))
    const dlg = await screen.findByRole('dialog', { name: /replace the data on this device/i })
    const go = within(dlg).getByRole('button', { name: /erase and restore/i })
    expect(go).toBeDisabled()
    await user.click(within(dlg).getByRole('checkbox'))
    expect(go).toBeDisabled()
    await user.type(within(dlg).getByLabelText(/type replace my data/i), 'REPLACE MY DATA')
    expect(go).toBeEnabled()
    await user.click(go)
    await waitFor(async () => expect(await db.yogaSessions.count()).toBe(0))
  })

  describe('delete all data', () => {
    const openStep1 = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(await screen.findByRole('button', { name: /delete all data on this device\.\.\./i }))
      return screen.findByRole('dialog', { name: /step 1 of 3/i })
    }
    const toStep3 = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(within(await openStep1(user)).getByRole('button', { name: /i understand, continue/i }))
      const step2 = await screen.findByRole('dialog', { name: /step 2 of 3/i })
      await user.type(within(step2).getByLabelText(/confirmation phrase/i), 'DELETE MY DATA')
      await user.click(within(step2).getByRole('button', { name: 'Continue' }))
      return screen.findByRole('dialog', { name: /step 3 of 3/i })
    }
    const answerOf = (dlg: HTMLElement) => {
      const q = within(dlg).getByLabelText(/what is/i)
      const text = (dlg.querySelector(`label[for="${q.id}"]`) as HTMLElement).textContent ?? ''
      const m = /(\d+) ([+\-×]) (\d+)/.exec(text)!
      const [a, op, b] = [Number(m[1]), m[2], Number(m[3])]
      return String(op === '+' ? a + b : op === '-' ? a - b : a * b)
    }

    it('lists what will be deleted and can be cancelled at every step', async () => {
      await seed()
      const user = userEvent.setup()
      render(<App />)
      await user.click(await tab('Settings'))
      const s1 = await openStep1(user)
      expect(within(s1).getByText(/permanent on this device/i)).toBeInTheDocument()
      expect(within(s1).getByText(/yoga sessions/i)).toBeInTheDocument()
      expect(within(s1).getByText(/food log/i)).toBeInTheDocument()
      await user.click(within(s1).getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      await user.click(within(await openStep1(user)).getByRole('button', { name: /i understand, continue/i }))
      const s2 = await screen.findByRole('dialog', { name: /step 2 of 3/i })
      await user.click(within(s2).getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      const s3 = await toStep3(user)
      await user.click(within(s3).getByRole('button', { name: /keep my data/i }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(await db.profile.count()).toBe(1)
    })

    it('cannot be bypassed by a wrong phrase, a wrong answer, or the Enter key, and a reopened flow starts over', async () => {
      await seed()
      const user = userEvent.setup()
      render(<App />)
      await user.click(await tab('Settings'))
      await user.click(within(await openStep1(user)).getByRole('button', { name: /i understand, continue/i }))
      const s2 = await screen.findByRole('dialog', { name: /step 2 of 3/i })
      const phrase = within(s2).getByLabelText(/confirmation phrase/i)
      expect(within(s2).getByRole('button', { name: 'Continue' })).toBeDisabled()
      await user.type(phrase, 'delete my data{Enter}') // wrong case, and Enter
      expect(within(s2).getByRole('button', { name: 'Continue' })).toBeDisabled()
      expect(screen.queryByRole('dialog', { name: /step 3 of 3/i })).not.toBeInTheDocument()
      await user.clear(phrase)
      await user.type(phrase, 'DELETE MY DATA{Enter}')
      expect(screen.queryByRole('dialog', { name: /step 3 of 3/i })).not.toBeInTheDocument() // Enter does not advance
      await user.click(within(s2).getByRole('button', { name: 'Continue' }))

      const s3 = await screen.findByRole('dialog', { name: /step 3 of 3/i })
      const final = within(s3).getByRole('button', { name: /delete everything permanently/i })
      expect(final).toBeDisabled()
      const box = within(s3).getByLabelText(/what is/i)
      await user.type(box, `${Number(answerOf(s3)) + 1}{Enter}`)
      expect(final).toBeDisabled()
      expect(await db.profile.count()).toBe(1)
      await user.clear(box)
      await user.type(box, `${answerOf(s3)}{Enter}`)
      expect(final).toBeEnabled()
      expect(await db.profile.count()).toBe(1) // Enter did not delete

      // cancel, then reopen: nothing from the earlier attempt carries over
      await user.click(within(s3).getByRole('button', { name: /keep my data/i }))
      await user.click(within(await openStep1(user)).getByRole('button', { name: /i understand, continue/i }))
      expect(within(await screen.findByRole('dialog', { name: /step 2 of 3/i })).getByLabelText(/confirmation phrase/i)).toHaveValue('')
      expect(await db.profile.count()).toBe(1)
    })

    it('deletes once, even on a double click, then shows the first-run setup with a completion message', async () => {
      await seed()
      const user = userEvent.setup()
      render(<App />)
      await user.click(await tab('Settings'))
      const s3 = await toStep3(user)
      await user.type(within(s3).getByLabelText(/what is/i), answerOf(s3))
      await user.dblClick(within(s3).getByRole('button', { name: /delete everything permanently/i }))
      expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeInTheDocument()
      expect(await screen.findByText(/all data on this device was deleted/i)).toBeInTheDocument()
      for (const t of db.tables) expect(await t.count()).toBe(0)
    })

    it('reports a failure honestly, keeps the data, and can be retried', async () => {
      await seed()
      const proto = Object.getPrototypeOf(db.foodLog) as { clear: (this: { name: string }) => Promise<void> }
      const real = proto.clear
      const spy = vi.spyOn(proto, 'clear').mockImplementation(function (this: { name: string }) {
        return this.name === 'foodLog' ? Promise.reject(new Error('disk full')) : real.call(this)
      })
      const user = userEvent.setup()
      render(<App />)
      await user.click(await tab('Settings'))
      const s3 = await toStep3(user)
      await user.type(within(s3).getByLabelText(/what is/i), answerOf(s3))
      await user.click(within(s3).getByRole('button', { name: /delete everything permanently/i }))
      expect(await within(s3).findByRole('alert')).toHaveTextContent(/did not finish/i)
      expect(screen.queryByText(/all data on this device was deleted/i)).not.toBeInTheDocument()
      expect(await db.profile.count()).toBe(1)

      spy.mockRestore()
      await user.click(within(s3).getByRole('button', { name: /try again/i }))
      await user.type(within(s3).getByLabelText(/what is/i), answerOf(s3))
      await user.click(within(s3).getByRole('button', { name: /delete everything permanently/i }))
      expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeInTheDocument()
      expect(await db.profile.count()).toBe(0)
    })
  })
})

describe('progress and export', () => {
  it('shows ranges, categories and an accessible data table, and never plots a missing day as zero', async () => {
    await seed()
    await db.foodLog.bulkAdd([
      { id: 'a', date: '2026-10-19', mealCategory: 'lunch', name: 'x', provider: 'x', providerId: 'x', source: 'x', state: 'ready', portionValue: 1, portionUnit: 'g', kcal: 500, basis: { basis: 'g', kcalPer100: 1, unitSize: {} }, createdAt: 'x', updatedAt: 'x' },
      { id: 'b', date: '2026-10-21', mealCategory: 'lunch', name: 'x', provider: 'x', providerId: 'x', source: 'x', state: 'ready', portionValue: 1, portionUnit: 'g', kcal: 700, basis: { basis: 'g', kcalPer100: 1, unitSize: {} }, createdAt: 'x', updatedAt: 'x' },
    ] as never)
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Progress'))
    expect(await screen.findByRole('group', { name: 'Date range' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Categories' })).toBeInTheDocument()
    const card = (await screen.findByText('Calories logged')).closest('section')!
    await user.click(within(card).getByText(/view the data as a table/i))
    const table = within(card).getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(3) // header + the two logged days; 2026-10-20 is not listed
    expect(within(table).queryByText('2026-10-20')).not.toBeInTheDocument()
  })

  it('exports CSV and JSON with the range, units and a timestamp', async () => {
    await seed()
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const created: string[] = []
    const File0 = globalThis.File
    vi.stubGlobal('File', class extends File0 {
      constructor(parts: BlobPart[], name: string, opts?: FilePropertyBag) { super(parts, name, opts); created.push(`${name}:${String(parts[0])}`) }
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Progress'))
    await user.click(await screen.findByRole('button', { name: 'Export CSV' }))
    await waitFor(() => expect(created.some((c) => c.startsWith('lift-export-2026-10-21.csv'))).toBe(true))
    const csv = created.find((c) => c.endsWith('.csv') || c.includes('.csv:'))!
    expect(csv).toMatch(/# exported_at=/)
    expect(csv).toMatch(/# weight_unit=lb/)
    expect(csv).toMatch(/# range=/)
    await user.click(screen.getByRole('button', { name: 'Export JSON' }))
    await waitFor(() => expect(created.some((c) => c.startsWith('lift-export-2026-10-21.json'))).toBe(true))
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
})


describe('settings sections, info icons, feedback and recovery', () => {
  it('Settings sections all start collapsed, open independently, and are not remembered across a reload', async () => {
    await seed()
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.click(await tab('Settings'))
    const sections = Array.from(document.querySelectorAll('details.section')) as HTMLDetailsElement[]
    expect(sections.length).toBeGreaterThan(5)
    expect(sections.every((d) => !d.open)).toBe(true)
    await user.click(within(sections[0]).getByText('Profile and goals'))
    expect(sections[0].open).toBe(true)
    expect(sections.slice(1).every((d) => !d.open)).toBe(true)
    unmount()
    render(<App />)
    await user.click(await tab('Settings'))
    expect((Array.from(document.querySelectorAll('details.section')) as HTMLDetailsElement[]).every((d) => !d.open)).toBe(true)
  })

  it('the delete section stays distinguishable', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Settings'))
    expect(document.querySelectorAll('details.section.danger-zone').length).toBe(1)
  })

  it('the F button opens a prefilled form, previews before sharing, and shares nothing without confirmation', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText(/today's focus/i)
    await user.click(screen.getAllByRole('button', { name: /send feedback about this week/i })[0])
    const dlg = await screen.findByRole('dialog', { name: 'Send feedback' })
    expect(within(dlg).getByText(/Home › This week/)).toBeInTheDocument()
    await user.type(within(dlg).getByLabelText('Your feedback'), 'Needs a bigger chart')
    await user.selectOptions(within(dlg).getByLabelText(/how do you want to share/i), 'file')
    await user.click(within(dlg).getByRole('button', { name: 'Preview' }))
    expect(within(dlg).getByLabelText('Message preview')).toHaveTextContent('Needs a bigger chart')
    expect(within(dlg).getByLabelText('Message preview')).toHaveTextContent('Home > This week')
    expect(within(dlg).getByText(/Nothing has been sent/i)).toBeInTheDocument()
    expect(within(dlg).getByText(/no workout, food or body data is included/i)).toBeInTheDocument()
  })

  it('an empty feedback message is refused with a reason', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Settings'))
    await user.click(screen.getByText('Feedback and support'))
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    expect(await screen.findByText(/write a few words/i)).toBeInTheDocument()
  })

  it('the F buttons can be turned off', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Settings'))
    await user.click(screen.getByText('Feedback and support'))
    await user.click(screen.getByLabelText(/show the small f feedback buttons/i))
    expect(screen.queryAllByRole('button', { name: /send feedback about/i })).toHaveLength(0)
    await user.click(screen.getByLabelText(/show the small f feedback buttons/i))
    expect(screen.queryAllByRole('button', { name: /send feedback about/i }).length).toBeGreaterThan(0)
  })

  it('exercise details stay hidden until the info icon is tapped, and opening them does not touch the logged set', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await startWorkout(user)
    expect(screen.queryByText(/form tips/i)).not.toBeInTheDocument()
    const w = screen.getAllByLabelText('Set 1 weight')[0]
    await user.clear(w)
    await user.type(w, '55')
    const info = screen.getAllByRole('button', { name: /^about /i })[0]
    await user.click(info)
    const dlg = await screen.findByRole('dialog')
    expect(within(dlg).getByText(/safety/i)).toBeInTheDocument()
    expect(within(dlg).getByText(/muscles:/i)).toBeInTheDocument()
    await user.click(within(dlg).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getAllByLabelText('Set 1 weight')[0]).toHaveValue('55')
    expect(screen.queryByText(/no muscle information/i)).not.toBeInTheDocument()
  })

  it('Recovery shows an honest empty state with no history, and a map once a workout is saved', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Progress'))
    await user.click(await screen.findByRole('button', { name: 'Recovery' }))
    expect(await screen.findByText(/no recovery data yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/muscle groups recovered/i)).not.toBeInTheDocument()
  })
  it('Recovery reflects a saved workout, lets you tap a muscle for details, and updates when it is deleted', async () => {
    await seed()
    const { CATALOG } = await import('./data/catalog')
    const { musclesOf } = await import('./engine/muscleMap')
    const press = CATALOG.find((e) => musclesOf(e).primary.includes('chest'))!
    const when = new Date(NOW.getTime() - 3 * 3_600_000).toISOString()
    await db.sessions.add({ id: 'rs1', date: TODAY, startedAt: when, finishedAt: when, status: 'completed', plannedExercises: [], actualExercises: [], title: 'Chest day', planVersion: 1, generatorVersion: 't', targetMuscles: ['chest'], pausedMs: 0, weightUnit: 'lb' })
    await db.setLogs.bulkAdd([1, 2, 3, 4].map((n) => ({ id: `rl${n}`, sessionId: 'rs1', slotId: 's1', exerciseId: press.id, setNumber: n, plannedRepMin: 8, plannedRepMax: 10, actualReps: 8, actualWeight: 100, weightUnit: 'lb' as const, completed: true, createdAt: when, updatedAt: when })))
    const user = userEvent.setup()
    render(<App />)
    await user.click(await tab('Progress'))
    await user.click(await screen.findByRole('button', { name: 'Recovery' }))
    expect(await screen.findByText(/days? since last workout|last workout/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Chest, recently trained$/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Chest: Recently trained$/ }))
    expect(await screen.findByText(/estimated to be ready in/i)).toBeInTheDocument()
    expect(screen.getByText(/Chest day/)).toBeInTheDocument()
    await db.sessions.delete('rs1')
    expect(await screen.findByText(/no recovery data yet/i)).toBeInTheDocument()
  })
  it('Yoga is reachable from a Yoga tab and the Home card, and can be switched on again if it was off', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('button', { name: /plan a yoga session/i })
    await user.click(await tab('Yoga'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Yoga' })).toBeInTheDocument()
    const { setTrack } = await import('./db/repo')
    await act(async () => { await setTrack('yoga', false) })
    await user.click(await tab('Home'))
    await user.click(await screen.findByRole('button', { name: /turn on yoga/i }))
    expect(await screen.findByRole('button', { name: /plan a yoga session/i })).toBeInTheDocument()
    await setTrack('workout', false)
    await setTrack('yoga', false)
    expect((await db.profile.toArray())[0].tracks).toEqual(['yoga'])
  })
})
