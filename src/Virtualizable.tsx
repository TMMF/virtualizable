import React, { HTMLAttributes, forwardRef, useImperativeHandle, useMemo } from 'react'
import { throttle, measurePerformance, getBucketKey, preprocess } from './utils'
import {
  Box,
  BucketKey,
  Buckets,
  GetBoundingBox,
  GetBucket,
  ItemBase,
  KeyBase,
  PositiveNumber,
  RenderItem,
  Size,
} from './types'

export interface ListProps<Key extends KeyBase, Item extends ItemBase> extends HTMLAttributes<HTMLDivElement> {
  items: Record<Key, Item>
  getBoundingBox: GetBoundingBox<Key, Item>
  renderItem: RenderItem<Key, Item>
  // ---
  bucketSize?: PositiveNumber // Defaults to the smaller of the two dimensions (width or height); MAXING OUT AT 500x500
  getBucket?: GetBucket<Key, Item> // Preprocessing makes this faster, but component will handle it if not provided (rets [x, y])
  buckets?: Buckets<Key> // Preprocessing makes this faster, but component will handle it if not provided
  canvasSize?: Size // Precomputed size (if available)
  // ---
  overscan?: PositiveNumber // Defaults to ??? (needs to at least 1 for tabbing purposes)
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

type vkArgs<Key extends KeyBase, Item extends ItemBase> = {
  scroll: { x: number; y: number }
  bucketSize: PositiveNumber
  buckets: Record<BucketKey, Key[]>
  getBoundingBox: (item: Item, key: Key) => Box
  domRef: React.RefObject<HTMLDivElement>
  items: Record<Key, Item>
}

const calculateVisibleKeys = <Key extends KeyBase, Item extends ItemBase>({
  scroll,
  bucketSize,
  buckets,
  getBoundingBox,
  domRef,
  items,
}: vkArgs<Key, Item>) => {
  const containerBox = domRef.current?.getBoundingClientRect() ?? { width: 0, height: 0 }

  const bucketMinX = Math.floor(scroll.x / bucketSize)
  const bucketMinY = Math.floor(scroll.y / bucketSize)
  const bucketMaxX = Math.floor((scroll.x + containerBox.width) / bucketSize)
  const bucketMaxY = Math.floor((scroll.y + containerBox.height) / bucketSize)

  const visibleKeys: Key[] = []

  for (let x = bucketMinX - 1; x <= bucketMaxX + 1; x++) {
    for (let y = bucketMinY - 1; y <= bucketMaxY + 1; y++) {
      // Relevant buckets
      const bucketKey = getBucketKey(x, y)
      const bucket = buckets[bucketKey] ?? []
      bucket.forEach((key) => {
        const item = items[key]
        const box = getBoundingBox(item, key)

        if (
          box.x < scroll.x + containerBox.width &&
          box.y < scroll.y + containerBox.height &&
          box.x + box.width > scroll.x &&
          box.y + box.height > scroll.y
        ) {
          visibleKeys.push(key)
        }
      })
    }
  }

  return visibleKeys
}

// Viewport, Canvas, Item???

const CanvasContext = React.createContext({ size: { width: 0, height: 0 } })
const ItemContext = React.createContext({
  box: { x: 0, y: 0, width: 0, height: 0 },
})

type ViewportProps = JSX.IntrinsicElements['div'] & { as?: string }
const Viewport = forwardRef(function Viewport(props: ViewportProps, ref: React.Ref<HTMLDivElement>) {
  const { as: Component = 'div', style, ...rest } = props

  // @ts-ignore
  return <Component {...rest} ref={ref} style={{ overflow: 'auto', border: '1px solid blue', ...style }} />
})

type CanvasProps = JSX.IntrinsicElements['div'] & { as?: string }
const Canvas = (props: CanvasProps) => {
  const { as: Component = 'div', style, ...rest } = props
  const { size } = React.useContext(CanvasContext)
  const { width, height } = size

  // @ts-ignore
  return <Component {...rest} style={{ width, height, position: 'relative', ...style }} />
}

type ItemProps = JSX.IntrinsicElements['div'] & { as?: string }
const Item = (props: ItemProps) => {
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

export const Virtualizable = Object.assign(
  forwardRef(function Virtualizable<Key extends KeyBase, Item extends ItemBase>(
    props: ListProps<Key, Item>,
    ref: React.Ref<unknown>
  ): JSX.Element {
    const { items, getBoundingBox, renderItem, className, style } = props
    const { size, bucketSize, buckets } = useMemo(
      () =>
        measurePerformance('Preprocessing', () =>
          preprocess({
            items,
            getBoundingBox,
            customGetBucket: props.getBucket,
            precomputedCanvasSize: props.canvasSize,
            precomputedBucketSize: props.bucketSize,
            precomputedBuckets: props.buckets,
          })
        ),
      []
    )
    const { width, height } = size

    const domRef = React.useRef<HTMLDivElement | null>(null)

    const [visibleKeys, setVisibleKeys] = React.useState<Key[]>(() =>
      calculateVisibleKeys({ scroll: { x: 0, y: 0 }, bucketSize, buckets, getBoundingBox, domRef, items })
    )
    const handleScroll = useMemo(
      () =>
        throttle((event: React.UIEvent<HTMLDivElement>) => {
          // @ts-expect-error - TODO fix type
          const scroll = { x: event.target.scrollLeft, y: event.target.scrollTop }
          const newVisibleKeys = calculateVisibleKeys({ scroll, bucketSize, buckets, getBoundingBox, domRef, items })
          setVisibleKeys((prevVisibleKeys) => {
            if (
              prevVisibleKeys.length === newVisibleKeys.length &&
              prevVisibleKeys.every((key, i) => key === newVisibleKeys[i])
            ) {
              return prevVisibleKeys
            }

            return newVisibleKeys
          })
        }, 100),
      [bucketSize, buckets, getBoundingBox, items]
    )

    useImperativeHandle(
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

    /* console.log(
      '# Visible Items:',
      visibleKeys.length,
      '| Item IDs:',
      visibleKeys.map((key) => items[key])
    ) */

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
