import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup-env.js'],
    fileParallelism: false,
    testTimeout: 30000,
    // MongoDB startup and bcrypt work are intentionally allowed extra time on
    // the low-memory Windows/Docker development profile.
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'middleware/cache.js',
        'scripts/test-db-guard.mjs',
        'utils/categories.js',
        'validation/*.js'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    }
  }
});
