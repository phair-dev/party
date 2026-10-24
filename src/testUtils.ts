import type { Ballot, CategoryKey, Couple } from './config'

export const couple = (id: string, lastName = id, costume = `${id} costume`): Couple => ({
  id,
  lastName,
  costume,
})

export const ballot = (uid: string, picks: Partial<Record<CategoryKey, string>>, coupleId = 'me'): Ballot => ({
  uid,
  coupleId,
  picks: { icons: 'x', foolish: 'x', effort: 'x', ...picks },
})
