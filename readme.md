# Halloween Costume Contest

Couples-costume voting site for the Phair Halloween party, live at **https://party.phair.app**
(also https://phair-party.web.app).

Guests scan a QR code, say which couple they are, and vote in three categories. Hosts register
couples and run the contest from `/admin`.

## Categories

| Key       | Title                  | Meaning       |
| --------- | ---------------------- | ------------- |
| `icons`   | Eternal Icons          | Best          |
| `foolish` | Forever Foolish        | Funniest      |
| `effort`  | Undying Lack of Effort | Least effort  |

Defined once in `src/config.ts`.

## How it works

- **Stack:** Vite + React + TypeScript + React Router, plain CSS. Firebase Hosting, Firestore,
  Cloud Storage (couple photos), Anonymous Auth (guests) and Google sign-in (admins).
  No Cloud Functions; all rules live in `firestore.rules` and `storage.rules`.
- **Routes:** `/` guest ballot, `/admin` host console, `/winners` big-screen results (locked until revealed).
- **Contest state** (`config/contest`): `registration` → `voting` → `revealed`. Switch it in `/admin`.
  Voting is only accepted in `voting`; ballots become readable by guests only in `revealed`.
- **Ballots:** one per person, all three categories required, never for your own couple. A device
  may cast up to 2 (`ballots/{uid}_{1|2}`, both for the same couple) so a couple can share one phone.
  At most 2 ballots per couple across all devices, enforced with create-only claim docs
  `slots/{coupleId}_{1|2}` written in the same batch.
- **Ties:** shown as ties. In `/admin` the hosts can press **Make winner** on a tied couple
  (stored as `config/contest.tiebreaks.<category>`).
- **Admins:** `loveaphair@gmail.com`, `fredalyssa@gmail.com`. The list is duplicated in
  `src/config.ts`, `firestore.rules` and `storage.rules`; a test fails if they drift apart.

## Running the contest

1. `/admin` → sign in with Google → add each couple (last name, costume set, camera photo).
2. When everyone is registered, set the state to **Voting**.
3. When voting ends, set **Revealed** and put `/winners` on a TV. Break any ties first.
4. A wrong ballot (e.g. someone picked the wrong couple) can be deleted in `/admin` (listed newest first, labelled by couple name) so they can redo it.
5. Delete couples before voting opens, not after: ballots for a deleted couple count for nobody.

## Development

```sh
npm install
npm run dev        # local dev server
npm test           # unit tests (Firebase is fully mocked)
npm run build      # typecheck + production build into dist/
```

There is no Firebase emulator setup (it needs Java). The unit tests mock Firebase, and
`src/rules.test.ts` only checks the rules files for key guards. Test the real rules against the
live project with throwaway data and delete it afterwards.

## Deploying

```sh
firebase login                        # as loveaphair@gmail.com
npm run build
firebase deploy --project phair-party # hosting + firestore rules + storage rules
```

`party.phair.app` is a custom domain on Firebase Hosting; its DNS records live in Squarespace Domains.

## QR code

```sh
npm run qr                  # or: node scripts/make-qr.mjs <url>
```

Writes `print/qr.png`, `print/qr.svg` and `print/poster.html` (open the poster in a browser and print).

## Data and privacy

- Guests are anonymous Firebase users: no name or email is stored, only a random ID.
- Deleting a couple removes its Firestore doc and its photo file. Storage versioning and Firestore
  point-in-time recovery are off, so nothing is kept.
- Ballots are readable only by admins until the contest is revealed.
- The Firebase web config in `src/firebase.ts` is public by design; access is controlled by the rules.

## History

The 2025 version was two static HTML pages posting to a Google Apps Script / Sheet. It is in git
history before the `halloween-2026` branch.
