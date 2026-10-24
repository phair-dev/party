import { CATEGORIES, REVEAL_ORDER, type CategoryKey } from '../config'
import { CoupleLabel } from '../components'
import { podium, tally, type Podium } from '../tally'
import { useBallots, useContest, useCouples, useUser } from '../hooks'
import { FullscreenButton, StageNav, useStage } from '../stage'

type Slide =
  | { kind: 'intro' }
  | { kind: 'teaser'; category: CategoryKey }
  | { kind: 'winner'; category: CategoryKey }
  | { kind: 'recap' }

// intro, then (category title, then its winner) per category, then a recap.
const SLIDES: Slide[] = [
  { kind: 'intro' },
  ...REVEAL_ORDER.flatMap((category): Slide[] => [
    { kind: 'teaser', category },
    { kind: 'winner', category },
  ]),
  { kind: 'recap' },
]

const titleOf = (key: CategoryKey) => CATEGORIES.find((c) => c.key === key)!

export default function Winners() {
  const { user } = useUser(true)
  const contest = useContest(!!user)
  const state = contest?.state ?? null
  const revealed = state === 'revealed'
  const couples = useCouples(!!user)
  const ballots = useBallots(!!user && revealed)
  const { step, next, back, fullscreen, last } = useStage(SLIDES.length)

  if (!revealed) {
    return (
      <main className="container wide">
        <h1>🎃 Costume Contest 🎃</h1>
        <p className="subtitle big">{state === null ? 'Loading…' : 'Winners coming soon…'}</p>
      </main>
    )
  }

  const standings = tally(ballots, couples)
  const podiumOf = (key: CategoryKey) => podium(standings[key], contest?.tiebreaks[key])
  const slide = SLIDES[step]

  return (
    <main className="stage" onClick={next}>
      <div className="stage-body">
        {slide.kind === 'intro' && (
          <>
            <h1>🏆 The Winners 🏆</h1>
            <p className="subtitle big">Ready?</p>
          </>
        )}

        {slide.kind === 'teaser' && (
          <>
            <p className="muted">And the award for…</p>
            <h1 className="huge">{titleOf(slide.category).title}</h1>
            <p className="subtitle big">{titleOf(slide.category).blurb}</p>
          </>
        )}

        {slide.kind === 'winner' && (
          <section className="card winner">
            <h2>{titleOf(slide.category).title}</h2>
            <PodiumView p={podiumOf(slide.category)} />
          </section>
        )}

        {slide.kind === 'recap' && (
          <>
            <h1>🎃 Congratulations! 🎃</h1>
            {REVEAL_ORDER.map((key) => {
              const { winners } = podiumOf(key)
              return (
                <section className="card winner" key={key}>
                  <h2>{titleOf(key).title}</h2>
                  {winners.length === 0 && <p className="muted">No votes</p>}
                  {winners.map((w) => (
                    <div className="option" key={w.couple.id}>
                      <CoupleLabel couple={w.couple} />
                    </div>
                  ))}
                </section>
              )
            })}
          </>
        )}

        <StageNav step={step} last={last} back={back} next={next} />
      </div>
      <FullscreenButton fullscreen={fullscreen} />
    </main>
  )
}

function PodiumView({ p }: { p: Podium }) {
  return (
    <>
      {p.winners.length === 0 && <p className="muted">No votes</p>}
      {p.tied && <p className="muted">It's a tie!</p>}
      {p.brokeTie && <p className="muted">Won the tie-break</p>}
      {p.winners.map((w) => (
        <div className="option big" key={w.couple.id}>
          <CoupleLabel couple={w.couple} />
          <span className="count">{w.votes}</span>
        </div>
      ))}
      {p.runnersUp.map((r) => (
        <div className="option runner-up" key={r.couple.id}>
          <CoupleLabel couple={r.couple} />
          <span className="count">{r.votes}</span>
        </div>
      ))}
    </>
  )
}
