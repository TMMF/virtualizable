export { default as Virtualizable } from './components/Virtualizable'

// TODO:
// -- MVP --
//   - React Imperative API
//   - Improve Hook API / core util to not assume DOM elements
//   - Auto-height items (inline-display etc)
//   - Code Cleanup
//   - Code Comments
//   - Test Suites
//   - Documentation
//   - Tree-shaking Support
//   - Runtime (DEV-ONLY?) Prop Assertions
//   - Predictive scrolling (adjust overscan based on scroll velocity)
//   - Accessibility: Support keyboard navigation
//   - Accessibility: aria-labels (grid?)
//   - 'semantic-release' + 'commitlint' npm packages for automated releases
// -- Non-MVP --
//   - Support infinite scrolling canvas + reverse scrolling
//   - Support streaming items (for infinite scrolling)
//   - Support maintaining focus / cursor position on elements when scrolling
//   - RTL document support
//   - Support SSR (useIsomorphicEffect, etc) / RSC children
//   - Grid/Masonry/List layout components with custom perf parameters
//   - Snap-to-item scrolling
//   - WebGL GPGPU preprocessing
//   - Performance profiling/debugging utilities/event handlers (help to identify bottlenecks and adjust parameters accordingly)
//   - Benchmarking utilities + CI tests
//   - CLI for upgrading versions
