import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom', // lightweight DOM for browser extension testing
    include: ['tests/**/*.test.js'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['extension/*.js'],
    },
  },
});
