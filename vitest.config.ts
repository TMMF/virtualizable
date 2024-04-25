import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts?(x)'],
    reporters: process.env.COVERAGE ? ['basic'] : configDefaults.reporters,
    coverage: {
      include: ['packages/**/src/**/*.ts?(x)'],
      reporter: ['text', 'json-summary', 'json'],
    },
  },
})
