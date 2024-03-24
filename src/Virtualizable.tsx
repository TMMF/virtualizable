import * as React from 'react'
import * as utils from './utils'
import * as types from './types'

export interface VirtualizableProps<Key extends types.KeyBase, Item extends types.ItemBase> {
  items: types.Collection<Key, Item>
  getBoundingBox: types.GetBoundingBox<Key, Item> // Q: should this handle % based positioning?
  renderItem: types.RenderItem<Key, Item>
  // ---
  bucketSize?: types.PositiveNumber // Defaults to the smaller of the two dimensions (width or height); MAXING OUT AT 500x500
  getBucket?: types.GetBucket<Key, Item> // Preprocessing makes this faster, but component will handle it if not provided (rets [x, y])
  buckets?: types.Buckets<Key> // Preprocessing makes this faster, but component will handle it if not provided
  canvasSize?: types.Size // Precomputed size (if available)
  // ---
  overscan?: types.PositiveNumber // Defaults to ??? (needs to at least 1 for tabbing purposes)
  scrollThrottle?: types.Milliseconds // Defaults to 100ms
  // ---
  //onCanvasSizeChange?: // size change
  //onBucketsChange?: // buckets change
  //onPreprocessed?: // Preprocessed data (when it finishes; indicative of when the component is ready to render)
  //onItemsRendered?: (items: types.Collection<Key, Item>) => void // Rendered items (when it changes)
  //onItemsVisible?: (items: types.Collection<Key, Item>) => void // Rendered + Visible items (when it changes)
}

// TODO:
// - Fix initial empty render
// - Support updating items
// - Create imperative API
// - Support resizing (https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API)
// - Support infinite scrolling canvas
// - Support streaming items (for infinite scrolling)
// - Context for scrolling (?)
// - useTransition/useDeferredValue for rendered items
// - Expose utils for customization

const CanvasContext = React.createContext({
  size: { width: 0, height: 0 },
  visibleEntries: [] as [types.KeyBase, types.ItemBase][],
  // @ts-ignore
  getBoundingBox: <Key extends types.KeyBase, Item extends types.ItemBase>(item: Item, key: Key) => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  }),
})
const ItemContext = React.createContext({
  box: { x: 0, y: 0, width: 0, height: 0 },
})

type ViewportProps<Key extends types.KeyBase, Item extends types.ItemBase> = JSX.IntrinsicElements['div'] &
  Omit<VirtualizableProps<Key, Item>, 'renderItem'> & { as?: string }
const _Viewport = <Key extends types.KeyBase, Item extends types.ItemBase>(
  props: ViewportProps<Key, Item>,
  // @ts-ignore
  ref: React.Ref<HTMLDivElement>
) => {
  const {
    items,
    getBoundingBox,
    scrollThrottle = 50,
    getBucket: customGetBucket,
    canvasSize: precomputedCanvasSize,
    bucketSize: precomputedBucketSize,
    buckets: precomputedBuckets,
    as: Component = 'div',
    style,
    children,
    onScroll,
    ...rest
  } = props

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

  const domRef = React.useRef<HTMLDivElement | null>(null)
  const cvk = React.useCallback(
    (scroll: types.Position) =>
      utils.measure('Calculating Visible Keys', () =>
        utils.calculateVisibleKeys({
          scroll,
          bucketSize,
          buckets,
          getBoundingBox,
          viewportSize: domRef.current?.getBoundingClientRect() ?? { width: 0, height: 0 },
          items,
        })
      ),
    [bucketSize, buckets, getBoundingBox, items]
  )

  const [visibleKeys, setVisibleKeys] = React.useState<Key[]>(() => cvk({ x: 0, y: 0 }))
  const visibleEntries = React.useMemo(
    () => visibleKeys.map((key): [Key, Item] => [key, items[key]]),
    [items, visibleKeys]
  )

  const throttledScroll = React.useMemo(
    () =>
      utils.throttle((event: React.UIEvent<HTMLDivElement>) => {
        const target = event.target as HTMLDivElement
        const newVisibleKeys = cvk({ x: target.scrollLeft, y: target.scrollTop })

        setVisibleKeys((prevVisibleKeys) =>
          // Prevents unnecessary re-renders
          utils.areKeysEqual(prevVisibleKeys, newVisibleKeys) ? prevVisibleKeys : newVisibleKeys
        )
      }, scrollThrottle),
    [cvk, scrollThrottle]
  )

  const _onScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      throttledScroll(event)
      onScroll?.(event)
    },
    [throttledScroll, onScroll]
  )

  const canvasContextValue = React.useMemo(
    () => ({ size, visibleEntries, getBoundingBox }),
    [size, visibleEntries, getBoundingBox]
  )

  console.log(
    '# Visible Items:',
    visibleKeys.length,
    '| Item IDs:',
    visibleKeys.map((key) => items[key])
  )

  return (
    // @ts-ignore
    <Component
      {...rest}
      ref={domRef}
      onScroll={_onScroll}
      style={{ overflow: 'auto', border: '1px solid blue', width: '100%', height: '100%', ...style }}
    >
      {/* @ts-expect-error - Item != Item; gotta fix the types */}
      <CanvasContext.Provider value={canvasContextValue}>{children}</CanvasContext.Provider>
    </Component>
  )
}
//_Viewport.displayName = 'Viewport'
const Viewport = React.memo(React.forwardRef(_Viewport))

