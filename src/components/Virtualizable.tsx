import * as React from 'react'
import * as types from '../types'
import Viewport, { ViewportProps, ViewportRef } from './Viewport'
import Canvas, { CanvasProps, CanvasRef } from './Canvas'
import Item from './Item'

export type VirtualizableProps<Key extends types.KeyBase, Item extends types.ItemBase> = ViewportProps<Key, Item> &
  CanvasProps<Key, Item>

export type VirtualizableRef<
  ElKey extends types.SupportedElementKeys,
  Element extends types.SupportedElements[ElKey]
> = Omit<ViewportRef<ElKey, Element>, 'getInnerRef'> &
  Omit<CanvasRef<ElKey, Element>, 'getInnerRef'> & {
    getViewportRef: ViewportRef<ElKey, Element>[`getInnerRef`]
    getCanvasRef: CanvasRef<ElKey, Element>[`getInnerRef`]
  }

export const Virtualizable = <Key extends types.KeyBase, Item extends types.ItemBase>(
  props: VirtualizableProps<Key, Item> & { children?: React.ReactNode },
  ref: React.Ref<VirtualizableRef<'div', HTMLDivElement>>
) => {
  const { renderItem, children, ...viewportProps } = props

  const viewportRef = React.useRef<ViewportRef<'div', HTMLDivElement>>(null)
  const canvasRef = React.useRef<CanvasRef<'div', HTMLDivElement>>(null)
  React.useImperativeHandle(
    ref,
    () => ({
      getViewportRef: () => viewportRef.current?.getInnerRef(),
      getCanvasRef: () => canvasRef.current?.getInnerRef(),
    }),
    []
  )

  return (
    // @ts-expect-error - viewport props not including 'as'
    <Viewport {...viewportProps} ref={viewportRef}>
      {/* @ts-expect-error - Item != Item; gotta fix the types */}
      <Canvas ref={canvasRef} renderItem={(item: Item, key: Key) => <Item>{renderItem(item, key)}</Item>}>
        {children}
      </Canvas>
    </Viewport>
  )
}

export default Object.assign(React.memo(React.forwardRef(Virtualizable)), { Viewport, Canvas, Item })
