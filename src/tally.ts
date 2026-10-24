import { CATEGORIES, type Ballot, type CategoryKey, type Couple } from './config'

export interface Standing {
  couple: Couple
  votes: number
}

export function tally(ballots: Ballot[], couples: Couple[]): Record<CategoryKey, Standing[]> {
  const result = {} as Record<CategoryKey, Standing[]>
  for (const { key } of CATEGORIES) {
    const counts = new Map<string, number>()
    for (const b of ballots) counts.set(b.picks[key], (counts.get(b.picks[key]) ?? 0) + 1)
    result[key] = couples
      .map((couple) => ({ couple, votes: counts.get(couple.id) ?? 0 }))
      .sort((a, b) => b.votes - a.votes || a.couple.lastName.localeCompare(b.couple.lastName))
  }
  return result
}

export interface Podium {
  winners: Standing[]
  runnersUp: Standing[]
  tied: boolean // several couples share first and the host hasn't picked one
  brokeTie: boolean // the host picked one of several couples sharing first
  leaders: Standing[] // everyone sharing first place (empty when nobody has votes)
}

export function podium(standings: Standing[], tiebreakId?: string): Podium {
  const top = standings[0]?.votes ?? 0
  const leaders = top > 0 ? standings.filter((s) => s.votes === top) : []
  const pick = leaders.length > 1 ? leaders.find((s) => s.couple.id === tiebreakId) : undefined
  const winners = pick ? [pick] : leaders
  const runnersUp = standings.filter((s) => s.votes > 0 && !winners.includes(s)).slice(0, 2)
  return { winners, runnersUp, tied: leaders.length > 1 && !pick, brokeTie: !!pick, leaders }
}
