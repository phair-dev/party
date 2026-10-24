// DRIFT GUARD, not a behavioural test: the Firebase emulator needs Java, which is
// unavailable here, so these tests only read the rules files as text and assert that
// key guards are still present and that the admin allow-lists have not drifted.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ADMIN_EMAILS } from './config'

const read = (f: string) => readFileSync(resolve(__dirname, '..', f), 'utf8')
const firestore = read('firestore.rules')
const storage = read('storage.rules')

const emailsIn = (rules: string) => {
  const m = rules.match(/request\.auth\.token\.email in \[([^\]]*)\]/)
  expect(m, 'admin email list not found').not.toBeNull()
  return [...m![1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}

describe('admin allow-list', () => {
  it('matches between firestore.rules, storage.rules and config.ts', () => {
    expect(emailsIn(firestore).sort()).toEqual([...ADMIN_EMAILS].sort())
    expect(emailsIn(storage).sort()).toEqual([...ADMIN_EMAILS].sort())
  })

  it('requires a verified email in both rule files', () => {
    expect(firestore).toContain('request.auth.token.email_verified == true')
    expect(storage).toContain('request.auth.token.email_verified == true')
  })
})

describe('firestore.rules guards', () => {
  const ballots = firestore.slice(firestore.indexOf('match /ballots/{ballotId}'), firestore.indexOf('match /slots/'))
  const slots = firestore.slice(firestore.indexOf('match /slots/'))

  it('only allows ballot creation while voting, by the owner, with a valid ballot', () => {
    const create = ballots.match(/allow create:[^;]*;/)![0]
    expect(create).toContain("contestState() == 'voting'")
    expect(create).toContain("ballotId in [request.auth.uid + '_1', request.auth.uid + '_2']")
    expect(create).toContain('validBallot(request.resource.data, ballotId)')
  })

  it('does not let guests update or delete ballots', () => {
    expect(ballots).not.toMatch(/allow (update|write)/)
    expect(ballots.match(/allow delete:[^;]*;/)![0]).toContain('isAdmin()')
  })

  it('forbids voting for your own couple in every category', () => {
    for (const k of ['icons', 'foolish', 'effort']) {
      expect(firestore).toContain(`d.picks.${k} != d.coupleId`)
    }
  })

  it('forbids picking the same couple in more than one category', () => {
    for (const pair of ['icons != d.picks.foolish', 'icons != d.picks.effort', 'foolish != d.picks.effort']) {
      expect(firestore).toContain(`d.picks.${pair}`)
    }
  })

  it('requires picks to be exactly the three categories and to exist', () => {
    expect(firestore).toContain("d.picks.keys().hasOnly(['icons', 'foolish', 'effort'])")
    expect(firestore).toContain('exists(couplePath(d.picks.icons))')
    expect(firestore).toContain('exists(couplePath(d.coupleId))')
  })

  it('requires a slot claim and limits slot ids to _1 and _2', () => {
    expect(firestore).toContain('claimsSlot(d.coupleId, ballotId)')
    expect(firestore).toContain('sameCoupleAsFirst(ballotId, d.coupleId)')
    expect(slots).toContain("slot in [request.resource.data.coupleId + '_1', request.resource.data.coupleId + '_2']")
    expect(slots).not.toMatch(/_3/)
    expect(slots.match(/allow create:[^;]*;/)![0]).toContain("contestState() == 'voting'")
  })

  it('keeps slots unreadable to guests and not updatable', () => {
    expect(slots.match(/allow read:[^;]*;/)![0]).toBe('allow read: if isAdmin();')
    expect(slots).not.toMatch(/allow (update|write)/)
  })

  it('restricts contest config writes to admins and known states', () => {
    const cfg = firestore.slice(firestore.indexOf('match /config/contest'), firestore.indexOf('match /couples/'))
    expect(cfg).toContain('allow write: if isAdmin()')
    expect(cfg).toContain("in ['registration', 'voting', 'revealed']")
  })

  it('restricts couple writes to admins', () => {
    const c = firestore.slice(firestore.indexOf('match /couples/'), firestore.indexOf('match /ballots/'))
    expect(c).toContain('allow write: if isAdmin()')
  })
})

describe('storage.rules guards', () => {
  it('limits uploads to admins, images, under 3MB', () => {
    expect(storage).toContain('allow create, update: if isAdmin()')
    expect(storage).toContain('request.resource.size < 3 * 1024 * 1024')
    expect(storage).toContain("request.resource.contentType.matches('image/.*')")
  })

  it('only lets admins delete', () => {
    expect(storage).toContain('allow delete: if isAdmin()')
  })
})
