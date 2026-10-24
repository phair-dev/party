import titleImage from '../assets/trivia/title.jpg'
import { isAdminUser, signInWithGoogle, useUser } from '../hooks'
import { FullscreenButton, StageNav, useStage, useTabIdentity } from '../stage'
import { TRIVIA } from '../trivia'

// One step for the title, then two per duo: the prompt, then the answer with its source image.
const STEPS = TRIVIA.length * 2 + 1

export default function Trivia() {
  const { user, ready } = useUser(false)
  useTabIdentity('Immortal Duos', '📝')
  const { step, next, back, fullscreen, last } = useStage(STEPS)

  if (!ready) return <main className="container"><p className="muted center">Loading…</p></main>

  if (!isAdminUser(user)) {
    return (
      <main className="container">
        <h1>🧠 Immortal Duos</h1>
        {user ? (
          <div className="card notice err">{user.email} is not an admin.</div>
        ) : (
          <button className="primary" onClick={() => signInWithGoogle().catch(console.error)}>
            Sign in with Google
          </button>
        )}
      </main>
    )
  }

  if (step === 0) {
    return (
      <main className="stage trivia" onClick={next}>
        <img className="title-image" src={titleImage} alt="Immortal Duos" />
        <div className="title-overlay">
          <FullscreenButton fullscreen={fullscreen} />
        </div>
      </main>
    )
  }

  const index = Math.floor((step - 1) / 2)
  const item = TRIVIA[index]
  const revealed = step % 2 === 0

  return (
    <main className="stage trivia" onClick={next}>
      <div className="stage-body">
        <p className="trivia-category">
          {item.category} · {index + 1} of {TRIVIA.length}
        </p>
        <h1 className="trivia-duo">
          {item.prompt} &amp; <span className={revealed ? 'answer' : 'blank'}>{revealed ? item.answer : '____'}</span>
        </h1>
        {revealed ? (
          <>
            <img className="trivia-art" src={item.image} alt={item.source} />
            <p className="trivia-source">{item.source}</p>
          </>
        ) : null}
        <StageNav step={step} last={last} back={back} next={next} />
      </div>
      <FullscreenButton fullscreen={fullscreen} />
    </main>
  )
}
