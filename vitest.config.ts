import { defineConfig } from 'vitest/config'
import codspeedPlugin from '@codspeed/vitest-plugin'

export default defineConfig({
  plugins: [codspeedPlugin()],
  test: {
    include: ['packages/**/*.test.ts?(x)'],
    coverage: {
      include: ['packages/**/src/**/*.ts?(x)'],
      reporter: ['text', 'json-summary', 'json'],
    },
  },
})
