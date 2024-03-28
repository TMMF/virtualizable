import * as types from '../types'
import { measure } from './perf'

const getBucketKey = (x: number, y: number): types.BucketKey => `${x}-${y}`

const calculateCanvasSize = <Key extends types.KeyBase, Item extends types.ItemBase>(
  items: types.Collection<Key, Item>,
  getBoundingBox: types.GetBoundingBox<Key, Item>
): types.Size => {
  const size = { width: 0, height: 0 }

  for (const key in items) {
    const item = items[key]
    const box = getBoundingBox(item, key)
    size.width = Math.max(size.width, box.x + box.width)
    size.height = Math.max(size.height, box.y + box.height)
  }

  return size
}

const calculateBuckets = <Key extends types.KeyBase, Item extends types.ItemBase>(
  items: types.Collection<Key, Item>,
  getBucket: types.GetBucket<Key, Item>
) => {
  const buckets: Record<types.BucketKey, Key[]> = {}

  for (const key in items) {
    const item = items[key]
    const [x, y] = getBucket(item, key)
    const bucketKey = getBucketKey(x, y)

    if (!buckets[bucketKey]) {
      buckets[bucketKey] = []
    }
    buckets[bucketKey].push(key)
  }

  return buckets
}

export const preprocess = <Key extends types.KeyBase, Item extends types.ItemBase>(args: {
  items: types.Collection<Key, Item>
  getBoundingBox: types.GetBoundingBox<Key, Item>
  customGetBucket?: types.GetBucket<Key, Item>
  precomputedCanvasSize?: types.Size
  precomputedBucketSize?: types.PositiveNumber
  precomputedBuckets?: types.Buckets<Key>
}) => {
  const { items, getBoundingBox, customGetBucket, precomputedCanvasSize, precomputedBucketSize, precomputedBuckets } =
    args

  const size = precomputedCanvasSize ?? measure('Size', () => calculateCanvasSize(items, getBoundingBox))
  // TODO: this methodology for bucketSize isn't great if there's clustering of items or if items are tightly packed
  // on a large viewport
  const bucketSize = precomputedBucketSize ?? Math.max(100, Math.min(size.width, size.height, 1000))

  const getBucket =
    customGetBucket ??
    ((item: Item, key: Key) => {
      const box = getBoundingBox(item, key)
      return [Math.floor(box.x / bucketSize), Math.floor(box.y / bucketSize)]
    })
  const buckets = precomputedBuckets ?? measure('Buckets', () => calculateBuckets(items, getBucket))

  return { size, bucketSize, buckets }
}

type vkArgs<Key extends types.KeyBase, Item extends types.ItemBase> = {
  scroll: types.Position
  bucketSize: types.PositiveNumber
  buckets: types.Buckets<Key>
  getBoundingBox: types.GetBoundingBox<Key, Item>
  viewportSize: types.Size
  items: types.Collection<Key, Item>
  overscan?: types.PositiveNumber
}

export const calculateVisibleKeys = <Key extends types.KeyBase, Item extends types.ItemBase>({
  scroll,
  bucketSize,
  buckets,
  getBoundingBox,
  viewportSize,
  items,
  overscan = 0,
}: vkArgs<Key, Item>) => {
  // TODO: this logic doesn't necessarily work with a customGetBucket fn
  const bucketMinX = Math.floor((scroll.x - overscan) / bucketSize)
  const bucketMinY = Math.floor((scroll.y - overscan) / bucketSize)
  const bucketMaxX = Math.floor((scroll.x + viewportSize.width + overscan) / bucketSize)
  const bucketMaxY = Math.floor((scroll.y + viewportSize.height + overscan) / bucketSize)

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
          box.x < scroll.x + viewportSize.width + overscan &&
          box.y < scroll.y + viewportSize.height + overscan &&
          box.x + box.width > scroll.x - overscan &&
          box.y + box.height > scroll.y - overscan
        ) {
          visibleKeys.push(key)
        }
      })
    }
  }

  return visibleKeys
}
