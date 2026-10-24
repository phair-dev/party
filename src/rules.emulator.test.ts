// Behavioural tests for firestore.rules against the Firestore emulator.
// Run with `npm run test:rules` (needs Java). Complements the text-based drift guard in rules.test.ts.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'phair-party',
    firestore: { rules: readFileSync(resolve(__dirname, '..', 'firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
afterAll(() => env.cleanup())

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'config', 'contest'), { state: 'voting' })
    for (const id of ['a', 'b', 'c', 'd', 'e']) await setDoc(doc(db, 'couples', id), { lastName: id, costume: id })
  })
})

const picks = { icons: 'b', foolish: 'c', effort: 'd' }

// Casts one ballot (plus its couple slot claim) the way Vote.tsx does.
function cast(uid: string, n: number, coupleId: string, slot: number, p: Record<string, string> = picks) {
  const db = env.authenticatedContext(uid).firestore()
  const batch = writeBatch(db)
  const ballotId = `${uid}_${n}`
  batch.set(doc(db, 'ballots', ballotId), { coupleId, picks: p, createdAt: serverTimestamp() })
  batch.set(doc(db, 'slots', `${coupleId}_${slot}`), { uid, coupleId, ballotId })
  return batch.commit()
}

describe('ballots', () => {
  it('accepts a valid ballot', async () => {
    await assertSucceeds(cast('u1', 1, 'a', 1))
  })

  it('lets one device cast a second ballot for the same couple', async () => {
    await assertSucceeds(cast('u1', 1, 'a', 1))
    await assertSucceeds(cast('u1', 2, 'a', 2))
  })

  it('blocks a device from casting a third ballot', async () => {
    await assertSucceeds(cast('u1', 1, 'a', 1))
    await assertSucceeds(cast('u1', 2, 'a', 2))
    await assertFails(cast('u1', 3, 'a', 1))
  })

  it('blocks a device second ballot for a different couple', async () => {
    await assertSucceeds(cast('u1', 1, 'a', 1))
    await assertFails(cast('u1', 2, 'c', 1))
  })

  it('blocks a third ballot for a couple across devices', async () => {
    await assertSucceeds(cast('u1', 1, 'a', 1))
    await assertSucceeds(cast('u2', 1, 'a', 2))
    await assertFails(cast('u3', 1, 'a', 1))
    await assertFails(cast('u3', 1, 'a', 2))
  })

  it('blocks voting for yourself or the same couple in two categories', async () => {
    await assertFails(cast('u1', 1, 'a', 1, { icons: 'a', foolish: 'c', effort: 'd' }))
    await assertFails(cast('u1', 1, 'a', 1, { icons: 'b', foolish: 'b', effort: 'd' }))
  })

  it('blocks voting outside the voting state', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'config', 'contest'), { state: 'registration' }))
    await assertFails(cast('u1', 1, 'a', 1))
  })

  it('blocks writing under another device id', async () => {
    const db = env.authenticatedContext('u1').firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, 'ballots', 'u2_1'), { coupleId: 'a', picks, createdAt: serverTimestamp() })
    batch.set(doc(db, 'slots', 'a_1'), { uid: 'u1', coupleId: 'a', ballotId: 'u2_1' })
    await assertFails(batch.commit())
  })
})
