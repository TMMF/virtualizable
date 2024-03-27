import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import { Virtualizable } from '@virtualizable/react'

const ITEMS: string[] = []
const GRID_SIZE = 20
const GRID_SIZE_SQ = GRID_SIZE * GRID_SIZE
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    ITEMS.push(`${j}-${i}`)
  }
}

const getBoundingBox = (item, key) => {
  const reset = key >= GRID_SIZE_SQ ? GRID_SIZE_SQ : 0
  const offset = key >= GRID_SIZE_SQ ? 50 : 0

  const i = (Number(key) - reset) % GRID_SIZE
  const j = Math.floor((Number(key) - reset) / GRID_SIZE)

  return {
    x: i * 100 + offset,
    y: j * 100 + offset,
    width: 50,
    height: 50,
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
  const [items, setItems] = React.useState(ITEMS)
  const addItem = React.useCallback(() => {
    setItems((prev) => [...prev, `${prev.length}`])
  }, [])

  return (
    <>
      <button onClick={addItem}>Add Item</button>
      <div style={{ border: '1px solid green', width: '50vw', height: '50vh' }}>
        <Virtualizable items={items} getBoundingBox={getBoundingBox} renderItem={renderItem} />
      </div>
    </>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)
