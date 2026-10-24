import { useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { CATEGORIES, type CategoryKey, type Picks } from '../config'
import { CoupleLabel } from '../components'
import { useContest, useCouples, useMyBallot, useUser } from '../hooks'

export default function Vote() {
  const { user, ready } = useUser(true)
  const signedIn = !!user
  const state = useContest(signedIn)?.state ?? null
  const couples = useCouples(signedIn)
  const myBallot = useMyBallot(user?.uid)

  const [meId, setMeId] = useState('')
  const [picks, setPicks] = useState<Partial<Picks>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!ready || !signedIn || state === null || myBallot === undefined) {
    return <Shell><p className="muted center">Loading…</p></Shell>
  }

  if (myBallot) {
    return (
      <Shell>
        <div className="card notice ok">
          <h2>✅ Votes are in!</h2>
          <p>Thanks for voting. Winners will be announced soon.</p>
          {state === 'revealed' && <Link to="/winners">See the winners →</Link>}
        </div>
      </Shell>
    )
  }

  if (state === 'registration') {
    return (
      <Shell>
        <div className="card notice">
          <h2>Voting opens soon</h2>
          <p>Check back after everyone has arrived.</p>
        </div>
      </Shell>
    )
  }

  if (state === 'revealed') {
    return (
      <Shell>
        <div className="card notice">
          <h2>Voting is closed</h2>
          <Link to="/winners">See the winners →</Link>
        </div>
      </Shell>
    )
  }

  const complete = !!meId && CATEGORIES.every((c) => picks[c.key])

  async function submit() {
    if (!user || !complete) return
    setBusy(true)
    setError('')
    // Each couple has two ballot slots; try the first, then the second.
    for (const n of [1, 2]) {
      const batch = writeBatch(db)
      batch.set(doc(db, 'ballots', user.uid), {
        coupleId: meId,
        picks,
        createdAt: serverTimestamp(),
      })
      batch.set(doc(db, 'slots', `${meId}_${n}`), { uid: user.uid, coupleId: meId })
      try {
        await batch.commit()
        setBusy(false)
        return
      } catch (e) {
        console.error(e)
        // Only a rules rejection can mean "slot taken"; anything else is a connection problem.
        if ((e as { code?: string }).code !== 'permission-denied') {
          setError('Could not reach the server. Check your connection and try again.')
          setBusy(false)
          return
        }
      }
    }
    setError(
      'Could not submit. Voting may have just closed, or two people from your couple have already voted — ask a host.',
    )
    setBusy(false)
  }

  return (
    <Shell>
      <p className="subtitle">One vote per person — make it count!</p>

      <section className="card">
        <h2>Which couple are you?</h2>
        <div className="options">
          {couples.map((c) => (
            <label key={c.id} className={`option ${meId === c.id ? 'selected' : ''}`}>
              <input type="radio" name="me" checked={meId === c.id} onChange={() => setMeId(c.id)} />
              <CoupleLabel couple={c} />
            </label>
          ))}
        </div>
      </section>

      {meId &&
        CATEGORIES.map((cat) => (
          <section className="card" key={cat.key}>
            <h2>{cat.title}</h2>
            <p className="muted">{cat.blurb}</p>
            <div className="options">
              {couples.map((c) => {
                const self = c.id === meId
                return (
                  <label
                    key={c.id}
                    className={`option ${picks[cat.key as CategoryKey] === c.id ? 'selected' : ''} ${self ? 'disabled' : ''}`}
                  >
                    <input
                      type="radio"
                      name={cat.key}
                      disabled={self}
                      checked={picks[cat.key as CategoryKey] === c.id}
                      onChange={() => setPicks((p) => ({ ...p, [cat.key]: c.id }))}
                    />
                    <CoupleLabel couple={c} />
                    {self && <em className="muted">that's you</em>}
                  </label>
                )
              })}
            </div>
          </section>
        ))}

      {error && <div className="card notice err">{error}</div>}
      <button className="primary" disabled={!complete || busy} onClick={submit}>
        {busy ? 'Submitting…' : 'Submit votes'}
      </button>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="container">
      <h1>🎃 Costume Contest 🎃</h1>
      {children}
    </main>
  )
}
