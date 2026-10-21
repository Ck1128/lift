import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { db } from './db/schema'
import { exportBackup } from './db/backup'
import { profileToForm, resetAllData, saveProfile } from './db/repo'

const NOW = new Date(2026, 9, 21, 12, 0, 0) // Wednesday, a training day in the default plan

async function seed(extra: Partial<ReturnType<typeof profileToForm>> = {}) {
  await resetAllData()
  await saveProfile(
    { ...profileToForm(), weightValue: '180', ...extra },
    { preferredLocation: 'gym', gymType: 'planet_fitness' },
    NOW,
  )
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  await resetAllData()
})
afterEach(() => { vi.useRealTimers() })

const nav = (name: RegExp) => screen.getByRole('navigation', { name: /main navigation/i }).querySelectorAll('button')[
  ['home', 'plan', 'workout', 'progress', 'settings'].findIndex((n) => name.test(n))
]

async function generateAndOpen(user: ReturnType<typeof userEvent.setup>, minutes = 45) {
  await user.click(await screen.findByRole('button', { name: new RegExp(`generate workout \\(${minutes} min\\)`, 'i') }))
  await screen.findByRole('button', { name: /start workout/i })
}

describe('onboarding', () => {
  it('shows the welcome form first and explains why it asks', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeInTheDocument()
    expect(screen.getByText(/nothing leaves this phone/i)).toBeInTheDocument()
  })

  it('rejects invalid values with understandable messages', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome' })
    // clear all days, bad duration, bad age
    for (const d of ['Mon', 'Wed', 'Fri']) await user.click(screen.getByRole('button', { name: d }))
    const dur = screen.getByLabelText(/usual workout length/i)
    await user.clear(dur)
    await user.type(dur, '5')
    await user.click(screen.getByText('Optional details'))
    await user.type(screen.getByLabelText('Age'), '3')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText(/pick at least one training day/i)).toBeInTheDocument()
    expect(screen.getByText(/between 15 and 120/i)).toBeInTheDocument()
    expect(screen.getByText(/between 13 and 100/i)).toBeInTheDocument()
    expect(await db.profile.count()).toBe(0)
  })

  it('creates a profile with no network, confirms equipment, then lands on Home', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome' })
    await user.type(screen.getByLabelText(/nickname/i), 'Sam')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('heading', { name: /confirm your equipment/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Weight machines')).toBeChecked()
    expect(screen.getByLabelText('Barbell and plates')).not.toBeChecked() // Planet Fitness has no barbells
    await user.click(screen.getByRole('button', { name: /looks right/i }))
    expect(await screen.findByRole('heading', { name: 'Hi, Sam' })).toBeInTheDocument()
    expect((await db.profile.toArray())[0].displayName).toBe('Sam')
  })

  it('can start with Home equipment instead of a gym', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome' })
    await user.selectOptions(screen.getByLabelText('Where do you train?'), 'home')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: /confirm your equipment/i })
    expect(screen.getByLabelText('Weight machines')).not.toBeChecked()
    await user.click(screen.getByLabelText('Dumbbells'))
    await waitFor(async () => expect((await db.equipment.get('home'))?.items.dumbbell?.available).toBe(true))
  })
})

