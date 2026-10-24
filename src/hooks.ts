import { useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  type User,
} from 'firebase/auth'
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { auth, db } from './firebase'
import { ADMIN_EMAILS, type Ballot, type Contest, type Couple } from './config'

export function useUser(anonymousFallback: boolean) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u)
        setReady(true)
        if (!u && anonymousFallback) signInAnonymously(auth).catch(console.error)
      }),
    [anonymousFallback],
  )

  return { user, ready }
}

export const signInWithGoogle = () => signInWithPopup(auth, new GoogleAuthProvider())

export const isAdminUser = (user: User | null) =>
  !!user?.email && ADMIN_EMAILS.includes(user.email)

export function useContest(enabled: boolean) {
  const [contest, setContest] = useState<Contest | null>(null)
  useEffect(() => {
    if (!enabled) return
    return onSnapshot(doc(db, 'config', 'contest'), (snap) => {
      const d = snap.data()
      setContest({ state: d?.state ?? 'registration', tiebreaks: d?.tiebreaks ?? {} })
    })
  }, [enabled])
  return contest
}

export function useCouples(enabled: boolean) {
  const [couples, setCouples] = useState<Couple[]>([])
  useEffect(() => {
    if (!enabled) return
    return onSnapshot(query(collection(db, 'couples'), orderBy('lastName')), (snap) =>
      setCouples(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Couple, 'id'>) }))),
    )
  }, [enabled])
  return couples
}

export function useBallots(enabled: boolean) {
  const [ballots, setBallots] = useState<Ballot[]>([])
  useEffect(() => {
    if (!enabled) return
    return onSnapshot(collection(db, 'ballots'), (snap) =>
      setBallots(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Ballot, 'id'>) }))),
    )
  }, [enabled])
  return ballots
}

export function useMyBallots(uid: string | undefined) {
  // undefined = still loading, [] = hasn't voted. A device holds up to 2 ballots.
  const [found, setFound] = useState<Record<string, Ballot | null>>({})
  useEffect(() => {
    if (!uid) return
    const unsubs = [1, 2].map((n) => {
      const id = `${uid}_${n}`
      return onSnapshot(doc(db, 'ballots', id), (snap) =>
        setFound((f) => ({
          ...f,
          [id]: snap.exists() ? { id, ...(snap.data() as Omit<Ballot, 'id'>) } : null,
        })),
      )
    })
    return () => unsubs.forEach((u) => u())
  }, [uid])
  if (!uid || !(`${uid}_1` in found) || !(`${uid}_2` in found)) return undefined
  return [found[`${uid}_1`], found[`${uid}_2`]].filter((b): b is Ballot => !!b)
}
