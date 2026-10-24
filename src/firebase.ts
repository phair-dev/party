import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const app = initializeApp({
  apiKey: 'AIzaSyBYCIDWcceXNJj45cH7ScfqSepPwHkoUWY',
  authDomain: 'phair-party.firebaseapp.com',
  projectId: 'phair-party',
  storageBucket: 'phair-party.firebasestorage.app',
  messagingSenderId: '28761877729',
  appId: '1:28761877729:web:ba528ab2f503be33be9ba0',
})

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
