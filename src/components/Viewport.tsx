import * as React from 'react'
import { CanvasContext } from '../contexts'
import * as types from '../types'
import * as utils from '../utils'

type InnerComponentProps<K extends keyof JSX.IntrinsicElements> = types.InnerComponentProps<K> & {
  onScroll?: React.UIEventHandler<types.GetElementType<K>>
}

export type ViewportProps<Key extends types.KeyBase, Item extends types.ItemBase> = {
  items: types.Collection<Key, Item>
  getBoundingBox: types.GetBoundingBox<Key, Item> // Q: should this handle % based positioning?
  // --- Performance Optimizations ---
  bucketSize?: types.PositiveNumber // Defaults to the smaller of the two dimensions (width or height); MAXING OUT AT 500x500
  getBucket?: types.GetBucket<Key, Item> // Preprocessing makes this faster, but component will handle it if not provided (rets [x, y])
  buckets?: types.Buckets<Key> // Preprocessing makes this faster, but component will handle it if not provided
  canvasSize?: types.Size // Precomputed size (if available)
  overscan?: types.PositiveNumber // Defaults to 100px
  scrollThrottle?: types.Milliseconds // Defaults to 100ms
  // --- Event Handlers ---
  //onCanvasSizeChange?: // size change
  //onBucketsChange?: // buckets change
  //onPreprocessed?: // Preprocessed data (when it finishes; indicative of when the component is ready to render)
  //onItemsRendered?: (items: types.Collection<Key, Item>) => void // Rendered items (when it changes)
  //onItemsVisible?: (items: types.Collection<Key, Item>) => void // Rendered + Visible items (when it changes)
}

export type ViewportRef<ElKey extends types.SupportedElementKeys, Element extends types.SupportedElements[ElKey]> = {
  getInnerRef: () => React.Ref<Element>
}

const Viewport = <
  Key extends types.KeyBase,
  Item extends types.ItemBase,
  ElKey extends types.SupportedElementKeys,
  Element extends types.SupportedElements[ElKey],
  ICP extends InnerComponentProps<ElKey> = InnerComponentProps<ElKey>
>(
  props: types.AsProps<ElKey, ICP> & ViewportProps<Key, Item>,
  ref: React.Ref<ViewportRef<ElKey, Element>>
) => {
  const {
    items,
    getBoundingBox,
    scrollThrottle = 50,
    getBucket: customGetBucket,
    canvasSize: precomputedCanvasSize,
    bucketSize: precomputedBucketSize,
    buckets: precomputedBuckets,
    overscan = 100,
    as: _as = 'div',
    style,
    children,
    onScroll: _onScroll,
    ...rest
  } = props
  const Component = _as as unknown as React.ComponentType<InnerComponentProps<ElKey>>
  const onScroll = _onScroll as React.UIEventHandler<Element>

  const { size, bucketSize, buckets } = React.useMemo(
    () =>
      utils.measure('Preprocessing', () =>
        utils.preprocess({
          items,
          getBoundingBox,
          customGetBucket,
          precomputedCanvasSize,
          precomputedBucketSize,
          precomputedBuckets,
        })
      ),
    [customGetBucket, getBoundingBox, items, precomputedBucketSize, precomputedBuckets, precomputedCanvasSize]
  )

  const domRef = React.useRef<Element>(null)
  const cvk = React.useCallback(
    (scroll: types.Position) =>
      utils.measure('Calculating Visible Keys', () =>
        utils.calculateVisibleKeys({
          scroll,
          bucketSize,
          buckets,
          getBoundingBox,
          viewportSize: utils.unsafeHtmlDivElementTypeCoercion(domRef.current)?.getBoundingClientRect() ?? {
            width: 0,
            height: 0,
          },
          items,
          overscan,
        })
      ),
    [bucketSize, buckets, getBoundingBox, items, overscan]
  )

  const [, startTransition] = React.useTransition()
  const [visibleKeys, setVisibleKeys] = React.useState<Key[]>([])
  // Need to useMountEffect to set initial visible keys since it needs domRef.current to be set first
  utils.useMountEffect(() => setVisibleKeys(cvk({ x: 0, y: 0 })))

  const visibleEntries = React.useMemo(
    () => visibleKeys.map((key): [Key, Item] => [key, items[key]]),
    [items, visibleKeys]
  )

  const throttledScroll = React.useMemo(
    () =>
      utils.throttle((event: React.UIEvent<Element>) => {
        const target = utils.unsafeHtmlDivElementTypeCoercion(event.target)
        const newVisibleKeys = cvk({ x: target.scrollLeft, y: target.scrollTop })

        startTransition(() =>
          setVisibleKeys((prevVisibleKeys) =>
            // Prevents unnecessary re-renders
            utils.areKeysEqual(prevVisibleKeys, newVisibleKeys) ? prevVisibleKeys : newVisibleKeys
          )
        )
      }, scrollThrottle),
    [cvk, scrollThrottle]
  )

  const handleScroll = React.useCallback(
    (event: React.UIEvent<Element>) => {
      throttledScroll(event)
      onScroll?.(event)
    },
    [throttledScroll, onScroll]
  )

  const canvasContextValue = React.useMemo(
    () => ({ size, visibleEntries, getBoundingBox }),
    [size, visibleEntries, getBoundingBox]
  )

  React.useImperativeHandle(
    ref,
    () => ({
      getInnerRef: () => domRef,
      /* scrollTo: (left: number, top: number) => {},
      scrollToItem: (key: Key, alignment: 'auto' | 'start' | 'center' | 'end') => {}, // accessibility tab/arrow key navigation uses this + focus
      getCanvasSize: () => ({ width, height }),
      getRenderedItems: () => {},
      getVisibleItems: () => {},
      getBuckets: () => buckets,
      getInnerRef: () => domRef,
      recompute: () => {}, // forcibly recompute size + buckets + visible keys (should be unnecessary in most cases, but useful for debugging and testing)
      recomputeItem: () => {}, */ // forcibly recompute size + bucket + visible key for a specific item (more efficient than recompute)
    }),
    []
  )

  console.debug(
    '# Visible Items:',
    visibleKeys.length,
    '| Item IDs:',
    visibleKeys.map((key) => items[key])
  )

  return (
    <Component
      {...rest}
      ref={domRef}
      onScroll={handleScroll}
      style={{ overflow: 'auto', border: '1px solid blue', width: '100%', height: '100%', ...style }}
    >
      {/* @ts-expect-error - Item != Item; gotta fix the types */}
      <CanvasContext.Provider value={canvasContextValue}>{children}</CanvasContext.Provider>
    </Component>
  )
}

export default React.memo(React.forwardRef(Viewport))
