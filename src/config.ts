export const CATEGORIES = [
  { key: 'icons', title: 'Eternal Icons', blurb: 'Best costume' },
  { key: 'foolish', title: 'Forever Foolish', blurb: 'Funniest costume' },
  { key: 'effort', title: 'Undying Lack of Effort', blurb: 'Least effort' },
] as const

export type CategoryKey = (typeof CATEGORIES)[number]['key']

// Order the winners are announced on /winners: build up to the best.
export const REVEAL_ORDER: readonly CategoryKey[] = ['effort', 'foolish', 'icons']
export type Picks = Record<CategoryKey, string>

export type ContestState = 'registration' | 'voting' | 'revealed'

// Host-chosen winners for categories that ended in a tie for first.
export type Tiebreaks = Partial<Record<CategoryKey, string>>

export interface Contest {
  state: ContestState
  tiebreaks: Tiebreaks
}

export interface Couple {
  id: string
  lastName: string
  costume: string
  photoUrl?: string
}

export interface Ballot {
  uid: string
  coupleId: string
  picks: Picks
}

// Keep in sync with the allow-lists in firestore.rules and storage.rules.
export const ADMIN_EMAILS = ['loveaphair@gmail.com', 'fredalyssa@gmail.com']
