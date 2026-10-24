import { defineConfig } from 'vitest/config'

// Behavioural firestore.rules tests; run via `npm run test:rules` (needs Java for the emulator).
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.emulator.test.ts'], fileParallelism: false },
})
