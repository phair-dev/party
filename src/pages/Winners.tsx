import { CATEGORIES } from '../config'
import { CoupleLabel } from '../components'
import { podium, tally } from '../tally'
import { useBallots, useContest, useCouples, useUser } from '../hooks'

export default function Winners() {
  const { user } = useUser(true)
  const contest = useContest(!!user)
  const state = contest?.state ?? null
  const revealed = state === 'revealed'
  const couples = useCouples(!!user)
  const ballots = useBallots(!!user && revealed)

  if (!revealed) {
    return (
      <main className="container wide">
        <h1>🎃 Costume Contest 🎃</h1>
        <p className="subtitle big">{state === null ? 'Loading…' : 'Winners coming soon…'}</p>
      </main>
    )
  }

  const standings = tally(ballots, couples)

  return (
    <main className="container wide">
      <h1>🏆 And the winners are… 🏆</h1>
      {CATEGORIES.map((cat) => {
        const { winners, runnersUp, tied, brokeTie } = podium(standings[cat.key], contest?.tiebreaks[cat.key])
        return (
          <section className="card winner" key={cat.key}>
            <h2>{cat.title}</h2>
            {winners.length === 0 && <p className="muted">No votes</p>}
            {tied && <p className="muted">It's a tie!</p>}
            {brokeTie && <p className="muted">Won the tie-break</p>}
            {winners.map((w) => (
              <div className="option big" key={w.couple.id}>
                <CoupleLabel couple={w.couple} />
                <span className="count">{w.votes}</span>
              </div>
            ))}
            {runnersUp.map((r) => (
              <div className="option runner-up" key={r.couple.id}>
                <CoupleLabel couple={r.couple} />
                <span className="count">{r.votes}</span>
              </div>
            ))}
          </section>
        )
      })}
    </main>
  )
}
