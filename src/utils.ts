import {
  Milliseconds,
  BucketKey,
  Buckets,
  GetBoundingBox,
  GetBucket,
  ItemBase,
  KeyBase,
  PositiveNumber,
  Size,
} from './types'

export const throttle = <Args extends unknown[]>(fn: (...args: Args) => unknown, wait: Milliseconds) => {
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

export const measurePerformance = <Result>(name: string, fn: () => Result): Result => {
  if (process.env.NODE_ENV !== 'development') return fn()

  performance.mark(`${name}-start`)
  const result = fn()
  performance.mark(`${name}-end`)

  const { duration } = performance.measure(`${name}-measure`, { start: `${name}-start`, end: `${name}-end` })
  performance.clearMarks()
  performance.clearMeasures()

  console.log(`${name}: ${duration}ms`)
  return result
}

// ---

export const getBucketKey = (x: number, y: number): BucketKey => `${x}-${y}`

const calculateCanvasSize = <Key extends KeyBase, Item extends ItemBase>(
  items: Record<Key, Item>,
  getBoundingBox: GetBoundingBox<Key, Item>
): Size => {
  return Object.keys(items).reduce(
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
}
const calculateBuckets = <Key extends KeyBase, Item extends ItemBase>(
  items: Record<Key, Item>,
  getBucket: GetBucket<Key, Item>
) => {
  const buckets: Record<BucketKey, Key[]> = {}

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

export const preprocess = <Key extends KeyBase, Item extends ItemBase>(args: {
  items: Record<Key, Item>
  getBoundingBox: GetBoundingBox<Key, Item>
  customGetBucket?: GetBucket<Key, Item>
  precomputedCanvasSize?: Size
  precomputedBucketSize?: PositiveNumber
  precomputedBuckets?: Buckets<Key>
}) => {
  const { items, getBoundingBox, customGetBucket, precomputedCanvasSize, precomputedBucketSize, precomputedBuckets } =
    args

  const size = precomputedCanvasSize ?? calculateCanvasSize(items, getBoundingBox)
  const bucketSize = precomputedBucketSize ?? Math.min(size.width, size.height, 500)

  const getBucket =
    customGetBucket ??
    ((item: Item, key: Key) => {
      const box = getBoundingBox(item, key)
      return [Math.floor(box.x / bucketSize), Math.floor(box.y / bucketSize)]
    })
  const buckets = precomputedBuckets ?? calculateBuckets(items, getBucket)

  return { size, bucketSize, buckets }
}
