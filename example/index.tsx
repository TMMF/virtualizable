import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import { Virtualizable } from '..'

const ITEMS = []

// Naive Approach: 100x100 causes ~2-3ms render time; 200x200 causes ~8-9ms render time
// Calculate on scroll handler: 200x200 causes ~13ms render time
// Bucketing: 200x200 causes ~11ms render time
// Bucketing [FIXED]: 200x200 causes ~1ms render time; 300x300 causes ~1ms render time; 1000x1000 causes ~1ms render time (initialization is ~400ms; dev tools slow to crawl)
// WebGL Acceleration: POSTPONED
// IntersectionObserver Refinement: POSTPONED
// --- Component Cleanup ---: 1000x1000 init is ~400ms; 2000x2000 init is ~1.4s
// Function Optimization (removing HOFs): 1000x1000 init added about ~40ms (???)
// startTransition / useDeferredValue:
// Edge Case Handling:
// Accessibility (focus management):
const GRID_SIZE = 1000
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    // @ts-expect-error - TODO need to fix
    ITEMS.push(`${j}-${i}`)
  }
}

//const getBoundingBox = (item) => item
const getBoundingBox = (item, key) => {
  const i = Number(key) % GRID_SIZE
  const j = Math.floor(Number(key) / GRID_SIZE)

  return {
    x: i * 200,
    y: j * 200,
    width: 100,
    height: 100,
  }
}

const renderItem = (item, key) => {
  return (
    <div key={item} className="item" tabIndex={key + 1} autoFocus={key === 0}>
      {item}
    </div>
  )
}

const App = () => {
  return (
    <div style={{ border: '1px solid green' }}>
      <Virtualizable
        style={{ width: 300, height: 300 }}
        items={ITEMS}
        getBoundingBox={getBoundingBox}
        renderItem={renderItem}
      />
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)
