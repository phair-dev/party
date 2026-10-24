// Usage: npm run emulators (in another terminal), then npm run seed.
// Loads sample couples, a contest state and ballots into the LOCAL Firestore emulator only.
const base = 'http://127.0.0.1:8080/v1/projects/phair-party/databases/(default)/documents'
const headers = { 'content-type': 'application/json', authorization: 'Bearer owner' } // bypasses rules

const str = (stringValue) => ({ stringValue })
async function put(path, fields) {
  const res = await fetch(`${base}/${path}`, { method: 'PATCH', headers, body: JSON.stringify({ fields }) })
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`)
}

const state = process.argv[2] ?? 'voting'
const couples = [
  ['a', 'Flintstone', 'Fred & Wilma'],
  ['b', 'Rubble-Johnson-Featherstonehaugh', 'Barney & Betty as a very long costume name'],
  ['c', 'Addams', 'Gomez & Morticia'],
  ['d', 'Jetson', 'George & Jane'],
  ['e', 'Simpson', 'Homer & Marge'],
]
await put('config/contest', { state: str(state) })
for (const [id, lastName, costume] of couples) await put(`couples/${id}`, { lastName: str(lastName), costume: str(costume) })

const pick = (icons, foolish, effort) => ({ mapValue: { fields: { icons: str(icons), foolish: str(foolish), effort: str(effort) } } })
const ballots = [
  ['x1_1', 'a', pick('b', 'c', 'd')],
  ['x2_1', 'a', pick('b', 'd', 'e')],
  ['x3_1', 'c', pick('a', 'd', 'b')],
  ['x3_2', 'c', pick('b', 'e', 'a')],
]
let t = Date.now() - 60_000
for (const [id, coupleId, picks] of ballots) {
  await put(`ballots/${id}`, { coupleId: str(coupleId), picks, createdAt: { timestampValue: new Date((t += 10_000)).toISOString() } })
}
console.log(`Seeded ${couples.length} couples, ${ballots.length} ballots, state=${state}`)
