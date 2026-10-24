export const CATEGORIES = [
  { key: 'icons', title: 'Eternal Icons', short: 'Icons', blurb: 'Best costume' },
  { key: 'foolish', title: 'Forever Foolish', short: 'Foolish', blurb: 'Funniest costume' },
  { key: 'effort', title: 'Undying Lack of Effort', short: 'Effort', blurb: 'Least effort' },
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
  id: string // `${uid}_${1|2}`: a device can cast at most 2
  coupleId: string
  picks: Picks
  // null while a just-written ballot's server timestamp is still pending
  createdAt?: { toMillis(): number } | null
}

// Keep in sync with the allow-lists in firestore.rules and storage.rules.
export const ADMIN_EMAILS = ['loveaphair@gmail.com', 'fredalyssa@gmail.com']

// Blank Slate prompts for /blank-slate, in the order they are shown. [BLANK] is where guests write.
export const BLANK_SLATE_PROMPTS = [
  'BLOOD [BLANK]', '[BLANK] WOLF', 'DEAD [BLANK]', '[BLANK] BLOOD', 'NIGHT [BLANK]',
  '[BLANK] HUNT', 'BONE [BLANK]', '[BLANK] DEVIL', 'DARK [BLANK]', '[BLANK] SPIRIT',
  '[BLANK] SPELL', '[BLANK] CANDY', 'MOON [BLANK]', 'GHOST [BLANK]', 'WITCH [BLANK]',
  '[BLANK] HOUSE', 'BLACK [BLANK]', '[BLANK] MONSTER', 'GRAVE [BLANK]', '[BLANK] MASK',
  'BAT [BLANK]', '[BLANK] SCARE', 'CANDY [BLANK]', 'SPIDER [BLANK]', 'SHADOW [BLANK]',
  '[BLANK] BONES', 'SWEET [BLANK]', '[BLANK] WITCH', 'PUMPKIN [BLANK]', '[BLANK] CAT',
]
