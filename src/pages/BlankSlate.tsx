import titleImage from '../assets/shared-brains.jpg'
import { BLANK_SLATE_PROMPTS } from '../config'
import { isAdminUser, signInWithGoogle, useUser } from '../hooks'
import { FullscreenButton, StageNav, useStage } from '../stage'

// One extra step for the intro, then one per prompt.
const STEPS = BLANK_SLATE_PROMPTS.length + 1

export default function BlankSlate() {
  const { user, ready } = useUser(false)
  const { step, next, back, fullscreen, last } = useStage(STEPS)

  if (!ready) return <main className="container"><p className="muted center">Loading…</p></main>

  if (!isAdminUser(user)) {
    return (
      <main className="container">
        <h1>✍️ Blank Slate</h1>
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

  const prompt = step === 0 ? null : BLANK_SLATE_PROMPTS[step - 1]

  return (
    <main className="stage blank-slate" onClick={next}>
      {prompt === null ? (
        <>
          <img className="title-image" src={titleImage} alt="Shared Brains" />
          <div className="title-overlay">
            <FullscreenButton fullscreen={fullscreen} />
          </div>
        </>
      ) : (
        <>
          <div className="stage-body">
            <h1 className="prompt">{prompt.replace('[BLANK]', '____')}</h1>
            <StageNav step={step} last={last} back={back} next={next} />
          </div>
          <FullscreenButton fullscreen={fullscreen} />
        </>
      )}
    </main>
  )
}
