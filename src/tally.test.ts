import { describe, expect, it } from 'vitest'
import { podium, tally } from './tally'
import { ballot, couple } from './testUtils'

const couples = [couple('a', 'Adams'), couple('b', 'Brown'), couple('c', 'Clark'), couple('d', 'Davis')]

describe('tally', () => {
  it('returns zero votes for everyone with no ballots', () => {
    const t = tally([], couples)
    expect(t.icons.map((s) => s.votes)).toEqual([0, 0, 0, 0])
    expect(Object.keys(t)).toEqual(['icons', 'foolish', 'effort'])
  })

  it('counts votes per category and sorts by votes descending', () => {
    const t = tally(
      [ballot('1', { icons: 'b' }), ballot('2', { icons: 'b' }), ballot('3', { icons: 'c', foolish: 'a' })],
      couples,
    )
    expect(t.icons.map((s) => [s.couple.id, s.votes])).toEqual([['b', 2], ['c', 1], ['a', 0], ['d', 0]])
    expect(t.foolish[0].couple.id).toBe('a')
  })

  it('orders equal votes by lastName', () => {
    const shuffled = [couples[3], couples[1], couples[0], couples[2]]
    const t = tally([], shuffled)
    expect(t.icons.map((s) => s.couple.lastName)).toEqual(['Adams', 'Brown', 'Clark', 'Davis'])
  })

  it('ignores ballots that reference a deleted couple', () => {
    const t = tally([ballot('1', { icons: 'ghost' }), ballot('2', { icons: 'a' })], couples)
    expect(t.icons).toHaveLength(4)
    expect(t.icons[0]).toMatchObject({ votes: 1 })
    expect(t.icons[0].couple.id).toBe('a')
  })
})

describe('podium', () => {
  const s = (id: string, votes: number) => ({ couple: couple(id, id), votes })

  it('has no winners when nobody has votes', () => {
    const p = podium([s('a', 0), s('b', 0)])
    expect(p).toMatchObject({ winners: [], runnersUp: [], tied: false, brokeTie: false, leaders: [] })
  })

  it('handles an empty standings list', () => {
    expect(podium([]).winners).toEqual([])
  })

  it('picks a single winner with runners-up', () => {
    const p = podium([s('a', 5), s('b', 3), s('c', 1), s('d', 0)])
    expect(p.winners.map((w) => w.couple.id)).toEqual(['a'])
    expect(p.runnersUp.map((w) => w.couple.id)).toEqual(['b', 'c'])
    expect(p.tied).toBe(false)
    expect(p.brokeTie).toBe(false)
  })

  it('reports a two-way tie', () => {
    const p = podium([s('a', 4), s('b', 4), s('c', 1)])
    expect(p.tied).toBe(true)
    expect(p.winners.map((w) => w.couple.id)).toEqual(['a', 'b'])
    expect(p.runnersUp.map((w) => w.couple.id)).toEqual(['c'])
  })

  it('reports a three-way tie', () => {
    const p = podium([s('a', 2), s('b', 2), s('c', 2), s('d', 1)])
    expect(p.tied).toBe(true)
    expect(p.leaders).toHaveLength(3)
    expect(p.runnersUp.map((w) => w.couple.id)).toEqual(['d'])
  })

  it('honours the host tie-break pick', () => {
    const p = podium([s('a', 4), s('b', 4), s('c', 1)], 'b')
    expect(p.winners.map((w) => w.couple.id)).toEqual(['b'])
    expect(p.brokeTie).toBe(true)
    expect(p.tied).toBe(false)
    expect(p.leaders).toHaveLength(2)
    // the loser of the tie-break becomes a runner-up
    expect(p.runnersUp.map((w) => w.couple.id)).toEqual(['a', 'c'])
  })

  it('ignores a stale tie-break id that is not among the leaders', () => {
    const p = podium([s('a', 4), s('b', 4), s('c', 1)], 'c')
    expect(p.tied).toBe(true)
    expect(p.brokeTie).toBe(false)
    expect(p.winners).toHaveLength(2)
  })

  it('ignores a tie-break id for a deleted couple', () => {
    const p = podium([s('a', 4), s('b', 4)], 'gone')
    expect(p.tied).toBe(true)
    expect(p.brokeTie).toBe(false)
  })

  it('ignores a tie-break pick when there is no tie', () => {
    const p = podium([s('a', 4), s('b', 2)], 'b')
    expect(p.winners.map((w) => w.couple.id)).toEqual(['a'])
    expect(p.brokeTie).toBe(false)
    expect(p.tied).toBe(false)
  })

  it('excludes zero-vote couples from runners-up and caps them at 2', () => {
    const p = podium([s('a', 9), s('b', 3), s('c', 2), s('d', 1), s('e', 1), s('f', 0)])
    expect(p.runnersUp.map((w) => w.couple.id)).toEqual(['b', 'c'])
    expect(podium([s('a', 1), s('b', 0)]).runnersUp).toEqual([])
  })
})
