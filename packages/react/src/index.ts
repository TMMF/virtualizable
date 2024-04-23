export { default as Virtualizable, type VirtualizableProps, type VirtualizableRef } from './components/Virtualizable'
export { default as Viewport, type ViewportProps, type ViewportRef } from './components/Viewport'
export { default as Canvas, type CanvasProps, type CanvasRef } from './components/Canvas'
export { default as Item, type ItemProps, type ItemRef } from './components/Item'
export { useVirtualizable, type UseVirtualizableArgs, type UseVirtualizableResult } from './utils/hooks'
export type { Alignment, ScrollToItemOptions, RenderItem } from './types'

// TODO:
// -- MVP --
//   - Improve Hook API / core util to not assume DOM elements
//   - Code Cleanup
//   - Code Comments
//   - Test Suites
//   - Performance Benchmarks
//   - Documentation
//   - Code Comments
//   - Tree-shaking Support
//   - Accessibility: Support keyboard navigation
//   - Accessibility: aria-labels (grid?)
//   - 'semantic-release' + 'commitlint' npm packages for automated releases
// -- Non-MVP --
//   - Predictive scrolling (adjust overscan based on scroll velocity)
//   - Runtime (DEV-ONLY?) Param Assertions
//   - Auto-height items (inline-display etc)
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
