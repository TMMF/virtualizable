import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import { Virtualizable } from '../.'

const ITEMS = []

// Naive Approach: 100x100 causes ~2-3ms render time (~25 renders); 200x200 causes ~8-9ms render time (~27 renders; capped by scroll throttle)
// Calculate on scroll handler: 200x200 causes ~13ms render time (~33 renders capped by scroll throttle)
// Bucketing: 200x200 causes ~11ms render time (~39 renders capped by scroll throttle)
// Bucketing [FIXED]: 200x200 causes ~1ms render time (~41 renders capped by scroll throttle)
const GRID_SIZE = 300
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    // @ts-expect-error - TODO need to fix
    ITEMS.push({
      id: `${i}-${j}`,
      x: i * 200,
      y: j * 200,
      width: 100,
      height: 100,
    })
  }
}

const getBoundingBox = (item) => item

const renderItem = (item) => (
  <div
    key={item.id}
    style={{
      position: 'absolute',
      left: item.x,
      top: item.y,
      width: item.width,
      height: item.height,
      backgroundColor: 'red',
      color: 'white',
    }}
  >
    {item.id}
  </div>
)

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
