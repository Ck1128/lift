import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

const nav = () => screen.getByRole('navigation', { name: /main navigation/i })

describe('App shell', () => {
  it('starts on the Home screen', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument()
  })

  it('shows all five navigation items', () => {
    render(<App />)
    for (const label of ['Home', 'Plan', 'Workout', 'Progress', 'Settings']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument()
    }
  })

  it.each([
    ['Plan', 'Weekly Plan'],
    ['Workout', 'Workout'],
    ['Progress', 'Progress'],
    ['Settings', 'Settings'],
    ['Home', 'Today'],
  ])('opens %s from the bottom nav', async (button, heading) => {
    const user = userEvent.setup()
    render(<App />)
    const target = Array.from(nav().querySelectorAll('button')).find((b) =>
      b.textContent?.includes(button),
    )!
    await user.click(target)
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(target).toHaveAttribute('aria-current', 'page')
  })

  it('lets the user pick available minutes on Home', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '30 min' }))
    expect(screen.getByRole('button', { name: '30 min' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /view workout \(30 min\)/i })).toBeInTheDocument()
  })

  it('"View workout" button navigates to the Workout screen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /view workout/i }))
    expect(screen.getByRole('heading', { level: 1, name: 'Workout' })).toBeInTheDocument()
  })

  it('labels placeholder data as sample data', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /plan/i }))
    expect(screen.getByText('Sample data')).toBeInTheDocument()
  })

  it('shows an empty state on Progress for new users', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /progress/i }))
    expect(screen.getByText(/nothing to show yet/i)).toBeInTheDocument()
  })
})
