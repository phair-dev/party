import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Ballot, Contest } from '../config'
import * as hooks from '../hooks'
import { ballot, couple } from '../testUtils'
import Winners from './Winners'

vi.mock('../firebase', () => ({ auth: {}, db: {}, storage: {} }))
vi.mock('../hooks')

const couples = [couple('a', 'Adams'), couple('b', 'Brown'), couple('c', 'Clark')]

function setup(contest: Contest | null, ballots: Ballot[] = []) {
  vi.mocked(hooks.useUser).mockReturnValue({ user: { uid: 'u' } as never, ready: true })
  vi.mocked(hooks.useContest).mockReturnValue(contest)
  vi.mocked(hooks.useCouples).mockReturnValue(couples)
  vi.mocked(hooks.useBallots).mockReturnValue(ballots)
  return render(<Winners />)
}

const next = (n = 1) => (async () => { for (let i = 0; i < n; i++) await userEvent.keyboard('{ArrowRight}') })()
const winnerCard = () => document.querySelector('.card.winner') as HTMLElement

beforeEach(() => vi.clearAllMocks())

describe('Winners gating', () => {
  it('shows loading before the contest doc arrives', () => {
    setup(null)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it.each(['registration', 'voting'] as const)('is locked during %s', (state) => {
    setup({ state, tiebreaks: {} }, [ballot('1', { icons: 'a' })])
    expect(screen.getByText('Winners coming soon…')).toBeInTheDocument()
    expect(screen.queryByText('Adams')).not.toBeInTheDocument()
  })

  it('does not subscribe to ballots until revealed', () => {
    setup({ state: 'voting', tiebreaks: {} })
    expect(hooks.useBallots).toHaveBeenCalledWith(false)
  })
})

describe('Winners presentation', () => {
  const ballots = [
    ballot('1', { icons: 'a', foolish: 'b', effort: 'c' }),
    ballot('2', { icons: 'a', foolish: 'b', effort: 'c' }),
    ballot('3', { icons: 'b', foolish: 'c', effort: 'a' }),
  ]

  it('starts on an intro with no results visible', () => {
    setup({ state: 'revealed', tiebreaks: {} }, ballots)
    expect(screen.getByText('Ready?')).toBeInTheDocument()
    expect(screen.queryByText('Adams')).not.toBeInTheDocument()
  })

  it('announces least effort, then funniest, then best, each as title first then winner', async () => {
    setup({ state: 'revealed', tiebreaks: {} }, ballots)
    await next()
    expect(screen.getByRole('heading', { name: 'Undying Lack of Effort' })).toBeInTheDocument()
    expect(screen.queryByText('Clark')).not.toBeInTheDocument() // winner hidden on the teaser
    await next()
    expect(within(winnerCard()).getByText('Clark')).toBeInTheDocument()
    await next()
    expect(screen.getByRole('heading', { name: 'Forever Foolish' })).toBeInTheDocument()
    await next()
    expect(within(winnerCard()).getByText('Brown')).toBeInTheDocument()
    await next()
    expect(screen.getByRole('heading', { name: 'Eternal Icons' })).toBeInTheDocument()
    await next()
    expect(within(winnerCard()).getByText('Adams')).toBeInTheDocument()
  })

  it('ends on a recap of all three winners and stops advancing', async () => {
    setup({ state: 'revealed', tiebreaks: {} }, ballots)
    await next(10)
    expect(screen.getByText('The end')).toBeInTheDocument()
    expect(screen.getByText('Clark')).toBeInTheDocument()
    expect(screen.getByText('Brown')).toBeInTheDocument()
    expect(screen.getByText('Adams')).toBeInTheDocument()
  })

  it('clicking advances and Back goes back without advancing', async () => {
    setup({ state: 'revealed', tiebreaks: {} }, ballots)
    await userEvent.click(document.querySelector('main')!)
    expect(screen.getByRole('heading', { name: 'Undying Lack of Effort' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '← Back' }))
    expect(screen.getByText('Ready?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '← Back' })).toBeDisabled()
  })

  it('left arrow goes back', async () => {
    setup({ state: 'revealed', tiebreaks: {} }, ballots)
    await next(2)
    await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('heading', { name: 'Undying Lack of Effort' })).toBeInTheDocument()
  })

  it('shows "No votes" for a category nobody voted in', async () => {
    setup({ state: 'revealed', tiebreaks: {} })
    await next(2)
    expect(within(winnerCard()).getByText('No votes')).toBeInTheDocument()
  })

  it('shows the tie banner when first place is shared', async () => {
    setup({ state: 'revealed', tiebreaks: {} }, [ballot('1', { effort: 'a' }), ballot('2', { effort: 'b' })])
    await next(2)
    const card = winnerCard()
    expect(within(card).getByText("It's a tie!")).toBeInTheDocument()
    expect(within(card).getByText('Adams')).toBeInTheDocument()
    expect(within(card).getByText('Brown')).toBeInTheDocument()
  })

  it('shows "Won the tie-break" and the picked couple when the host broke the tie', async () => {
    setup({ state: 'revealed', tiebreaks: { effort: 'b' } }, [ballot('1', { effort: 'a' }), ballot('2', { effort: 'b' })])
    await next(2)
    const card = winnerCard()
    expect(within(card).getByText('Won the tie-break')).toBeInTheDocument()
    expect(within(card).queryByText("It's a tie!")).not.toBeInTheDocument()
    expect(card.querySelector('.option.big')).toHaveTextContent('Brown')
    expect(within(card).getAllByText('Adams')).toHaveLength(1) // runner-up only
  })

  it('ignores a tie-break set for a different category', async () => {
    setup({ state: 'revealed', tiebreaks: { icons: 'b' } }, [ballot('1', { effort: 'a' }), ballot('2', { effort: 'b' })])
    await next(2)
    expect(within(winnerCard()).getByText("It's a tie!")).toBeInTheDocument()
  })
})
