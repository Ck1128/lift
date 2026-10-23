import { act, render, screen } from '@testing-library/react'
import { RestBar } from '../components/RestBar'
import { rest } from './restStore'

describe('rest timer store', () => {
  afterEach(() => { act(() => rest.skip()); localStorage.clear() })

  it('shows on any screen, survives being unmounted, and is saved for a reopen', () => {
    const { unmount } = render(<RestBar />)
    expect(screen.queryByRole('timer')).toBeNull()
    act(() => rest.start(90))
    expect(screen.getByRole('timer')).toHaveTextContent(/1:(30|29)/)
    unmount() // like switching to another tab
    expect(rest.current()).not.toBeNull()
    expect(JSON.parse(localStorage.getItem('lift.rest')!).endAt).toBeGreaterThan(Date.now())
    render(<RestBar />)
    expect(screen.getByRole('timer')).toBeInTheDocument()
  })

  it('pauses, adds time and skips', () => {
    render(<RestBar />)
    act(() => rest.start(60))
    act(() => rest.pause())
    expect(screen.getByRole('timer')).toHaveTextContent(/paused/i)
    act(() => rest.add(15))
    expect(screen.getByRole('timer')).toHaveTextContent(/1:15/)
    act(() => rest.resume())
    act(() => rest.skip())
    expect(screen.queryByRole('timer')).toBeNull()
    expect(localStorage.getItem('lift.rest')).toBeNull()
  })
})
