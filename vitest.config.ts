// vitest.config.ts

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    setupFiles: ['tests/integration/env-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**', 'app/**'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
    },
    testTimeout: 30000, // Increased timeout for database operations
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
