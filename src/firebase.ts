import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

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

// `npm run dev:emulated` runs against the local Firebase emulators instead of the live project.
if (import.meta.env.VITE_USE_EMULATORS) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}
