import * as React from 'react'
import * as types from './types'

export type CanvasContext<Key extends types.KeyBase, Item extends types.ItemBase> = {
  size: types.Size
  visibleEntries: [Key, Item][]
  getBoundingBox: (item: Item, key: Key) => types.Box
}
export type ItemContext = {
  box: types.Box
}

export const CanvasContext = React.createContext<CanvasContext<types.KeyBase, types.ItemBase>>({
  size: { width: 0, height: 0 },
  visibleEntries: [],
  getBoundingBox: () => ({ x: 0, y: 0, width: 0, height: 0 }),
})

export const ItemContext = React.createContext<ItemContext>({
  box: { x: 0, y: 0, width: 0, height: 0 },
})
