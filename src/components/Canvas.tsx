import * as React from 'react'
import { CanvasContext, ItemContext } from '../contexts'
import * as types from '../types'

// Breaking this up allows memoization and preventing unnecessary re-renders
const ItemProvider = React.memo(function ItemProvider(props: {
  item: types.ItemBase
  k: types.KeyBase
  getBoundingBox: types.GetBoundingBox<types.KeyBase, types.ItemBase>
  renderItem: types.RenderItem<types.KeyBase, types.ItemBase>
}) {
  const { item, k: key, getBoundingBox, renderItem } = props
  const box = getBoundingBox(item, key)
  return <ItemContext.Provider value={{ box }}>{renderItem(item, key)}</ItemContext.Provider>
})

// ---

export type CanvasProps<Key extends types.KeyBase, Item extends types.ItemBase> = {
  renderItem: types.RenderItem<Key, Item>
}

export type CanvasRef<ElKey extends types.SupportedElementKeys, Element extends types.SupportedElements[ElKey]> = {
  getInnerRef: () => React.Ref<Element>
}

export const Canvas = <
  Key extends types.KeyBase,
  Item extends types.ItemBase,
  ElKey extends types.SupportedElementKeys,
  Element extends types.SupportedElements[ElKey]
>(
  props: types.AsProps<ElKey> & CanvasProps<Key, Item>,
  ref: React.Ref<CanvasRef<ElKey, Element>>
) => {
  const { as: _as = 'div', renderItem, style, children, ...rest } = props
  const Component = _as as unknown as React.ComponentType<types.InnerComponentProps<ElKey>>

  const { size, visibleEntries, getBoundingBox } = React.useContext(CanvasContext)
  const { width, height } = size

  const domRef = React.useRef<Element>(null)
  React.useImperativeHandle(
    ref,
    () => ({
      getInnerRef: () => domRef,
    }),
    []
  )

  return (
    <Component {...rest} ref={domRef} style={{ width, height, position: 'relative', ...style }}>
      {visibleEntries.map(([key, item]) => (
        // @ts-expect-error - Item != Item; gotta fix the types
        <ItemProvider key={key} k={key} item={item} getBoundingBox={getBoundingBox} renderItem={renderItem} />
      ))}
      {children}
    </Component>
  )
}

export default React.memo(React.forwardRef(Canvas))
