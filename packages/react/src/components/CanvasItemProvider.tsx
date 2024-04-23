import * as React from 'react'
import { ItemContext } from '../contexts'
import * as types from '../types'

type CanvasItemProviderProps<Key extends types.KeyBase, Item extends types.ItemBase> = {
  item: Item
  k: Key
  getBoundingBox: types.GetBoundingBox<Key, Item>
  renderItem: types.RenderItem<Key, Item>
}

// Breaking this up allows memoization and preventing unnecessary re-renders
const CanvasItemProvider = <Key extends types.KeyBase, Item extends types.ItemBase>(
  props: CanvasItemProviderProps<Key, Item>
) => {
  const { item, k: key, getBoundingBox, renderItem } = props
  const itemContextValue = React.useMemo(() => ({ box: getBoundingBox(item, key) }), [item, key, getBoundingBox])

  return <ItemContext.Provider value={itemContextValue}>{renderItem(item, key)}</ItemContext.Provider>
}

export default React.memo(CanvasItemProvider)
