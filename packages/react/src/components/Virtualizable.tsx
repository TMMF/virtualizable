import * as React from 'react'
import * as types from '../types'
import * as utils from '../utils'
import Viewport, { ViewportProps, ViewportRef } from './Viewport'
import Canvas, { CanvasProps, CanvasRef } from './Canvas'
import Item from './Item'

export type VirtualizableProps<
  Key extends types.KeyBase = types.KeyBase,
  Item extends types.ItemBase = types.ItemBase
> = ViewportProps<Key, Item> &
  CanvasProps<Key, Item> & {
    onVisible?: (keysVisible: Record<Key, boolean>) => void
  }

export type VirtualizableRef<
  Key extends types.KeyBase = types.KeyBase,
  ElKey extends types.SupportedElementKeys = types.SupportedElementKeys,
  Element extends types.SupportedElements[ElKey] = types.SupportedElements[ElKey]
> = Omit<ViewportRef<Key, ElKey, Element>, 'getInnerRef'> &
  Omit<CanvasRef<ElKey, Element>, 'getInnerRef'> & {
    getViewportRef: ViewportRef<Key, ElKey, Element>[`getInnerRef`]
    getCanvasRef: CanvasRef<ElKey, Element>[`getInnerRef`]
  }

const DEFAULT_VIEWPORT_SIZE = { width: 0, height: 0 }

export const Virtualizable = <Key extends types.KeyBase, Item extends types.ItemBase>(
  props: VirtualizableProps<Key, Item> & { children?: React.ReactNode },
  ref: React.Ref<VirtualizableRef<Key, 'div', HTMLDivElement>>
) => {
  const { renderItem, onVisible, children, ...viewportProps } = props

  const visibleItemsRef = React.useRef<Record<Key, boolean>>({} as Record<Key, boolean>)
  const viewportRef = React.useRef<ViewportRef<Key, 'div', HTMLDivElement>>(null)
  const canvasRef = React.useRef<CanvasRef<'div', HTMLDivElement>>(null)

  // throttle onVisible by a little bit to allow for multiple items to be visible at once
  // TODO: this is fundamentally broken, need to fix it
  const _onVisible = React.useMemo(() => (onVisible ? utils.debounce(onVisible, 50) : undefined), [onVisible])
  const onVisibleFactory = (key: Key) => {
    if (!_onVisible) return undefined

    return (visible: boolean) => {
      if (visible) {
        visibleItemsRef.current[key] = true
      } else {
        delete visibleItemsRef.current[key]
      }

      _onVisible(visibleItemsRef.current)
    }
  }

  React.useImperativeHandle(
    ref,
    (): VirtualizableRef<Key, 'div', HTMLDivElement> => ({
      getViewportRef: () => viewportRef.current?.getInnerRef(),
      getCanvasRef: () => canvasRef.current?.getInnerRef(),
      getCanvasSize: () => canvasRef.current?.getCanvasSize() ?? DEFAULT_VIEWPORT_SIZE,
      scrollTo: (...args) => viewportRef.current?.scrollTo(...args),
      scrollToItem: (...args) => viewportRef.current?.scrollToItem(...args),
      recompute: () => viewportRef.current?.recompute(),
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
