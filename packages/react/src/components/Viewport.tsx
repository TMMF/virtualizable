import * as React from 'react'
import { CanvasContext } from '../contexts'
import * as types from '../types'
import * as utils from '../utils'

type InnerComponentProps<K extends keyof JSX.IntrinsicElements> = types.InnerComponentProps<K> & {
  onScroll?: React.UIEventHandler<types.GetElementType<K>>
}

export type ViewportProps<
  Key extends types.KeyBase = types.KeyBase,
  Item extends types.ItemBase = types.ItemBase
> = utils.UseVirtualizableArgs<Key, Item> & {
  onItemsRenderedChange?: (items: Record<Key, Item>) => unknown // Rendered items (when it changes)
}

export type ViewportRef<
  Key extends types.KeyBase = types.KeyBase,
  ElKey extends types.SupportedElementKeys = types.SupportedElementKeys,
  Element extends types.SupportedElements[ElKey] = types.SupportedElements[ElKey]
> = {
  getInnerRef: () => React.Ref<Element> | undefined
  scrollTo: (x: number, y: number) => void
  scrollToItem: (key: Key, options?: types.ScrollToItemOptions) => void
  recompute: () => void
}

const Viewport = <
  Key extends types.KeyBase,
  Item extends types.ItemBase,
  ElKey extends types.SupportedElementKeys,
  Element extends types.SupportedElements[ElKey],
  ICP extends InnerComponentProps<ElKey> = InnerComponentProps<ElKey>
>(
  props: types.AsProps<ElKey, ICP> & ViewportProps<Key, Item>,
  ref: React.Ref<ViewportRef<Key, ElKey, Element>>
) => {
  const {
    items,
    getBoundingBox,
    overscan,
    scrollThrottle,
    precomputedCanvasSize,
    precomputedBucketSize,
    precomputedBuckets,
    as: _as = 'div',
    style: _style,
    children,
    onScroll: _onScroll,
    onItemsRenderedChange,
    ...rest
  } = props
  const Component = _as as unknown as React.ComponentType<InnerComponentProps<ElKey>>
  const onScroll = _onScroll as React.UIEventHandler<Element>

  const {
    ref: domRef,
    size,
    renderedKeys,
    onScroll: throttledScroll,
    scrollTo,
    scrollToItem,
    recompute,
  } = utils.useVirtualizable<Key, Item, ElKey, Element>({
    items,
    getBoundingBox,
    precomputedCanvasSize,
    precomputedBucketSize,
    precomputedBuckets,
    overscan,
    scrollThrottle,
  })

  const handleScroll = utils.useMergeFns<[React.UIEvent<Element>]>(onScroll, throttledScroll)

  const canvasContextValue = React.useMemo(() => {
    const visibleEntries = renderedKeys.map((key): [Key, Item] => [key, utils.getItem(items, key)])
    return { size, visibleEntries, getBoundingBox }
  }, [items, size, renderedKeys, getBoundingBox])

  const style = React.useMemo(
    () => ({ overflow: 'auto', border: '1px solid blue', maxHeight: '100%', ..._style }),
    [_style]
  )

  React.useImperativeHandle(
    ref,
    (): ViewportRef<Key, ElKey, Element> => ({
      getInnerRef: () => domRef,
      scrollTo,
      scrollToItem,
      recompute,
    }),
    [domRef, recompute, scrollTo, scrollToItem]
  )

  React.useLayoutEffect(() => {
    const rendered = renderedKeys.reduce((acc, key) => {
      acc[key] = utils.getItem(items, key)
      return acc
    }, {} as Record<Key, Item>)

    onItemsRenderedChange?.(rendered)
    // Only run when rendered keys have changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderedKeys])

  return (
    <Component {...rest} ref={domRef} onScroll={handleScroll} style={style}>
      {/* @ts-expect-error - Item != Item; gotta fix the types */}
      <CanvasContext.Provider value={canvasContextValue}>{children}</CanvasContext.Provider>
    </Component>
  )
}

export default React.memo(React.forwardRef(Viewport))
