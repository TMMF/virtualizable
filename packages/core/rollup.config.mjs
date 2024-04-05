import pkg from './package.json' with { type: "json" }
import rollup from '../../rollup.shared.mjs'

export default {
  ...rollup,
  output: [
    {
      ...rollup.output[0],
      file: pkg.main,
    },
    {
      ...rollup.output[1],
      file: pkg.module,
    },
  ],
}
