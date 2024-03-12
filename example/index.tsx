import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Virtualizable } from '../.'

const ITEMS = [] /*[
  { id: '1', x: 0, y: 0, width: 100, height: 100 },
  { id: '2', x: 200, y: 0, width: 100, height: 100 },
  { id: '3', x: 400, y: 0, width: 100, height: 100 },
  { id: '4', x: 0, y: 200, width: 100, height: 100 },
  { id: '5', x: 200, y: 200, width: 100, height: 100 },
  { id: '6', x: 400, y: 200, width: 100, height: 100 },
  { id: '7', x: 0, y: 400, width: 100, height: 100 },
  { id: '8', x: 200, y: 400, width: 100, height: 100 },
  { id: '9', x: 400, y: 400, width: 100, height: 100 },
]*/

const GRID_SIZE = 100
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
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

ReactDOM.render(<App />, document.getElementById('root'))
