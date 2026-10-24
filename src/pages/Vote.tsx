import { useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { CATEGORIES, type CategoryKey, type Picks } from '../config'
import { CoupleLabel } from '../components'
import { useContest, useCouples, useMyBallots, useUser } from '../hooks'

export default function Vote() {
  const { user, ready } = useUser(true)
  const signedIn = !!user
  const state = useContest(signedIn)?.state ?? null
  const couples = useCouples(signedIn)
  const myBallots = useMyBallots(user?.uid)

  const [pickedMe, setPickedMe] = useState('')
  const [addingSecond, setAddingSecond] = useState(false)
  const [picks, setPicks] = useState<Partial<Picks>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!ready || !signedIn || state === null || myBallots === undefined) {
    return <Shell><p className="muted center">Loading…</p></Shell>
  }

  // Both people in a couple may share one device, but the second ballot must be for the same couple.
  const lockedId = myBallots[0]?.coupleId
  const meId = lockedId ?? pickedMe
  const setMeId = setPickedMe
  const showForm = myBallots.length === 0 || (myBallots.length === 1 && addingSecond && state === 'voting')

  if (myBallots.length > 0 && !showForm) {
    const canAddSecond = myBallots.length === 1 && state === 'voting'
    return (
      <Shell>
        <div className="card notice ok">
          <h2>✅ {myBallots.length === 1 ? 'One vote is in!' : 'Votes are in!'}</h2>
          <p>Thanks for voting. Winners will be announced soon.</p>
          {canAddSecond && (
            <>
              <p>Sharing this phone with your partner? They can vote here too.</p>
              <button className="primary" onClick={() => setAddingSecond(true)}>
                Vote as the second person
              </button>
            </>
          )}
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
    // A device has two ballot ids; use the free one.
    const taken = new Set((myBallots ?? []).map((b) => b.id))
    const ballotId = [1, 2].map((n) => `${user.uid}_${n}`).find((id) => !taken.has(id))
    if (!ballotId) return
    // Each couple has two slots across all devices; try the first, then the second.
    for (const n of [1, 2]) {
      const batch = writeBatch(db)
      batch.set(doc(db, 'ballots', ballotId), {
        coupleId: meId,
        picks,
        createdAt: serverTimestamp(),
      })
      batch.set(doc(db, 'slots', `${meId}_${n}`), { uid: user.uid, coupleId: meId, ballotId })
      try {
        await batch.commit()
        setPicks({})
        setAddingSecond(false)
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
      <p className="subtitle">One vote per person — pick a different couple in each category.</p>

      <section className="card">
        <h2>Which couple are you?</h2>
        <div className="options">
          {couples.map((c) => (
            <label key={c.id} className={`option ${meId === c.id ? 'selected' : ''}`}>
              <input
                type="radio"
                name="me"
                checked={meId === c.id}
                disabled={!!lockedId && lockedId !== c.id}
                onChange={() => setMeId(c.id)}
              />
              <CoupleLabel couple={c} />
            </label>
          ))}
        </div>
      </section>

      {meId &&
        CATEGORIES.map((cat) => (
          <section className="card" key={cat.key}>
            <h2>{cat.title}</h2>
            <p className="muted">{cat.blurb} — tap your pick again to clear it</p>
            <div className="options">
              {couples.map((c) => {
                const self = c.id === meId
                // A couple can only win one category per ballot, so lock ones picked elsewhere.
                const usedIn = CATEGORIES.find((o) => o.key !== cat.key && picks[o.key] === c.id)
                const locked = self || !!usedIn
                return (
                  <label
                    key={c.id}
                    className={`option ${picks[cat.key as CategoryKey] === c.id ? 'selected' : ''} ${locked ? 'disabled' : ''}`}
                  >
                    <input
                      type="radio"
                      name={cat.key}
                      disabled={locked}
                      checked={picks[cat.key as CategoryKey] === c.id}
                      onChange={() => setPicks((p) => ({ ...p, [cat.key]: c.id }))}
                      // A checked radio fires no change event, so tapping it again clears the pick.
                      onClick={() => {
                        if (picks[cat.key as CategoryKey] === c.id)
                          setPicks((p) => ({ ...p, [cat.key]: undefined }))
                      }}
                    />
                    <CoupleLabel couple={c} />
                    {self && <em className="muted note">that's you</em>}
                    {usedIn && <em className="muted note">used in {usedIn.short}</em>}
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
