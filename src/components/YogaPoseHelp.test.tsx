import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { YogaPoseHelp } from './YogaPoseHelp'
import { isValidVideo, videoFor, searchUrl, embedUrl, POSE_VIDEOS } from '../data/yogaMedia'
import { POSES } from '../data/yoga'

const pose = { id: 'test-pose', name: 'Test pose', sanskrit: 'Testasana', position: 'standing' as const, instructions: ['Stand tall.'], cautions: ['Knees stay soft.'], modifications: ['Use a wall.'] }

describe('yoga media data', () => {
  it('only accepts complete, well-formed video entries', () => {
    expect(isValidVideo({ id: 'abcdefghijk', title: 'T', channel: 'C', verifiedOn: '2026-01-01' })).toBe(true)
    expect(isValidVideo({ id: 'short', title: 'T', channel: 'C', verifiedOn: '2026-01-01' })).toBe(false)
    expect(isValidVideo({ id: 'abcdefghijk', title: '', channel: 'C', verifiedOn: '2026-01-01' })).toBe(false)
    expect(isValidVideo({ id: 'abcdefghijk', title: 'T', channel: 'C', verifiedOn: 'yesterday' })).toBe(false)
    expect(isValidVideo(null)).toBe(false)
  })
  it('every shipped entry is valid and belongs to a real pose', () => {
    for (const [poseId, v] of Object.entries(POSE_VIDEOS)) {
      expect(isValidVideo(v)).toBe(true)
      expect(POSES.some((p) => p.id === poseId)).toBe(true)
    }
  })
  it('a malformed entry is treated as no video, never as a broken link', () => {
    expect(videoFor('x', { x: { id: '<script>', title: 'T', channel: 'C', verifiedOn: '2026-01-01' } })).toBeNull()
    expect(videoFor('missing', {})).toBeNull()
  })
  it('builds a search link (not a video) with the pose name encoded', () => {
    expect(searchUrl('Cat & cow', 'Marjaryasana')).toContain('search_query=Cat%20%26%20cow%20Marjaryasana')
  })
})

describe('YogaPoseHelp', () => {
  it('shows safety, steps and easier options, and a labelled search link when no verified video exists', () => {
    render(<YogaPoseHelp pose={pose} />)
    expect(screen.getByRole('note')).toHaveTextContent(/knees stay soft/i)
    expect(screen.getByText('Stand tall.')).toBeInTheDocument()
    expect(screen.getByText('Use a wall.')).toBeInTheDocument()
    expect(screen.getByText(/no checked video for this pose yet/i)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /search youtube/i })
    expect(link.getAttribute('href')).toContain('youtube.com/results')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(document.querySelector('iframe')).toBeNull()
  })
  it('loads nothing from YouTube until Play is tapped, then embeds the privacy-friendly player', async () => {
    const video = { id: 'abcdefghijk', title: 'Demo', channel: 'Chan', verifiedOn: '2026-01-01' }
    ;(POSE_VIDEOS as Record<string, unknown>)['test-pose'] = video
    try {
      render(<YogaPoseHelp pose={pose} />)
      expect(document.querySelector('iframe')).toBeNull()
      await userEvent.setup().click(screen.getByRole('button', { name: /play video/i }))
      const frame = document.querySelector('iframe')
      expect(frame?.getAttribute('src')).toBe(embedUrl(video))
      expect(frame?.getAttribute('src')).toContain('youtube-nocookie.com')
      expect(frame).toHaveAttribute('loading', 'lazy')
    } finally {
      delete (POSE_VIDEOS as Record<string, unknown>)['test-pose']
    }
  })
})
