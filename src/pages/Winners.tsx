import { useEffect, useState } from 'react'
import { CATEGORIES, REVEAL_ORDER, type CategoryKey } from '../config'
import { CoupleLabel } from '../components'
import { podium, tally, type Podium } from '../tally'
import { useBallots, useContest, useCouples, useUser } from '../hooks'

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

const fullscreenSupported = () => 'requestFullscreen' in document.documentElement

const titleOf = (key: CategoryKey) => CATEGORIES.find((c) => c.key === key)!

export default function Winners() {
  const { user } = useUser(true)
  const contest = useContest(!!user)
  const state = contest?.state ?? null
  const revealed = state === 'revealed'
  const couples = useCouples(!!user)
  const ballots = useBallots(!!user && revealed)
  const [step, setStep] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  // Not available everywhere (e.g. iPhone Safari), so the button hides itself there.
  const canFullscreen = fullscreenSupported()

  const toggleFullscreen = () =>
    (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(
      console.error,
    )

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setStep((s) => Math.min(s + 1, SLIDES.length - 1))
      } else if (e.key === 'f' && fullscreenSupported()) {
        toggleFullscreen()
      } else if (e.key === 'ArrowLeft') {
        setStep((s) => Math.max(s - 1, 0))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
  const last = step === SLIDES.length - 1

  return (
    <main className="stage" onClick={() => setStep((s) => Math.min(s + 1, SLIDES.length - 1))}>
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

      <footer className="stage-nav" onClick={(e) => e.stopPropagation()}>
        <div className="stage-nav-main">
          <button disabled={step === 0} onClick={() => setStep((s) => Math.max(s - 1, 0))}>
            ← Back
          </button>
          <button disabled={last} onClick={() => setStep((s) => Math.min(s + 1, SLIDES.length - 1))}>
            Continue →
          </button>
        </div>
        {canFullscreen && (
          <button className="small" onClick={toggleFullscreen}>
            {fullscreen ? 'Exit full screen' : 'Full screen'}
          </button>
        )}
      </footer>
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
