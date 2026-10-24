import dumb from './assets/trivia/dumb.jpg'
import wayne from './assets/trivia/wayne.jpg'
import bride from './assets/trivia/bride.jpg'
import topgun from './assets/trivia/topgun.jpg'
import friends from './assets/trivia/friends.png'
import psych from './assets/trivia/psych.png'
import community from './assets/trivia/community.png'
import seinfeld from './assets/trivia/seinfeld.png'
import pinky from './assets/trivia/pinky.png'
import ren from './assets/trivia/ren.png'
import beavis from './assets/trivia/beavis.png'
import phineas from './assets/trivia/phineas.png'
import dcc from './assets/trivia/dcc.png'
import lotr from './assets/trivia/lotr.gif'
import sherlock from './assets/trivia/sherlock.jpg'
import pride from './assets/trivia/pride.jpg'

export interface TriviaItem {
  category: string
  prompt: string // the visible half of the duo; the answer completes it
  answer: string
  source: string
  image: string // reference art from Wikipedia/Wikimedia Commons (posters, covers, logos)
}

// Immortal Duos answers for /trivia, in the order they are reviewed.
export const TRIVIA: readonly TriviaItem[] = [
  { category: 'Movies & Cult Classics', prompt: 'Lloyd Christmas', answer: 'Harry Dunne', source: 'Dumb and Dumber (1994)', image: dumb },
  { category: 'Movies & Cult Classics', prompt: 'Garth Algar', answer: 'Wayne Campbell', source: "Wayne's World (1992)", image: wayne },
  { category: 'Movies & Cult Classics', prompt: 'Buttercup', answer: 'Westley', source: 'The Princess Bride (1987)', image: bride },
  { category: 'Movies & Cult Classics', prompt: 'Maverick', answer: 'Goose', source: 'Top Gun (1986)', image: topgun },
  { category: 'TV Legends', prompt: 'Ross', answer: 'Rachel', source: 'Friends', image: friends },
  { category: 'TV Legends', prompt: 'Gus', answer: 'Shawn Spencer', source: 'Psych', image: psych },
  { category: 'TV Legends', prompt: 'Troy Barnes', answer: 'Abed Nadir', source: 'Community', image: community },
  { category: 'TV Legends', prompt: 'George Costanza', answer: 'Jerry Seinfeld', source: 'Seinfeld', image: seinfeld },
  { category: 'Cartoons & Kids TV', prompt: 'Pinky', answer: 'the Brain', source: 'Pinky and the Brain', image: pinky },
  { category: 'Cartoons & Kids TV', prompt: 'Ren', answer: 'Stimpy', source: 'The Ren & Stimpy Show', image: ren },
  { category: 'Cartoons & Kids TV', prompt: 'Beavis', answer: 'Butt-Head', source: 'Beavis and Butt-Head', image: beavis },
  { category: 'Cartoons & Kids TV', prompt: 'Phineas', answer: 'Ferb', source: 'Phineas and Ferb', image: phineas },
  { category: 'Literature', prompt: 'Princess Donut', answer: 'Carl', source: 'Dungeon Crawler Carl (Matt Dinniman)', image: dcc },
  { category: 'Literature', prompt: 'Samwise', answer: 'Frodo', source: 'The Lord of the Rings (J.R.R. Tolkien)', image: lotr },
  { category: 'Literature', prompt: 'Sherlock', answer: 'Watson', source: 'Sherlock Holmes stories (Arthur Conan Doyle)', image: sherlock },
  { category: 'Literature', prompt: 'Elizabeth Bennet', answer: 'Mr. Darcy', source: 'Pride and Prejudice (Jane Austen)', image: pride },
]
