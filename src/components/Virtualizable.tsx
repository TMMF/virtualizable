import * as React from 'react'
import * as types from '../types'
import * as utils from '../utils'
import Viewport, { ViewportProps, ViewportRef } from './Viewport'
import Canvas, { CanvasProps, CanvasRef } from './Canvas'
import Item from './Item'

export type VirtualizableProps<Key extends types.KeyBase, Item extends types.ItemBase> = ViewportProps<Key, Item> &
  CanvasProps<Key, Item> & {
    onVisible?: (keysVisible: Record<Key, boolean>) => void
  }

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
  const { renderItem, onVisible, children, ...viewportProps } = props

  const visibleItemsRef = React.useRef<Record<Key, boolean>>({} as Record<Key, boolean>)
  const viewportRef = React.useRef<ViewportRef<'div', HTMLDivElement>>(null)
  const canvasRef = React.useRef<CanvasRef<'div', HTMLDivElement>>(null)

  // throttle onVisible by a little bit to allow for multiple items to be visible at once
  const _onVisible = React.useMemo(() => (onVisible ? utils.throttle(onVisible, 10) : undefined), [onVisible])
  const onVisibleFactory = (key: Key) => {
    if (!_onVisible) return undefined

    return (visible: boolean) => {
      visibleItemsRef.current[key] = visible
      _onVisible(visibleItemsRef.current)
    }
  }

  React.useImperativeHandle(
    ref,
    () => ({
      getViewportRef: () => viewportRef.current?.getInnerRef(),
      getCanvasRef: () => canvasRef.current?.getInnerRef(),
      // TODO: more methods
    }),
    []
  )

  return (
    // @ts-expect-error - viewport props not including 'as'
    <Viewport {...viewportProps} ref={viewportRef}>
      <Canvas
        ref={canvasRef}
        // @ts-expect-error - Item != Item; gotta fix the types
        renderItem={(item: Item, key: Key) => <Item onVisible={onVisibleFactory(key)}>{renderItem(item, key)}</Item>}
      >
        {children}
      </Canvas>
    </Viewport>
  )
}

export default Object.assign(React.memo(React.forwardRef(Virtualizable)), { Viewport, Canvas, Item })
