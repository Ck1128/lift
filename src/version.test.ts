import { describe, it, expect } from 'vitest'
import { APP_VERSION } from './db/schema'
import changelog from '../CHANGELOG.md?raw'

describe('app version', () => {
  it('is a real version and matches the newest CHANGELOG entry, so it cannot be forgotten on release', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
    const top = /^## (\d+\.\d+\.\d+)/m.exec(changelog)?.[1]
    expect(top).toBe(APP_VERSION)
  })
})
