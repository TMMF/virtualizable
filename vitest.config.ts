import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts?(x)'],
    coverage: {
      include: ['packages/**/src/**/*.ts?(x)'],
      reporter: ['text', 'json-summary', 'json'],
    },
  },
})
