import resolve, { DEFAULTS as RESOLVE_DEFAULTS } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import terser from '@rollup/plugin-terser'
import json from '@rollup/plugin-json'
import sourceMaps from 'rollup-plugin-sourcemaps'
import typescript from 'rollup-plugin-typescript2'
//import replace from '@rollup/plugin-replace'
import del from 'rollup-plugin-delete'
import path from 'path'
import fs from 'fs-extra'

import pkg from './package.json' with { type: "json" }

export default {
  input: 'src/index.tsx',
  watch: {
    include: 'src/**',
  },
  treeshake: {
    propertyReadSideEffects: false,
  },
  output: [
    {
      file: 'dist/virtualizable.development.cjs',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      globals: { react: 'React' },
    },
    {
      file: 'dist/virtualizable.production.min.cjs', //pkg.main,
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      globals: { react: 'React' },
    },
    {
      file: pkg.module,
      format: 'esm',
      sourcemap: true,
      exports: 'named',
      globals: { react: 'React' },
    },
  ],
  external: [/node_modules/],
  plugins: [
    // del({ targets: 'dist/*' }),
    resolve({
      mainFields: ['module', 'main', 'browser'],
      extensions: [...RESOLVE_DEFAULTS.extensions, '.cjs', '.mjs', '.jsx'],
    }),
    commonjs(),
    json(),
    typescript({ tsconfig: 'tsconfig.json' }),
    // TODO: need to fix this to support dev and prod builds
    /* replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production'),
      __DEV__: JSON.stringify(false),
    }), */
    sourceMaps(),
    terser({
      output: { comments: false },
      compress: {
        keep_infinity: true,
        pure_getters: true,
        passes: 10,
      },
      ecma: 2020,
      module: false,
      toplevel: true,
      warnings: true,
    }),
    {
      // Custom plugin to generate an entry file for the package
      closeBundle: () => {
        const contents = `'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./virtualizable.production.min.cjs')
} else {
  module.exports = require('./virtualizable.development.cjs')
}
`
        return fs.outputFile(path.join('dist/', 'index.js'), contents)
      },
    },
  ],
}
