import * as types from './types'

export const throttle = <Args extends unknown[]>(fn: (...args: Args) => unknown, wait: types.Milliseconds) => {
  let inThrottle = false
  let lastTimeout: ReturnType<typeof setTimeout> | undefined = undefined
  let lastTime = 0

  return (...args: Args): void => {
    if (!inThrottle) {
      fn(...args)
      lastTime = Date.now()
      inThrottle = true
    } else {
      clearTimeout(lastTimeout)
      const timeoutDuration = Math.max(wait - (Date.now() - lastTime), 0)

      lastTimeout = setTimeout(() => {
        if (Date.now() - lastTime >= wait) {
          fn(...args)
          lastTime = Date.now()
        }
      }, timeoutDuration)
    }
  }
}

export const measure = <Result>(name: string, fn: () => Result): Result => {
  if (process.env.NODE_ENV !== 'development') return fn()

  performance.mark(`${name}-start`)
  const result = fn()
  performance.mark(`${name}-end`)

  const { duration } = performance.measure(`${name}-measure`, { start: `${name}-start`, end: `${name}-end` })
  performance.clearMarks()
  performance.clearMeasures()

  console.debug(`${name}: ${duration}ms`)
  return result
}

// ---

const getBucketKey = (x: number, y: number): types.BucketKey => `${x}-${y}`

const calculateCanvasSize = <Key extends types.KeyBase, Item extends types.ItemBase>(
  items: types.Collection<Key, Item>,
  getBoundingBox: types.GetBoundingBox<Key, Item>
): types.Size =>
  Object.keys(items).reduce(
    (acc, _key) => {
      const key = _key as Key

      const item = items[key]
      const box = getBoundingBox(item, key)
      return {
        width: Math.max(acc.width, box.x + box.width),
        height: Math.max(acc.height, box.y + box.height),
      }
    },
    { width: 0, height: 0 }
  )

const calculateBuckets = <Key extends types.KeyBase, Item extends types.ItemBase>(
  items: types.Collection<Key, Item>,
  getBucket: types.GetBucket<Key, Item>
) => {
  const buckets: Record<types.BucketKey, Key[]> = {}

  Object.keys(items).forEach((_key) => {
    const key = _key as Key

    const item = items[key]
    const [x, y] = getBucket(item, key)
    const bucketKey = getBucketKey(x, y)

    if (!buckets[bucketKey]) {
      buckets[bucketKey] = []
    }
    buckets[bucketKey].push(key)
  })

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

  const size = precomputedCanvasSize ?? calculateCanvasSize(items, getBoundingBox)
  const bucketSize = precomputedBucketSize ?? Math.max(100, Math.min(size.width, size.height, 1000))

  const getBucket =
    customGetBucket ??
    ((item: Item, key: Key) => {
      const box = getBoundingBox(item, key)
      return [Math.floor(box.x / bucketSize), Math.floor(box.y / bucketSize)]
    })
  const buckets = precomputedBuckets ?? calculateBuckets(items, getBucket)

  return { size, bucketSize, buckets }
}

type vkArgs<Key extends types.KeyBase, Item extends types.ItemBase> = {
  scroll: types.Position
  bucketSize: types.PositiveNumber
  buckets: types.Buckets<Key>
  getBoundingBox: types.GetBoundingBox<Key, Item>
  viewportSize: types.Size
  items: types.Collection<Key, Item>
}

export const calculateVisibleKeys = <Key extends types.KeyBase, Item extends types.ItemBase>({
  scroll,
  bucketSize,
  buckets,
  getBoundingBox,
  viewportSize,
  items,
}: vkArgs<Key, Item>) => {
  const bucketMinX = Math.floor(scroll.x / bucketSize)
  const bucketMinY = Math.floor(scroll.y / bucketSize)
  const bucketMaxX = Math.floor((scroll.x + viewportSize.width) / bucketSize)
  const bucketMaxY = Math.floor((scroll.y + viewportSize.height) / bucketSize)

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
          box.x < scroll.x + viewportSize.width &&
          box.y < scroll.y + viewportSize.height &&
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

export const areSetsEqual = <T>(a: Set<T>, b: Set<T>) => {
  if (a.size !== b.size) return false
  return [...a].every((item) => b.has(item))
}

export const areArraysEqual = <T>(a: T[], b: T[]) => {
  if (a.length !== b.length) return false
  return a.every((item, i) => item === b[i])
}

export const areKeysEqual = <Key extends types.KeyBase>(a: Key[], b: Key[]) => {
  return areSetsEqual(new Set(a), new Set(b))
}
