import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import { Virtualizable } from '@virtualizable/react'

const ITEMS: { id: string; x: number; y: number; width: number; height: number }[] = []
const GRID_SIZE = 20
const GRID_SIZE_SQ = GRID_SIZE * GRID_SIZE
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    ITEMS.push({ id: `${j}-${i}`, x: i * 100, y: j * 100, width: 50, height: 50 })
  }
}

const getBoundingBox = (item) => {
  return item
}

const renderItem = (item, key) => {
  return (
    <div key={item.id} className="item" tabIndex={key + 1} autoFocus={key === 0}>
      {item.id}
    </div>
  )
}

const App = () => {
  const [items, setItems] = React.useState(ITEMS)
  const addItem = React.useCallback(() => {
    setItems((prevItems) => {
      const count = prevItems.length - GRID_SIZE_SQ
      const i = count % GRID_SIZE
      const j = Math.floor(count / GRID_SIZE)

      const item = { id: `${prevItems.length}`, x: 50 + i * 100, y: 50 + j * 100, width: 50, height: 50 }
      return [...prevItems, item]
    })
  }, [])

  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={addItem}>Add Item</button>
      </div>
      <div style={{ border: '1px solid green', width: '50vw', height: '50vh' }}>
        <Virtualizable
          items={items}
          getBoundingBox={getBoundingBox}
          renderItem={renderItem}
          onVisible={(keysVisible) =>
            console.log(
              'VISIBLE KEYS',
              Object.entries(keysVisible)
                .filter(([_, visible]) => visible)
                .map(([key]) => key)
            )
          }
        />
      </div>
    </>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)
