import * as React from 'react'
import * as utils from './utils'
import * as types from './types'

export interface ListProps<Key extends types.KeyBase, Item extends types.ItemBase>
  extends React.HTMLAttributes<HTMLDivElement> {
  items: Record<Key, Item>
  getBoundingBox: types.GetBoundingBox<Key, Item>
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
  as?: string // Defaults to 'div'
  // --- DIV PROPS
  // ...
  onItemsRendered?: (items: Record<Key, Item>) => void // Rendered items (when it changes)
  onItemsVisible?: (items: Record<Key, Item>) => void // Rendered + Visible items (when it changes)
}

// TODO:
// Context for scrolling and not scrolling
// Context for rendered items?
// useTransition and useDeferredValue for rendered items?

// Viewport, Canvas, Item???

const CanvasContext = React.createContext({ size: { width: 0, height: 0 } })
const ItemContext = React.createContext({
  box: { x: 0, y: 0, width: 0, height: 0 },
})

type ViewportProps = JSX.IntrinsicElements['div'] & { as?: string }
const Viewport = React.forwardRef(function Viewport(props: ViewportProps, ref: React.Ref<HTMLDivElement>) {
  const { as: Component = 'div', style, ...rest } = props

  // @ts-ignore
  return <Component {...rest} ref={ref} style={{ overflow: 'auto', border: '1px solid blue', ...style }} />
})

type CanvasProps = JSX.IntrinsicElements['div'] & { as?: string }
const Canvas = React.forwardRef(function Canvas(props: CanvasProps, ref: React.Ref<HTMLDivElement>) {
  const { as: Component = 'div', style, ...rest } = props
  const { size } = React.useContext(CanvasContext)
  const { width, height } = size

  // @ts-ignore
  return <Component {...rest} ref={ref} style={{ width, height, position: 'relative', ...style }} />
})

type ItemProps = JSX.IntrinsicElements['div'] & { as?: string }
const Item = React.forwardRef(function Item(props: ItemProps, ref: React.Ref<HTMLDivElement>) {
  const { as: Component = 'div', style, ...rest } = props
  const { box } = React.useContext(ItemContext)

  return (
    <Component
      {...rest}
      // @ts-ignore
      ref={ref}
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
})

export const Virtualizable = Object.assign(
  React.forwardRef(function Virtualizable<Key extends types.KeyBase, Item extends types.ItemBase>(
    props: ListProps<Key, Item>,
    ref: React.Ref<unknown>
  ): JSX.Element {
    const {
      items,
      getBoundingBox,
      renderItem,
      className,
      style,
      scrollThrottle = 50,
      getBucket: customGetBucket,
      canvasSize: precomputedCanvasSize,
      bucketSize: precomputedBucketSize,
      buckets: precomputedBuckets,
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
    const { width, height } = size

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
    const handleScroll = React.useMemo(
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

    React.useImperativeHandle(
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
        recompute: () => {}, // forcibly recompute buckets + visible keys (should be unnecessary in most cases, but useful for debugging and testing)
      }),
      []
    )

    console.log(
      '# Visible Items:',
      visibleKeys.length,
      '| Item IDs:',
      visibleKeys.map((key) => items[key])
    )

    return (
      <Viewport ref={domRef} className={className} onScroll={handleScroll} style={style}>
        <CanvasContext.Provider value={{ size }}>
          <Canvas>
            {visibleKeys.map((key) => {
              const box = getBoundingBox(items[key], key)
              return (
                <ItemContext.Provider key={key} value={{ box }}>
                  <Item key={key}>{renderItem(items[key], key)}</Item>
                </ItemContext.Provider>
              )
            })}
          </Canvas>
        </CanvasContext.Provider>
      </Viewport>
    )
  }),
  { Viewport, Canvas, Item }
)
