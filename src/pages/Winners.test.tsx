import { render, screen, within } from '@testing-library/react'
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

const section = (title: string) => screen.getByRole('heading', { name: title }).closest('section')!

beforeEach(() => vi.clearAllMocks())

describe('Winners', () => {
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

  it('shows a clear winner and runner-up', () => {
    setup({ state: 'revealed', tiebreaks: {} }, [
      ballot('1', { icons: 'a' }),
      ballot('2', { icons: 'a' }),
      ballot('3', { icons: 'b' }),
    ])
    const icons = section('Eternal Icons')
    expect(within(icons).getByText('Adams')).toBeInTheDocument()
    expect(within(icons).getByText('Brown')).toBeInTheDocument()
    expect(within(icons).queryByText("It's a tie!")).not.toBeInTheDocument()
  })

  it('shows "No votes" for a category nobody voted in', () => {
    setup({ state: 'revealed', tiebreaks: {} })
    expect(screen.getAllByText('No votes')).toHaveLength(3)
  })

  it('shows the tie banner when first place is shared', () => {
    setup({ state: 'revealed', tiebreaks: {} }, [ballot('1', { icons: 'a' }), ballot('2', { icons: 'b' })])
    const icons = section('Eternal Icons')
    expect(within(icons).getByText("It's a tie!")).toBeInTheDocument()
    expect(within(icons).getByText('Adams')).toBeInTheDocument()
    expect(within(icons).getByText('Brown')).toBeInTheDocument()
  })

  it('shows "Won the tie-break" and only the picked couple when the host broke the tie', () => {
    setup({ state: 'revealed', tiebreaks: { icons: 'b' } }, [ballot('1', { icons: 'a' }), ballot('2', { icons: 'b' })])
    const icons = section('Eternal Icons')
    expect(within(icons).getByText('Won the tie-break')).toBeInTheDocument()
    expect(within(icons).queryByText("It's a tie!")).not.toBeInTheDocument()
    // Adams appears once, as a runner-up
    expect(within(icons).getAllByText('Adams')).toHaveLength(1)
    expect(icons.querySelector('.option.big')).toHaveTextContent('Brown')
  })

  it('ignores a tie-break in another category', () => {
    setup({ state: 'revealed', tiebreaks: { foolish: 'b' } }, [ballot('1', { icons: 'a' }), ballot('2', { icons: 'b' })])
    expect(within(section('Eternal Icons')).getByText("It's a tie!")).toBeInTheDocument()
  })
})
