// tests/integration/vitest.config.ts

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['tests/integration/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**', 'app/**'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**'],
    },
    testTimeout: 30000, // 30 seconds for database operations
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../'),
    },
  },
})