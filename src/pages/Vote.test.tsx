import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { writeBatch } from 'firebase/firestore'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Ballot, Contest, Couple } from '../config'
import * as hooks from '../hooks'
import { ballot, couple } from '../testUtils'
import Vote from './Vote'

vi.mock('../firebase', () => ({ auth: {}, db: {}, storage: {} }))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, ...path: string[]) => path.join('/')),
  serverTimestamp: vi.fn(() => 'TS'),
  writeBatch: vi.fn(),
}))
vi.mock('../hooks')

const b1 = ballot('u1_1', {}, 'a')
const b2 = ballot('u1_2', {}, 'a')
const couples = [couple('a', 'Adams'), couple('b', 'Brown'), couple('c', 'Clark'), couple('d', 'Davis')]

function setup(opts: {
  state?: Contest['state'] | null
  ballots?: Ballot[] | undefined
  ready?: boolean
  couples?: Couple[]
} = {}) {
  const { state = 'voting', ready = true } = opts
  const ballots = 'ballots' in opts ? opts.ballots : []
  vi.mocked(hooks.useUser).mockReturnValue({ user: ready ? ({ uid: 'u1' } as never) : null, ready })
  vi.mocked(hooks.useContest).mockReturnValue(state === null ? null : { state, tiebreaks: {} })
  vi.mocked(hooks.useCouples).mockReturnValue(opts.couples ?? couples)
  vi.mocked(hooks.useMyBallots).mockReturnValue(ballots)
  return render(<MemoryRouter><Vote /></MemoryRouter>)
}

function mockBatch(commits: Array<'ok' | 'fail' | 'network'>) {
  const batches: { set: ReturnType<typeof vi.fn>; commit: ReturnType<typeof vi.fn> }[] = []
  vi.mocked(writeBatch).mockImplementation((() => {
    const outcome = commits[batches.length]
    const b = {
      set: vi.fn(),
      commit: vi.fn(() =>
        outcome === 'ok'
          ? Promise.resolve()
          : Promise.reject(Object.assign(new Error('x'), { code: outcome === 'fail' ? 'permission-denied' : 'unavailable' })),
      ),
    }
    batches.push(b)
    return b
  }) as never)
  return batches
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('Vote states', () => {
  it('shows loading until auth, contest and ballot are known', () => {
    setup({ ready: false })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows loading while the contest doc has not arrived', () => {
    setup({ state: null })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows loading while the ballot lookup is pending', () => {
    setup({ ballots: undefined })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('says voting opens soon during registration', () => {
    setup({ state: 'registration' })
    expect(screen.getByText('Voting opens soon')).toBeInTheDocument()
    expect(screen.queryByText('Submit votes')).not.toBeInTheDocument()
  })

  it('shows the ballot form while voting', () => {
    setup()
    expect(screen.getByText('Which couple are you?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit votes' })).toBeDisabled()
  })

  it('shows "already voted" when a ballot exists', () => {
    setup({ ballots: [b1, b2] })
    expect(screen.getByText(/Votes are in/)).toBeInTheDocument()
    expect(screen.queryByText('Submit votes')).not.toBeInTheDocument()
  })

  it('links to winners from the already-voted screen only once revealed', () => {
        const { unmount } = setup({ ballots: [b1, b2], state: 'voting' })
    expect(screen.queryByText(/See the winners/)).not.toBeInTheDocument()
    unmount()
    setup({ ballots: [b1, b2], state: 'revealed' })
    expect(screen.getByText(/See the winners/)).toHaveAttribute('href', '/winners')
  })

  it('shows a closed message when revealed', () => {
    setup({ state: 'revealed' })
    expect(screen.getByText('Voting is closed')).toBeInTheDocument()
    expect(screen.queryByText('Submit votes')).not.toBeInTheDocument()
  })
})

describe('Vote form', () => {
  it('hides category sections until a couple is chosen', () => {
    setup()
    expect(screen.queryByText('Eternal Icons')).not.toBeInTheDocument()
  })

  it('disables your own couple in all three categories', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('radio', { name: /Brown/ }))
    for (const name of ['icons', 'foolish', 'effort']) {
      const radios = screen.getAllByRole('radio').filter((r) => r.getAttribute('name') === name)
      expect(radios).toHaveLength(4)
      expect(radios[1]).toBeDisabled()
      expect(radios[0]).toBeEnabled()
      expect(radios[2]).toBeEnabled()
      expect(radios[3]).toBeEnabled()
    }
    expect(screen.getAllByText("that's you")).toHaveLength(3)
  })

  it('locks a couple already picked in another category', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('radio', { name: /Brown/ }))
    const radios = (cat: string) => screen.getAllByRole('radio').filter((r) => r.getAttribute('name') === cat)
    await user.click(radios('icons')[0]) // Adams
    expect(radios('foolish')[0]).toBeDisabled()
    expect(radios('effort')[0]).toBeDisabled()
    expect(radios('icons')[0]).toBeEnabled()
    expect(screen.getAllByText('already your Eternal Icons pick')).toHaveLength(2)
    await user.click(radios('foolish')[2]) // Clark
    await user.click(radios('icons')[2]) // can't: Clark is Forever Foolish
    expect(radios('icons')[0]).toBeChecked()
  })

  it('keeps submit disabled until all three picks are made', async () => {
    const user = userEvent.setup()
    setup()
    const submit = screen.getByRole('button', { name: 'Submit votes' })
    const pick = async (cat: string, idx: number) =>
      user.click(screen.getAllByRole('radio').filter((r) => r.getAttribute('name') === cat)[idx])

    await user.click(screen.getAllByRole('radio')[1]) // me = Brown
    expect(submit).toBeDisabled()
    await pick('icons', 0)
    await pick('foolish', 2)
    expect(submit).toBeDisabled()
    await pick('effort', 3)
    expect(submit).toBeEnabled()
  })

  async function fillAndSubmit() {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getAllByRole('radio')[1]) // me = Brown (b)
    const pick = (cat: string, idx: number) =>
      user.click(screen.getAllByRole('radio').filter((r) => r.getAttribute('name') === cat)[idx])
    await pick('icons', 0)
    await pick('foolish', 2)
    await pick('effort', 3)
    await user.click(screen.getByRole('button', { name: 'Submit votes' }))
  }

  it('writes the ballot and slot 1 claim in one batch', async () => {
    const batches = mockBatch(['ok'])
    await fillAndSubmit()
    await waitFor(() => expect(batches[0].commit).toHaveBeenCalled())
    expect(batches).toHaveLength(1)
    expect(batches[0].set).toHaveBeenCalledWith('ballots/u1_1', {
      coupleId: 'b',
      picks: { icons: 'a', foolish: 'c', effort: 'd' },
      createdAt: 'TS',
    })
    expect(batches[0].set).toHaveBeenCalledWith('slots/b_1', { uid: 'u1', coupleId: 'b', ballotId: 'u1_1' })
    expect(screen.queryByText(/Could not submit/)).not.toBeInTheDocument()
  })

  it('falls back to slot 2 when the slot 1 commit rejects', async () => {
    const batches = mockBatch(['fail', 'ok'])
    await fillAndSubmit()
    await waitFor(() => expect(batches).toHaveLength(2))
    expect(batches[1].set).toHaveBeenCalledWith('slots/b_2', { uid: 'u1', coupleId: 'b', ballotId: 'u1_1' })
    expect(batches[1].set).toHaveBeenCalledWith('ballots/u1_1', expect.objectContaining({ coupleId: 'b' }))
    expect(screen.queryByText(/Could not submit/)).not.toBeInTheDocument()
  })

  it('shows an error when both slots are rejected', async () => {
    const batches = mockBatch(['fail', 'fail'])
    await fillAndSubmit()
    expect(await screen.findByText(/Could not submit/)).toBeInTheDocument()
    expect(batches).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Submit votes' })).toBeEnabled()
  })

  it('reports a connection problem, without retrying slot 2, on a non-rules failure', async () => {
    const batches = mockBatch(['network', 'ok'])
    await fillAndSubmit()
    expect(await screen.findByText(/Check your connection/)).toBeInTheDocument()
    expect(screen.queryByText(/two people from your couple/)).not.toBeInTheDocument()
    expect(batches).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Submit votes' })).toBeEnabled()
  })

  it('does not blame the connection when both slots are rejected by the rules', async () => {
    mockBatch(['fail', 'fail'])
    await fillAndSubmit()
    expect(await screen.findByText(/two people from your couple/)).toBeInTheDocument()
    expect(screen.queryByText(/Check your connection/)).not.toBeInTheDocument()
  })
})

