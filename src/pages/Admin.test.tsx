import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { deleteDoc, deleteField, updateDoc } from 'firebase/firestore'
import { deleteObject } from 'firebase/storage'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Ballot, Contest } from '../config'
import * as hooks from '../hooks'
import { ballot, couple } from '../testUtils'
import Admin from './Admin'

vi.mock('../firebase', () => ({ auth: {}, db: {}, storage: {} }))
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }))
vi.mock('firebase/storage', () => ({
  deleteObject: vi.fn(),
  getDownloadURL: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
}))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  deleteField: vi.fn(() => 'DELETE_FIELD'),
  deleteDoc: vi.fn(),
  doc: vi.fn((_db: unknown, ...path: string[]) => path.join('/')),
  getDocs: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(() => Promise.resolve()),
  where: vi.fn(),
  writeBatch: vi.fn(),
}))
vi.mock('../hooks')

const couples = [couple('a', 'Adams'), couple('b', 'Brown'), couple('c', 'Clark')]

function setup(opts: {
  email?: string | null
  ready?: boolean
  contest?: Contest | null
  ballots?: Ballot[]
} = {}) {
  const email = 'email' in opts ? opts.email : 'loveaphair@gmail.com'
  vi.mocked(hooks.useUser).mockReturnValue({ user: email === null ? null : ({ email } as never), ready: opts.ready ?? true })
  vi.mocked(hooks.isAdminUser).mockImplementation(((u: { email?: string } | null) =>
    !!u?.email && ['loveaphair@gmail.com', 'fredalyssa@gmail.com'].includes(u.email)) as never)
  vi.mocked(hooks.useContest).mockReturnValue(opts.contest ?? { state: 'voting', tiebreaks: {} })
  vi.mocked(hooks.useCouples).mockReturnValue(couples)
  vi.mocked(hooks.useBallots).mockReturnValue(opts.ballots ?? [])
  return render(<Admin />)
}

const resultsFor = (title: string) => screen.getByRole('heading', { name: title }).parentElement!

beforeEach(() => vi.clearAllMocks())

describe('Admin gating', () => {
  it('shows loading until auth is ready', () => {
    setup({ ready: false, email: null })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows a sign-in button when logged out', () => {
    setup({ email: null })
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument()
  })

  it('calls signInWithGoogle when the button is clicked', async () => {
    vi.mocked(hooks.signInWithGoogle).mockResolvedValue({} as never)
    setup({ email: null })
    await userEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }))
    expect(hooks.signInWithGoogle).toHaveBeenCalled()
  })

  it('rejects a non-allow-listed email', () => {
    setup({ email: 'rando@gmail.com' })
    expect(screen.getByText('rando@gmail.com is not an admin.')).toBeInTheDocument()
    expect(screen.queryByText('Contest state')).not.toBeInTheDocument()
  })

  it('does not enable data subscriptions for non-admins', () => {
    setup({ email: 'rando@gmail.com' })
    expect(hooks.useBallots).toHaveBeenCalledWith(false)
  })

  it('shows the admin view for an allow-listed email', () => {
    setup({ email: 'fredalyssa@gmail.com' })
    expect(screen.getByText('Contest state')).toBeInTheDocument()
    expect(screen.getByText('Couples (3)')).toBeInTheDocument()
  })
})

describe('Admin tie-break buttons', () => {
  const tiedBallots = [ballot('1', { icons: 'a' }), ballot('2', { icons: 'b' }), ballot('3', { foolish: 'c' })]

  it('shows "Make winner" only on categories tied for first, only on the tied couples', () => {
    setup({ ballots: [...tiedBallots, ballot('4', { effort: 'a' }), ballot('5', { effort: 'a' }), ballot('6', { effort: 'b' })] })
    expect(within(resultsFor('Eternal Icons')).getAllByRole('button', { name: 'Make winner' })).toHaveLength(2)
    expect(within(resultsFor('Forever Foolish')).queryByRole('button')).not.toBeInTheDocument()
    // effort: a leads alone, b is a runner-up; no buttons
    expect(within(resultsFor('Undying Lack of Effort')).queryByRole('button')).not.toBeInTheDocument()
  })

  it('does not offer buttons when third place is tied but first is not', () => {
    setup({ ballots: [ballot('1', { icons: 'a' }), ballot('2', { icons: 'a' }), ballot('3', { icons: 'b' }), ballot('4', { icons: 'c' })] })
    expect(within(resultsFor('Eternal Icons')).queryByRole('button')).not.toBeInTheDocument()
  })

  it('writes tiebreaks.<category> with the couple id on click', async () => {
    setup({ ballots: tiedBallots })
    const row = within(resultsFor('Eternal Icons')).getByText('Brown').closest('.option') as HTMLElement
    await userEvent.click(within(row).getByRole('button', { name: 'Make winner' }))
    expect(updateDoc).toHaveBeenCalledWith('config/contest', { 'tiebreaks.icons': 'b' })
  })

  it('offers undo for the chosen couple and deletes the field', async () => {
    setup({ ballots: tiedBallots, contest: { state: 'revealed', tiebreaks: { icons: 'b' } } })
    const row = within(resultsFor('Eternal Icons')).getByText('Brown').closest('.option') as HTMLElement
    await userEvent.click(within(row).getByRole('button', { name: '★ Winner (undo)' }))
    expect(deleteField).toHaveBeenCalled()
    expect(updateDoc).toHaveBeenCalledWith('config/contest', { 'tiebreaks.icons': 'DELETE_FIELD' })
  })

  it('lets the host switch the pick to the other tied couple', async () => {
    setup({ ballots: tiedBallots, contest: { state: 'revealed', tiebreaks: { icons: 'b' } } })
    const row = within(resultsFor('Eternal Icons')).getByText('Adams').closest('.option') as HTMLElement
    await userEvent.click(within(row).getByRole('button', { name: 'Make winner' }))
    expect(updateDoc).toHaveBeenCalledWith('config/contest', { 'tiebreaks.icons': 'a' })
  })
})

describe('Admin deleting a couple', () => {
  const clickDelete = async (name: string) => {
    const row = screen.getByText(name, { selector: 'strong' }).closest('.option') as HTMLElement
    await userEvent.click(within(row).getByRole('button', { name: 'Delete' }))
  }

  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.mocked(deleteObject).mockResolvedValue(undefined)
  })

  it('deletes the couple doc and its stored photo', async () => {
    setup()
    await clickDelete('Brown')
    expect(deleteDoc).toHaveBeenCalledWith('couples/b')
    expect(deleteObject).toHaveBeenCalledTimes(1)
  })

  it('deletes nothing when the host cancels', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    setup()
    await clickDelete('Brown')
    expect(deleteDoc).not.toHaveBeenCalled()
    expect(deleteObject).not.toHaveBeenCalled()
  })

  it('stays quiet when the couple never had a photo', async () => {
    vi.mocked(deleteObject).mockRejectedValue({ code: 'storage/object-not-found' })
    setup()
    await clickDelete('Brown')
    expect(window.alert).not.toHaveBeenCalled()
  })

  it('warns when the photo could not be removed', async () => {
    vi.mocked(deleteObject).mockRejectedValue({ code: 'storage/unauthorized', message: 'nope' })
    setup()
    await clickDelete('Brown')
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('photo could not be removed'))
  })
})
