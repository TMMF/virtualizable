import * as types from './types'
import * as utils from './utils'

const getBucketKey = (x: number, y: number): types.BucketKey => `${x}-${y}`
export const getItem = <Key extends types.KeyBase, Item extends types.ItemBase>(
  items: types.Collection<Key, Item>,
  key: Key
  // @ts-expect-error - TS doesn't think Key is a key of items
) => items[key]

const calculateCanvasSize = <Key extends types.KeyBase, Item extends types.ItemBase>(
  items: types.Collection<Key, Item>,
  getBoundingBox: types.GetBoundingBox<Key, Item>
): types.Size => {
  const size = { width: 0, height: 0 }

  for (const _key in items) {
    const key = _key as Key
    const item = getItem(items, key)
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

  for (const _key in items) {
    const key = _key as Key
    const item = getItem(items, key)
    const [x, y] = getBucket(item, key)
    const bucketKey = getBucketKey(x, y)

    if (!buckets[bucketKey]) {
      buckets[bucketKey] = []
    }
    buckets[bucketKey].push(key)
  }

  return buckets
}

type ProcessingArgs<Key extends types.KeyBase, Item extends types.ItemBase> = {
  id: string
  items: types.Collection<Key, Item>
  getBoundingBox: types.GetBoundingBox<Key, Item>
  precomputedCanvasSize?: types.Size
  precomputedBucketSize?: types.PositiveNumber
  precomputedBuckets?: types.Buckets<Key>
}

type ProcessingResult<Key extends types.KeyBase> = {
  size: types.Size
  bucketSize: types.PositiveNumber
  buckets: types.Buckets<Key>
}

type StoredData = ProcessingResult<types.KeyBase> & {
  items: types.Collection<types.KeyBase, types.ItemBase>
}

// TODO: this needs to self-cleanup over time (slash on unmount)
const prevData: Record<string, StoredData> = {}
const getBucketFactory =
  <Key extends types.KeyBase, Item extends types.ItemBase>(
    getBoundingBox: types.GetBoundingBox<Key, Item>,
    bucketSize: types.PositiveNumber
  ): types.GetBucket<Key, Item> =>
  (item, key) => {
    const box = getBoundingBox(item, key)
    return [Math.floor(box.x / bucketSize), Math.floor(box.y / bucketSize)]
  }

export const process = <Key extends types.KeyBase, Item extends types.ItemBase>(args: ProcessingArgs<Key, Item>) => {
  const { id, items, getBoundingBox, precomputedCanvasSize, precomputedBucketSize, precomputedBuckets } = args

  // --- No previous data; preprocess ---
  const prev = prevData[id]
  if (!prev) {
    const size = precomputedCanvasSize ?? utils.measure('Size', () => calculateCanvasSize(items, getBoundingBox))
    // TODO: this methodology for bucketSize isn't great if there's clustering of items or if items are tightly packed
    // on a large viewport
    const bucketSize = precomputedBucketSize ?? Math.max(100, Math.min(size.width, size.height, 1000))
    const getBucket = getBucketFactory(getBoundingBox, bucketSize)
    const buckets = precomputedBuckets ?? utils.measure('Buckets', () => calculateBuckets(items, getBucket))

    prevData[id] = { items, size, bucketSize, buckets }
    return { size, bucketSize, buckets }
  }

  // --- Previous data exists; diff changes ---
  if (items !== prev.items) {
    // TODO: this is a naive implementation; we should be able to diff the items and update the size accordingly
    const size = precomputedCanvasSize ?? utils.measure('Size', () => calculateCanvasSize(items, getBoundingBox))
    const bucketSize = precomputedBucketSize ?? Math.max(100, Math.min(size.width, size.height, 1000))
    const getBucket = getBucketFactory(getBoundingBox, bucketSize)

    // Figure out diff'd items
    const prevItemsSet = new Set(Object.values(prev.items)) as Set<Item>
    const newItemsSet = new Set(Object.values(items)) as Set<Item>
    const { added, removed } = utils.diffSets(prevItemsSet, newItemsSet)

    const buckets =
      precomputedBuckets ??
      utils.measure('Buckets', () => {
        // TODO: is copying necessary?
        const newBuckets = { ...prev.buckets } as types.Buckets<Key>

        added.forEach((item) => {
          const key = Object.keys(items).find((k) => getItem(items, k as Key) === item) as Key
          const [x, y] = getBucket(item, key)
          const bucketKey = getBucketKey(x, y)

          if (!newBuckets[bucketKey]) {
            newBuckets[bucketKey] = []
          }
          newBuckets[bucketKey].push(key)
        })

        removed.map((item) => {
          const key = Object.keys(prev.items).find((k) => getItem(prev.items, k as Key) === item) as Key
          const [x, y] = getBucket(item, key)
          const bucketKey = getBucketKey(x, y)

          // TODO: naive and should be replaced with a faster operation
          newBuckets[bucketKey] = newBuckets[bucketKey].filter((k) => k !== key)
        })

        return newBuckets
      })

    prevData[id] = { items, size, bucketSize, buckets }
    return { size, bucketSize, buckets }
  }

  const size = precomputedCanvasSize ?? prev.size
  // TODO: when bucketSize changes, we need to recalculate the buckets
  const bucketSize = precomputedBucketSize ?? prev.bucketSize
  const buckets = precomputedBuckets ?? (prev.buckets as types.Buckets<Key>)

  return {
    size,
    bucketSize,
    buckets,
  }
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

export const calculateVisibleKeys = <Key extends types.KeyBase, Item extends types.ItemBase>(
  args: vkArgs<Key, Item>
) => {
  const { scroll, bucketSize, buckets, getBoundingBox, viewportSize, items, overscan = 0 } = args

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
        const item = getItem(items, key)
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

export const DEFAULT_SCROLL_POSITION = { x: 0, y: 0 }
export const DEFAULT_VIEWPORT_SIZE = { width: 0, height: 0 }

type Listener = () => unknown

export type VirtualizableArgs<Key extends types.KeyBase, Item extends types.ItemBase> = {
  // --- Required Args ---
  items: types.Collection<Key, Item>
  getBoundingBox: types.GetBoundingBox<Key, Item>
  viewportSize: types.Size
  // --- Optional Args ---
  scrollPosition?: types.Position
  // --- Performance Optimizations ---
  overscan?: types.PositiveNumber
  precomputedCanvasSize?: types.Size
  precomputedBucketSize?: types.PositiveNumber
  precomputedBuckets?: types.Buckets<Key>
}

// TODO: class based approach here may be best (since there's internal state)
export const virtualizable = <Key extends types.KeyBase, Item extends types.ItemBase>(
  args: VirtualizableArgs<Key, Item>
) => {
  const id = '<TODO>' // TODO: generate ID
  let internalData = { overscan: 100, scrollPosition: DEFAULT_SCROLL_POSITION, ...args }
  const listeners: Listener[] = []

  const _process = () =>
    utils.measure('Processing', () =>
      process<Key, Item>({
        id,
        items: internalData.items,
        getBoundingBox: internalData.getBoundingBox,
        precomputedCanvasSize: internalData.precomputedCanvasSize,
        precomputedBucketSize: internalData.precomputedBucketSize,
        precomputedBuckets: internalData.precomputedBuckets,
      })
    )

  // TODO: lazily set PROCESSED
  let processed = _process()

  const _calculateKeys = () =>
    utils.measure('Calculating Visible Keys', () =>
      calculateVisibleKeys({
        scroll: internalData.scrollPosition,
        bucketSize: processed.bucketSize,
        buckets: processed.buckets,
        getBoundingBox: internalData.getBoundingBox,
        viewportSize: internalData.viewportSize,
        items: internalData.items,
        overscan: internalData.overscan,
      })
    )

  const emitListeners = () => {
    listeners.forEach((listener) => listener())
  }

  let visibleKeys: Key[] = []
  let OUTPUT = {
    canvasSize: processed.size,
    visibleKeys,
  }

  // TODO: figure out ideal API that works well with React
  return {
    subscribe: (listener: Listener) => {
      listeners.push(listener)

      return () => {
        listeners.splice(listeners.indexOf(listener), 1)
      }
    },
    get: () => OUTPUT,
    set: (updateArgs: Partial<VirtualizableArgs<Key, Item>>) => {
      const oldInternalData = internalData
      internalData = { ...internalData, ...updateArgs }

      const oldProcessed = processed
      if (
        oldInternalData.items !== internalData.items ||
        oldInternalData.getBoundingBox !== internalData.getBoundingBox ||
        oldInternalData.precomputedBucketSize !== internalData.precomputedBucketSize ||
        oldInternalData.precomputedBuckets !== internalData.precomputedBuckets ||
        oldInternalData.precomputedCanvasSize !== internalData.precomputedCanvasSize
      ) {
        processed = _process()
      }

      const oldVisibleKeys = visibleKeys
      if (
        oldInternalData.scrollPosition !== internalData.scrollPosition ||
        oldInternalData.getBoundingBox !== internalData.getBoundingBox ||
        oldInternalData.viewportSize !== internalData.viewportSize ||
        oldInternalData.items !== internalData.items ||
        oldInternalData.overscan !== internalData.overscan ||
        oldProcessed !== processed
      ) {
        visibleKeys = _calculateKeys()
      }

      if (processed === oldProcessed && visibleKeys === oldVisibleKeys) return

      const changed =
        !utils.areKeysEqual(visibleKeys, oldVisibleKeys) || !utils.isSizeEqual(processed.size, oldProcessed.size)
      if (changed) {
        OUTPUT = {
          canvasSize: processed.size,
          visibleKeys,
        }

        emitListeners()
      }
    },
  }
}