describe('sharing one device', () => {
  it('offers a second vote after the first and locks the couple', async () => {
    const user = userEvent.setup()
    setup({ ballots: [ballot('u1_1', {}, 'b')] })
    expect(screen.getByText(/One vote is in/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Vote as the second person' }))
    const me = screen.getAllByRole('radio').filter((r) => r.getAttribute('name') === 'me')
    expect(me.map((r) => (r as HTMLInputElement).disabled)).toEqual([true, false, true, true])
    expect(me[1]).toBeChecked()
  })

  it('writes the second ballot under the free id', async () => {
    const batches = mockBatch(['ok'])
    const user = userEvent.setup()
    setup({ ballots: [ballot('u1_1', {}, 'b')] })
    await user.click(screen.getByRole('button', { name: 'Vote as the second person' }))
    const pick = (cat: string, idx: number) =>
      user.click(screen.getAllByRole('radio').filter((r) => r.getAttribute('name') === cat)[idx])
    await pick('icons', 0)
    await pick('foolish', 2)
    await pick('effort', 3)
    await user.click(screen.getByRole('button', { name: 'Submit votes' }))
    await waitFor(() => expect(batches[0].commit).toHaveBeenCalled())
    expect(batches[0].set).toHaveBeenCalledWith('ballots/u1_2', expect.objectContaining({ coupleId: 'b' }))
  })

  it('offers no third vote', () => {
    setup({ ballots: [b1, b2] })
    expect(screen.queryByRole('button', { name: 'Vote as the second person' })).not.toBeInTheDocument()
  })
})
