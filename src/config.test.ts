import { describe, expect, it } from 'vitest'
import { ADMIN_EMAILS, CATEGORIES } from './config'

describe('config', () => {
  it('has exactly the three expected categories', () => {
    expect(CATEGORIES.map((c) => c.key)).toEqual(['icons', 'foolish', 'effort'])
  })

  it('has unique keys and titles, all non-empty', () => {
    expect(new Set(CATEGORIES.map((c) => c.key)).size).toBe(3)
    expect(new Set(CATEGORIES.map((c) => c.title)).size).toBe(3)
    for (const c of CATEGORIES) {
      expect(c.title).not.toBe('')
      expect(c.blurb).not.toBe('')
    }
  })

  it('lists valid, unique, lowercase admin emails', () => {
    expect(ADMIN_EMAILS.length).toBeGreaterThan(0)
    expect(new Set(ADMIN_EMAILS).size).toBe(ADMIN_EMAILS.length)
    for (const e of ADMIN_EMAILS) {
      expect(e).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)
      expect(e).toBe(e.toLowerCase())
    }
  })
})
