import resolve, { DEFAULTS as RESOLVE_DEFAULTS } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import terser from '@rollup/plugin-terser'
import json from '@rollup/plugin-json'
import sourceMaps from 'rollup-plugin-sourcemaps'
import typescript from 'rollup-plugin-typescript2'
import replace from '@rollup/plugin-replace'
import { babel } from '@rollup/plugin-babel'
import { DEFAULT_EXTENSIONS as DEFAULT_BABEL_EXTENSIONS } from '@babel/core'

export default {
  input: 'src/index.ts',
  watch: {
    include: 'src/**',
  },
  treeshake: {
    propertyReadSideEffects: false,
  },
  output: [
    {
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    {
      format: 'esm',
      sourcemap: true,
      exports: 'named',
    },
  ],
  external: [/node_modules/, /@virtualizable/],
  plugins: [
    resolve({
      mainFields: ['module', 'main', 'browser'],
      extensions: [...RESOLVE_DEFAULTS.extensions, '.cjs', '.mjs', '.jsx'],
    }),
    commonjs(),
    json(),
    typescript({ tsconfig: 'tsconfig.json', abortOnError: false }),
    babel({
      exclude: 'node_modules/**',
      babelHelpers: 'bundled',
      presets: ['@babel/preset-env', '@babel/preset-react'],
      plugins: ['annotate-pure-calls'],
      extensions: [...DEFAULT_BABEL_EXTENSIONS, 'ts', 'tsx'],
    }),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    }),
    sourceMaps(),
    process.env.NODE_ENV === 'production'
      ? terser({
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
        })
      : undefined,
  ],
}
