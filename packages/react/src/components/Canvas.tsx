import * as React from 'react'
import { CanvasContext } from '../contexts'
import * as types from '../types'
import CanvasItemProvider from './CanvasItemProvider'

export type CanvasProps<Key extends types.KeyBase = types.KeyBase, Item extends types.ItemBase = types.ItemBase> = {
  renderItem: types.RenderItem<Key, Item>
}

export type CanvasRef<
  ElKey extends types.SupportedElementKeys = types.SupportedElementKeys,
  Element extends types.SupportedElements[ElKey] = types.SupportedElements[ElKey]
> = {
  getInnerRef: () => React.Ref<Element> | undefined
  getCanvasSize: () => types.Size
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
    (): CanvasRef<ElKey, Element> => ({
      getInnerRef: () => domRef,
      getCanvasSize: () => size,
    }),
    [size]
  )

  return (
    <Component {...rest} ref={domRef} style={{ width, height, position: 'relative', ...style }}>
      {visibleEntries.map(([key, item]) => (
        // @ts-expect-error - Item != Item; gotta fix the types
        <CanvasItemProvider key={key} k={key} item={item} getBoundingBox={getBoundingBox} renderItem={renderItem} />
      ))}
      {children}
    </Component>
  )
}

export default React.memo(React.forwardRef(Canvas))
