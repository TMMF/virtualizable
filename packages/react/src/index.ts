export { default as Virtualizable } from './components/Virtualizable'

// TODO:
// - Functionality
//   - Create imperative API
//   - Support infinite scrolling canvas + reverse scrolling
//   - Support streaming items (for infinite scrolling)
//   - Context for scrolling (?)
//   - Support maintaining focus / cursor position on elements when scrolling
//   - Expose utils for customization
//   - RTL document support (?)
//   - Support SSR (useIsomorphicEffect, etc) / RSC children
//   - Runtime Prop Assertions
//   - Tree-shaking components
//   - Grid/Masonry/List layout components with custom perf parameters
//   - Predictive scrolling (adjust overscan based on scroll velocity)
//   - [maybe] snap-to-item scrolling
//   - [maybe] sticky items
//   - [maybe] headless UI via hooks (?)
//   - [maybe] WebGL GPGPU preprocessing
// - Packages
//   - 'semantic-release' + 'commitlint' npm packages for automated releases
// - Accessibility [https://www.w3.org/WAI/ARIA/apg/patterns/]
//   - Support keyboard navigation (accessibility)
//   - Support aria-live (?) for screen readers
//   - aria-labels (grid?)
// - Misc
//   - Performance profiling/debugging utilities/event handlers (help to identify bottlenecks and adjust parameters accordingly)
//   - Benchmarking utilities + CI tests
//   - Create documentation with Docusaurus (https://docusaurus.io/)
//   - Test Suites (core, react)
//   - CLI for upgrading versions
