import * as React from 'react'
import { CanvasContext } from '../contexts'
import * as types from '../types'
import * as utils from '../utils'

const DEFAULT_POSITION = { x: 0, y: 0 }
const EMPTY_SIZE = { width: 0, height: 0 }

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
  getInnerRef: () => React.Ref<Element> | undefined
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
    style: _style,
    children,
    onScroll: _onScroll,
    ...rest
  } = props
  const Component = _as as unknown as React.ComponentType<InnerComponentProps<ElKey>>
  const onScroll = _onScroll as React.UIEventHandler<Element>

  // ---

  const id = React.useId()
  const domRef = React.useRef<Element>(null)
  const lastScrollCoords = React.useRef<types.Position>(DEFAULT_POSITION)
  const [visibleKeys, setVisibleKeys] = React.useState<Key[]>([])

  const { size, bucketSize, buckets } = React.useMemo(
    () =>
      utils.measure('Processing', () =>
        utils.process<Key, Item>({
          id,
          items,
          getBoundingBox,
          customGetBucket,
          precomputedCanvasSize,
          precomputedBucketSize,
          precomputedBuckets,
        })
      ),
    // We don't care about the fns changing
    [id, items, precomputedBucketSize, precomputedBuckets, precomputedCanvasSize]
  )

  React.useLayoutEffect(() => {
    const newVisibleKeys = utils.measure('Calculating Visible Keys', () =>
      utils.calculateVisibleKeys({
        scroll: lastScrollCoords.current,
        bucketSize,
        buckets,
        getBoundingBox,
        viewportSize: utils.unsafeHtmlDivElementTypeCoercion(domRef.current)?.getBoundingClientRect() ?? EMPTY_SIZE,
        items,
        overscan,
      })
    )

    setVisibleKeys((prevVisibleKeys) =>
      // Prevents unnecessary re-renders
      utils.areKeysEqual(prevVisibleKeys, newVisibleKeys) ? prevVisibleKeys : newVisibleKeys
    )
    // We don't care about the fns changing
  }, [bucketSize, buckets, items, overscan])

  // ---

  const cvk = React.useCallback(
    (scroll: types.Position) =>
      utils.measure('Calculating Visible Keys', () =>
        utils.calculateVisibleKeys({
          scroll,
          bucketSize,
          buckets,
          getBoundingBox,
          viewportSize: utils.unsafeHtmlDivElementTypeCoercion(domRef.current)?.getBoundingClientRect() ?? EMPTY_SIZE,
          items,
          overscan,
        })
      ),
    [bucketSize, buckets, getBoundingBox, items, overscan]
  )

  // Need to useMountEffect to set initial visible keys since it needs domRef.current to be set first
  utils.useMountEffect(() => setVisibleKeys(cvk(lastScrollCoords.current)))

  const throttledScroll = React.useMemo(
    () =>
      utils.throttle((event: React.UIEvent<Element>) => {
        const target = utils.unsafeHtmlDivElementTypeCoercion(event.target)
        lastScrollCoords.current = { x: target.scrollLeft, y: target.scrollTop }
        const newVisibleKeys = cvk(lastScrollCoords.current)

        setVisibleKeys((prevVisibleKeys) =>
          // Prevents unnecessary re-renders
          utils.areKeysEqual(prevVisibleKeys, newVisibleKeys) ? prevVisibleKeys : newVisibleKeys
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

  const canvasContextValue = React.useMemo(() => {
    const visibleEntries = visibleKeys.map((key): [Key, Item] => [key, utils.getItem(items, key)])
    return { size, visibleEntries, getBoundingBox }
  }, [items, size, visibleKeys, getBoundingBox])

  const style = React.useMemo(
    () => ({ overflow: 'auto', border: '1px solid blue', width: '100%', height: '100%', ..._style }),
    [_style]
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

  // TODO: remove and place in debug/perf utils
  console.debug(
    '# Visible Items:',
    visibleKeys.length,
    '| Item IDs:',
    visibleKeys.map((key) => utils.getItem(items, key))
  )

  return (
    <Component {...rest} ref={domRef} onScroll={handleScroll} style={style}>
      {/* @ts-expect-error - Item != Item; gotta fix the types */}
      <CanvasContext.Provider value={canvasContextValue}>{children}</CanvasContext.Provider>
    </Component>
  )
}

export default React.memo(React.forwardRef(Viewport))
