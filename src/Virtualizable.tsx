import React, { HTMLAttributes, ReactNode, useCallback, useMemo } from 'react'
import { throttle } from './utils'

type PositiveNumber = number // [0, ∞)
type Box = {
  x: number
  y: number
  width: PositiveNumber
  height: PositiveNumber
}

type Item = unknown
type Collection<I extends Item, Key extends string> = Record<Key, I> | I[]

type BucketKey = string // `${number}-${number}`
const getBucketKey = (x: number, y: number): BucketKey => `${x}-${y}`
//const getCoordsFromKey = (key: BucketKey)  => key.split('-').map(Number) as [x: number, y: number]

export interface ListProps<I extends Item, Key extends string> extends HTMLAttributes<HTMLDivElement> {
  items: Collection<I, Key>
  getBoundingBox: (item: I, key: Key | number) => Box
  renderItem: (item: I, key: Key | number) => ReactNode
  // ---
  bucketSize?: PositiveNumber // Defaults to the smaller of the two dimensions (width or height); MAXING OUT AT 500x500
  getBucket?: (item: I, key: Key | number) => [number, number] // Preprocessing makes this faster, but component will handle it if not provided (rets [x, y])
}

export const Virtualizable = <I extends Item, Key extends string>(props: ListProps<I, Key>): JSX.Element => {
  const { items, getBoundingBox, renderItem, className, style } = props

  const { width, height } = useMemo(
    () =>
      Object.keys(items).reduce(
        (acc, key) => {
          // @ts-expect-error - TODO need to fix
          const item = items[key]
          // @ts-expect-error - TODO need to fix
          const box = getBoundingBox(item, key)
          return {
            width: Math.max(acc.width, box.x + box.width),
            height: Math.max(acc.height, box.y + box.height),
          }
        },
        { width: 0, height: 0 }
      ),
    [items, getBoundingBox]
  )

  // Performance optimizations (a grid would be able to make a more performant getBucket function based on assumptions)
  const bucketSize = props.bucketSize ?? Math.min(width, height, 500)
  const _getBucket = useCallback(
    (item: I, key: Key | number) => {
      const box = getBoundingBox(item, key)
      return [Math.floor(box.x / bucketSize), Math.floor(box.y / bucketSize)]
    },
    [bucketSize, getBoundingBox]
  )
  const getBucket = props.getBucket ?? _getBucket

  // TODO: GPU Acceleration ???
  const buckets = useMemo(() => {
    const buckets: Record<BucketKey, Key[]> = {}

    Object.keys(items).forEach((_key) => {
      const key = _key as Key

      // @ts-expect-error - TODO need to fix
      const item = items[key]
      const [x, y] = getBucket(item, key)
      const bucketKey = getBucketKey(x, y)

      if (!buckets[bucketKey]) {
        buckets[bucketKey] = []
      }
      buckets[bucketKey].push(key)
    })

    return buckets
  }, [getBucket, items])

  const [domRef, setDomRef] = React.useState<HTMLDivElement | null>(null)
  // TODO: GPU Acceleration ???
  const getVisibleKeys = useCallback(
    (scroll: { x: number; y: number }) => {
      const containerBox = domRef?.getBoundingClientRect() ?? { width: 0, height: 0 }

      const bucketMinX = Math.floor(scroll.x / bucketSize)
      const bucketMinY = Math.floor(scroll.y / bucketSize)
      const bucketMaxX = Math.floor((scroll.x + containerBox.width) / bucketSize)
      const bucketMaxY = Math.floor((scroll.y + containerBox.height) / bucketSize)

      const visibleKeys: Key[] = []

      // console.log('Bucket Range:', bucketMinX, bucketMaxX, bucketMinY, bucketMaxY)
      for (let x = bucketMinX - 1; x <= bucketMaxX + 1; x++) {
        for (let y = bucketMinY - 1; y <= bucketMaxY + 1; y++) {
          // Relevant buckets
          const bucketKey = getBucketKey(x, y)
          const bucket = buckets[bucketKey] ?? []
          bucket.forEach((key) => {
            // @ts-expect-error - TODO need to fix
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
    },
    [domRef, getBoundingBox, items, bucketSize, buckets]
  )

  // TODO: replace scroll with visible components, calculate visible components within the scroll handler
  // const [scroll, setScroll] = React.useState({ x: 0, y: 0 })
  const [visibleKeys, setVisibleKeys] = React.useState<Key[]>(getVisibleKeys({ x: 0, y: 0 }))
  const handleScroll = useMemo(
    () =>
      throttle((event: React.UIEvent<HTMLDivElement>) => {
        // @ts-expect-error - TODO fix type
        const newVisibleKeys = getVisibleKeys({ x: event.target.scrollLeft, y: event.target.scrollTop })
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
    [getVisibleKeys]
  )

  console.log(
    '# Visible Items:',
    visibleKeys.length,
    '| Item IDs:',
    // @ts-expect-error - TODO need to fix
    visibleKeys.map((key) => items[key].id)
  )

  return (
    <div
      ref={setDomRef}
      className={className}
      onScroll={handleScroll}
      style={{ overflow: 'auto', border: '1px solid blue', ...style }}
    >
      {/* @ts-expect-error - TODO need to fix */}
      <div style={{ width, height, position: 'relative' }}>{visibleKeys.map((key) => renderItem(items[key], key))}</div>
    </div>
  )
}
