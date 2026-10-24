import { useRef, useState } from 'react'
import { signOut } from 'firebase/auth'
import {
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { auth, db, storage } from '../firebase'
import { CATEGORIES, type Ballot, type ContestState, type Couple } from '../config'
import { CoupleLabel } from '../components'
import { resizePhoto } from '../photo'
import { podium, tally } from '../tally'
import { isAdminUser, signInWithGoogle, useBallots, useContest, useCouples, useUser } from '../hooks'

const STATES: { key: ContestState; label: string }[] = [
  { key: 'registration', label: 'Registration' },
  { key: 'voting', label: 'Voting' },
  { key: 'revealed', label: 'Revealed' },
]

async function uploadPhoto(coupleId: string, file: File) {
  const blob = await resizePhoto(file)
  const r = ref(storage, `couples/${coupleId}.jpg`)
  await uploadBytes(r, blob, { contentType: 'image/jpeg' })
  return getDownloadURL(r)
}

export default function Admin() {
  const { user, ready } = useUser(false)
  const admin = isAdminUser(user)
  const contest = useContest(admin)
  const state = contest?.state
  const couples = useCouples(admin)
  const ballots = useBallots(admin)

  if (!ready) return <main className="container"><p className="muted center">Loading…</p></main>

  if (!user) {
    return (
      <main className="container">
        <h1>🎃 Admin</h1>
        <button className="primary" onClick={() => signInWithGoogle().catch(console.error)}>
          Sign in with Google
        </button>
      </main>
    )
  }

  if (!admin) {
    return (
      <main className="container">
        <h1>🎃 Admin</h1>
        <div className="card notice err">{user.email} is not an admin.</div>
        <button onClick={() => signOut(auth)}>Sign out</button>
      </main>
    )
  }

  const standings = tally(ballots, couples)
  const byId = new Map(couples.map((c) => [c.id, c]))

  // Newest first, so "undo my vote" requests are at the top. A just-cast ballot has no server time yet.
  const newestFirst = [...ballots].sort(
    (a, b) => (b.createdAt?.toMillis() ?? Infinity) - (a.createdAt?.toMillis() ?? Infinity),
  )

  async function deleteBallot(b: Ballot) {
    const name = byId.get(b.coupleId)?.lastName ?? 'this couple'
    if (!confirm(`Delete one ballot cast as ${name} so they can vote again?`)) return
    const slots = await getDocs(query(collection(db, 'slots'), where('ballotId', '==', b.id)))
    const batch = writeBatch(db)
    batch.delete(doc(db, 'ballots', b.id))
    slots.forEach((s) => batch.delete(s.ref))
    await batch.commit()
  }

  function pickWinner(category: string, coupleId: string, current?: string) {
    return updateDoc(doc(db, 'config', 'contest'), {
      [`tiebreaks.${category}`]: current === coupleId ? deleteField() : coupleId,
    })
  }

  return (
    <main className="container wide">
      <h1>🎃 Admin</h1>

      <section className="card">
        <h2>Contest state</h2>
        <div className="segmented">
          {STATES.map((s) => (
            <button
              key={s.key}
              className={state === s.key ? 'primary' : ''}
              onClick={() => setDoc(doc(db, 'config', 'contest'), { state: s.key }, { merge: true })}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="muted">
          Registration: guests wait. Voting: ballots open. Revealed: the <a href="/winners">winners page</a> goes live.
        </p>
        <p className="muted">
          Game night: the <a href="/blank-slate">Blank Slate prompts</a> (admin sign-in required).
          {' '}The <a href="/trivia">Immortal Duos answers</a> too.
        </p>
      </section>

      <AddCouple />

      <section className="card">
        <h2>Couples ({couples.length})</h2>
        {couples.map((c) => (
          <CoupleRow key={c.id} couple={c} />
        ))}
      </section>

      <section className="card">
        <h2>Results — {ballots.length} ballots</h2>
        {CATEGORIES.map((cat) => {
          const { leaders } = podium(standings[cat.key])
          return (
          <div key={cat.key}>
            <h3>{cat.title}</h3>
            {standings[cat.key]
              .filter((s) => s.votes > 0)
              .map((s) => (
                <div className="option" key={s.couple.id}>
                  <CoupleLabel couple={s.couple} />
                  <span className="count">{s.votes}</span>
                  {leaders.length > 1 && leaders.includes(s) && (
                    <button onClick={() => pickWinner(cat.key, s.couple.id, contest?.tiebreaks[cat.key])}>
                      {contest?.tiebreaks[cat.key] === s.couple.id ? '★ Winner (undo)' : 'Make winner'}
                    </button>
                  )}
                </div>
              ))}
          </div>
          )
        })}
      </section>

      <section className="card">
        <h2>Ballots</h2>
        <p className="muted">Newest first — the latest ballot is at the top.</p>
        {newestFirst.map((b) => (
          <div className="option" key={b.id}>
            <span className="couple-text">
              <strong>{byId.get(b.coupleId)?.lastName ?? '(deleted couple)'}</strong>
              <small>{b.createdAt ? new Date(b.createdAt.toMillis()).toLocaleTimeString() : 'just now'}</small>
            </span>
            <button className="danger" onClick={() => deleteBallot(b)}>Delete</button>
          </div>
        ))}
      </section>

      <button onClick={() => signOut(auth)}>Sign out</button>
    </main>
  )
}

function AddCouple() {
  const [lastName, setLastName] = useState('')
  const [costume, setCostume] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lastRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!lastName.trim() || !costume.trim()) return
    setBusy(true)
    setError('')
    try {
      const id = doc(collection(db, 'couples')).id
      const photoUrl = photo ? await uploadPhoto(id, photo) : undefined
      await setDoc(doc(db, 'couples', id), {
        lastName: lastName.trim(),
        costume: costume.trim(),
        ...(photoUrl ? { photoUrl } : {}),
        createdAt: serverTimestamp(),
      })
      setLastName('')
      setCostume('')
      setPhoto(null)
      if (fileRef.current) fileRef.current.value = ''
      lastRef.current?.focus()
    } catch (err) {
      console.error(err)
      setError('Could not save — check your connection and try again.')
    }
    setBusy(false)
  }

  return (
    <section className="card">
      <h2>Add couple</h2>
      <form onSubmit={add}>
        <input ref={lastRef} placeholder="Last name (Jones)" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <input placeholder="Costume (Fred & Wilma)" value={costume} onChange={(e) => setCostume(e.target.value)} />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
        <button className="primary" disabled={busy || !lastName.trim() || !costume.trim()}>
          {busy ? 'Saving…' : 'Add couple'}
        </button>
        {error && <p className="err-text">{error}</p>}
      </form>
    </section>
  )
}

function CoupleRow({ couple }: { couple: Couple }) {
  const [editing, setEditing] = useState(false)
  const [lastName, setLastName] = useState(couple.lastName)
  const [costume, setCostume] = useState(couple.costume)
  const [photo, setPhoto] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      const photoUrl = photo ? await uploadPhoto(couple.id, photo) : couple.photoUrl
      await updateDoc(doc(db, 'couples', couple.id), {
        lastName: lastName.trim(),
        costume: costume.trim(),
        ...(photoUrl ? { photoUrl } : {}),
      })
      setEditing(false)
      setPhoto(null)
    } catch (err) {
      console.error(err)
      alert('Could not save.')
    }
    setBusy(false)
  }

  async function remove() {
    if (!confirm(`Delete ${couple.lastName} (${couple.costume})?`)) return
    await deleteDoc(doc(db, 'couples', couple.id))
    await deleteObject(ref(storage, `couples/${couple.id}.jpg`)).catch((e) => {
      // No photo is fine; anything else means the file may still be stored.
      if (e?.code !== 'storage/object-not-found') alert(`Couple deleted, but the photo could not be removed: ${e?.message}`)
    })
  }

  if (!editing) {
    return (
      <div className="option">
        <CoupleLabel couple={couple} />
        <button onClick={() => setEditing(true)}>Edit</button>
        <button className="danger" onClick={remove}>Delete</button>
      </div>
    )
  }

  return (
    <div className="option edit">
      <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
      <input value={costume} onChange={(e) => setCostume(e.target.value)} />
      <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
      <button className="primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      <button onClick={() => setEditing(false)}>Cancel</button>
    </div>
  )
}