type CanvasProps<Key extends types.KeyBase, Item extends types.ItemBase> = JSX.IntrinsicElements['div'] & {
  as?: string
  renderItem: types.RenderItem<Key, Item>
}
const _Canvas = <Key extends types.KeyBase, Item extends types.ItemBase>(
  props: CanvasProps<Key, Item>,
  // @ts-ignore
  ref: React.Ref<HTMLDivElement>
) => {
  const { as: Component = 'div', renderItem, style, ...rest } = props
  const { size, visibleEntries, getBoundingBox } = React.useContext(CanvasContext)
  const { width, height } = size

  return (
    // @ts-ignore
    <Component {...rest} style={{ width, height, position: 'relative', ...style }}>
      {visibleEntries.map(([_key, _item]) => {
        const key = _key as Key
        const item = _item as Item

        const box = getBoundingBox(item, key)
        return (
          <ItemContext.Provider key={key} value={{ box }}>
            {renderItem(item, key)}
          </ItemContext.Provider>
        )
      })}
    </Component>
  )
}
//_Canvas.displayName = 'Canvas'
const Canvas = React.memo(React.forwardRef(_Canvas))

type ItemProps = JSX.IntrinsicElements['div'] & { as?: string }
// @ts-ignore
const _Item = (props: ItemProps, ref: React.Ref<HTMLDivElement>) => {
  const { as: Component = 'div', style, ...rest } = props
  const { box } = React.useContext(ItemContext)

  return (
    <Component
      {...rest}
      // @ts-ignore
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        ...style,
      }}
    />
  )
}
//_Item.displayName = 'Item'
const Item = React.memo(React.forwardRef(_Item))

export const Virtualizable = Object.assign(
  React.forwardRef(function Virtualizable<Key extends types.KeyBase, Item extends types.ItemBase>(
    props: VirtualizableProps<Key, Item> & { children?: React.ReactNode },
    // @ts-ignore
    ref: React.Ref<unknown>
  ): JSX.Element {
    const { renderItem, children, ...viewportProps } = props

    /*React.useImperativeHandle(
      ref,
      () => ({
        // @ts-ignore
        scrollTo: (left: number, top: number) => {},
        // @ts-ignore
        scrollToItem: (key: Key, alignment: 'auto' | 'start' | 'center' | 'end') => {}, // accessibility tab/arrow key navigation uses this + focus
        getCanvasSize: () => ({ width, height }),
        getRenderedItems: () => {},
        getVisibleItems: () => {},
        getBuckets: () => buckets,
        getInnerRef: () => domRef,
        recompute: () => {}, // forcibly recompute size + buckets + visible keys (should be unnecessary in most cases, but useful for debugging and testing)
        recomputeItem: () => {}, // forcibly recompute size + bucket + visible key for a specific item (more efficient than recompute)
      }),
      []
    )*/

    return (
      // @ts-ignore
      <Viewport {...viewportProps}>
        <Canvas renderItem={(item, key) => <Item key={key}>{renderItem(item as Item, key as Key)}</Item>}>
          {children}
        </Canvas>
      </Viewport>
    )
  }),
  { Viewport, Canvas, Item }
)

/*
<Virtualizable renderItem={(item, key) => ...}</Item>}>
  <RandomComponent1 />
  <RandomComponent2 />
</Virtualizable>

<Viewport {...props}>
  <Canvas renderItem={(item, key) => <Item key={key}>{...}</Item>} />
</Viewport>

<Viewport {...props}>
  <Canvas renderItem={(item, key) => <Item key={key}>{...}</Item>}>
    <RandomComponent1 />
    <RandomComponent2 />
  </Canvas>
</Viewport>
*/