describe('navigation and banners', () => {
  it('opens all five screens', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Today' })
    for (const [name, heading] of [['plan', 'Weekly Plan'], ['workout', 'Workout'], ['progress', 'Progress'], ['settings', 'Settings'], ['home', 'Today']] as const) {
      await user.click(nav(new RegExp(name)))
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
})

describe('plan', () => {
  it('shows training days, rest days and muscle coverage', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /plan/i }))
    expect(await screen.findByText('Wednesday')).toBeInTheDocument()
    expect(screen.getAllByText('Rest day').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText(/muscle coverage each week/i)).toBeInTheDocument()
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
    expect(screen.getByRole('heading', { level: 1, name: /full body/i })).toBeInTheDocument()
    expect(screen.getByText(/\(estimate, you chose 30\)/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /start workout/i }))
    const first = (await screen.findAllByLabelText('Set 1 weight'))[0]
    expect(screen.getByText(/0 of \d+ sets done/)).toBeInTheDocument()

    // log set 1: different weight and reps
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
      expect(logs[0].plannedRepMax).toBeGreaterThan(0) // planned kept separately
    })
    expect(screen.getByText(/1 of \d+ sets done/)).toBeInTheDocument()

    // correct a mistake
    await user.click(screen.getAllByRole('button', { name: /set 1 done\. tap to undo/i })[0])
    await waitFor(async () => expect((await db.setLogs.toArray()).filter((l) => l.completed)).toHaveLength(0))
    await user.click(screen.getAllByRole('button', { name: /mark set 1 done/i })[0])

    // replace the second exercise
    await user.click(screen.getAllByRole('button', { name: 'Replace' })[1])
    const dlg = await screen.findByRole('dialog', { name: /replace exercise/i })
    const alts = within(dlg).getAllByRole('button').filter((b) => b.className.includes('alt'))
    expect(alts.length).toBeGreaterThan(0)
    await user.click(alts[0])
    expect(await screen.findByText(/^Replaced /)).toBeInTheDocument()
    const session = (await db.sessions.toArray())[0]
    expect(session.actualExercises[1].replacedFromId).toBe(session.plannedExercises[1].exerciseId)

    // finish early
    await user.click(screen.getByRole('button', { name: 'Finish' }))
    const confirm = await screen.findByRole('dialog', { name: /finish workout/i })
    expect(within(confirm).getByText(/not marked done will be saved as not completed/i)).toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: /save and finish/i }))
    expect(await screen.findByRole('heading', { name: 'Workout saved' })).toBeInTheDocument()
    expect(screen.getByText(/partly completed/i)).toBeInTheDocument()
    expect(screen.getByText(/too short to estimate calories/i)).toBeInTheDocument() // body weight is set, but the session was seconds long
    await user.click(screen.getByRole('button', { name: 'Done' }))

    // history
    await user.click(nav(/progress/))
    expect(await screen.findByText('Workouts per week')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /full body b/i }))
    expect(await screen.findByText(/saved workout \(read only\)/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Not done|reps/).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(await screen.findByText('Workouts per week')).toBeInTheDocument()
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

    render(<App />)
    expect(await screen.findByText(/workout in progress/i)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: /resume workout/i }))
    expect(await screen.findByText(/1 of \d+ sets done/)).toBeInTheDocument()
  })

  it('shows a rest-day message and lets the user choose to train anyway', async () => {
    await seed({ trainingDays: [0, 4] }) // Mon + Fri; Wednesday is a rest day
    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByText(/today is a rest day/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /train anyway/i }))
    await user.click(screen.getByRole('button', { name: 'Lower body' }))
    expect(await screen.findByRole('button', { name: /start workout/i })).toBeInTheDocument()
  })

  it('reports clearly when the requested time is invalid', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText(/or enter minutes/i), '5')
    await user.click(screen.getByRole('button', { name: /generate workout \(5 min\)/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/between 10 and 180/i)
  })
})

describe('settings', () => {
  it('switches location and edits equipment per location', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /settings/i }))
    await user.click(within(await screen.findByRole('group', { name: 'Training location' })).getByRole('button', { name: 'Home' }))
    expect((await db.profile.toArray())[0].preferredLocation).toBe('home')
    expect(screen.getByRole('button', { name: 'Home list' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByLabelText('Dumbbells'))
    await waitFor(async () => expect((await db.equipment.get('home'))?.items.dumbbell?.available).toBe(true))
    expect(await db.equipment.get('gym')).toBeUndefined() // gym list untouched
  })

  it('excludes and un-excludes an exercise', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /settings/i }))
    await user.type(await screen.findByLabelText(/find an exercise to exclude/i), 'squat')
    const boxes = await screen.findAllByRole('checkbox', { name: /squat/i })
    await user.click(boxes[0])
    await waitFor(async () => expect((await db.profile.toArray())[0].excludedExerciseIds).toHaveLength(1))
    await user.click(await screen.findByRole('button', { name: 'Remove' }))
    await waitFor(async () => expect((await db.profile.toArray())[0].excludedExerciseIds).toHaveLength(0))
  })

  it('exports a backup and restores from a file (merge)', async () => {
    await seed()
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /settings/i }))
    expect(screen.getByText(/treat it as private health information/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /export backup/i }))
    expect(await screen.findByText(/backup downloaded/i)).toBeInTheDocument()
    expect(click).toHaveBeenCalled()

    const input = screen.getByLabelText(/restore from a backup file/i)
    await user.upload(input, new File(['not json'], 'bad.json', { type: 'application/json' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/not valid json/i)

    const good = JSON.stringify(await exportBackup())
    await user.upload(input, new File([good], 'good.json', { type: 'application/json' }))
    expect(await screen.findByText(/backup preview/i)).toBeInTheDocument()
    expect(screen.getByText(/0 workouts/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /merge backup/i }))
    await user.click(within(await screen.findByRole('dialog', { name: /merge this backup/i })).getByRole('button', { name: 'Merge' }))
    expect(await screen.findByText(/backup merged/i)).toBeInTheDocument()
    click.mockRestore()
  })

  it('deletes all data only after confirmation and returns to onboarding', async () => {
    await seed()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /delete all data on this phone/i }))
    await user.click(within(await screen.findByRole('dialog', { name: /delete all data/i })).getByRole('button', { name: 'Cancel' }))
    expect(await db.profile.count()).toBe(1)
    await user.click(screen.getByRole('button', { name: /delete all data on this phone/i }))
    await user.click(within(await screen.findByRole('dialog', { name: /delete all data/i })).getByRole('button', { name: /delete everything/i }))
    expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeInTheDocument()
    expect(await db.profile.count()).toBe(0)
  })
})
