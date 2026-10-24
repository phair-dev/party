import { renderHook, act } from '@testing-library/react'
import type { User } from 'firebase/auth'
import { onSnapshot } from 'firebase/firestore'
import { describe, expect, it, vi } from 'vitest'
import { isAdminUser, useContest } from './hooks'

vi.mock('./firebase', () => ({ auth: {}, db: {}, storage: {} }))
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class {},
  onAuthStateChanged: vi.fn(),
  signInAnonymously: vi.fn(),
  signInWithPopup: vi.fn(),
}))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
}))

const user = (email: string | null) => ({ email }) as User

describe('isAdminUser', () => {
  it('accepts allow-listed emails', () => {
    expect(isAdminUser(user('loveaphair@gmail.com'))).toBe(true)
    expect(isAdminUser(user('fredalyssa@gmail.com'))).toBe(true)
  })

  it('rejects other emails, missing email and null user', () => {
    expect(isAdminUser(user('someone@gmail.com'))).toBe(false)
    expect(isAdminUser(user(null))).toBe(false)
    expect(isAdminUser(null)).toBe(false)
  })

  it('is case-sensitive (Google returns lowercase emails)', () => {
    expect(isAdminUser(user('LoveAPhair@gmail.com'))).toBe(false)
  })
})

describe('useContest', () => {
  function run(data: Record<string, unknown> | undefined) {
    vi.mocked(onSnapshot).mockImplementation(((_ref: unknown, cb: (s: unknown) => void) => {
      cb({ data: () => data })
      return () => {}
    }) as never)
    return renderHook(() => useContest(true))
  }

  it('defaults to registration with no tiebreaks when the doc is missing', () => {
    const { result } = run(undefined)
    expect(result.current).toEqual({ state: 'registration', tiebreaks: {} })
  })

  it('passes through stored values', () => {
    const { result } = run({ state: 'revealed', tiebreaks: { icons: 'a' } })
    expect(result.current).toEqual({ state: 'revealed', tiebreaks: { icons: 'a' } })
  })

  it('defaults only the missing field', () => {
    expect(run({ state: 'voting' }).result.current).toEqual({ state: 'voting', tiebreaks: {} })
    expect(run({ tiebreaks: { effort: 'z' } }).result.current?.state).toBe('registration')
  })

  it('is null and does not subscribe when disabled', () => {
    vi.mocked(onSnapshot).mockClear()
    const { result } = renderHook(() => useContest(false))
    expect(result.current).toBeNull()
    expect(onSnapshot).not.toHaveBeenCalled()
  })

  it('unsubscribes on unmount', () => {
    const unsub = vi.fn()
    vi.mocked(onSnapshot).mockReturnValue(unsub as never)
    const { unmount } = renderHook(() => useContest(true))
    act(() => unmount())
    expect(unsub).toHaveBeenCalled()
  })
})
