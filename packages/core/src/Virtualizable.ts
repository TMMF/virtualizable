import * as types from './types'
import * as utils from './utils'

type ProcessingResult<Key extends types.KeyBase> = {
  size: types.Size
  bucketSize: types.PositiveNumber
  buckets: types.Buckets<Key>
}

export interface VirtualizableParams<
  Key extends types.KeyBase,
  Item extends types.ItemBase,
  Items extends types.Collection<Key, Item> = types.Collection<Key, Item>
> {
  // --- Required Args ---
  items: Items
  getBoundingBox: types.GetBoundingBox<Key, Item>
  viewportSize: types.Size
  // --- Optional Args ---
  scrollPosition?: types.Position // Initial scroll position; Default: 0,0
  // --- Performance Optimizations ---
  overscan?: types.PositiveNumber // Default: 100
  precomputedCanvasSize?: types.Size
  precomputedBucketSize?: types.PositiveNumber
  precomputedBuckets?: types.Buckets<Key>
}

// Specifies that fields K are required within T
type Defined<T, K extends keyof T> = T & { [P in K]-?: T[P] }

export class Virtualizable<
  Key extends types.KeyBase,
  Item extends types.ItemBase,
  Items extends types.Collection<Key, Item> = types.Collection<Key, Item>
> {
  #parameters: Defined<VirtualizableParams<Key, Item, Items>, 'scrollPosition' | 'overscan'>
  #listeners: types.Listener[]
  #processed: ProcessingResult<Key>
  #visibleKeys: Set<Key>

  constructor(args: VirtualizableParams<Key, Item, Items>) {
    this.#parameters = { overscan: 100, scrollPosition: { x: 0, y: 0 }, ...args }
    this.#listeners = []

    this.#processed = this.#processInit()
    this.#visibleKeys = this.#calculateKeys()
  }

  #getBucketKey = (x: number, y: number): types.BucketKey => {
    return `${x}-${y}`
  }

  #getItem = (items: Items, key: Key): Item => {
    return items[key as keyof Items] as Item
  }

  #calculateCanvasSize = (items: Items, getBoundingBox: types.GetBoundingBox<Key, Item>): types.Size => {
    const size = { width: 0, height: 0 }

    for (const _key in items) {
      const key = _key as unknown as Key
      const item = this.#getItem(items, key)
      const box = getBoundingBox(item, key)
      size.width = Math.max(size.width, box.x + box.width)
      size.height = Math.max(size.height, box.y + box.height)
    }

    return size
  }

  #calculateBuckets = (items: Items, getBucket: types.GetBucket<Key, Item>): types.Buckets<Key> => {
    const buckets: Record<types.BucketKey, Key[]> = {}

    for (const _key in items) {
      const key = _key as unknown as Key
      const item = this.#getItem(items, key)
      const [x, y] = getBucket(item, key)
      const bucketKey = this.#getBucketKey(x, y)

      if (!buckets[bucketKey]) {
        buckets[bucketKey] = []
      }
      buckets[bucketKey].push(key)
    }

    return buckets
  }

  #processInit = (): ProcessingResult<Key> => {
    const { items, getBoundingBox, precomputedCanvasSize, precomputedBucketSize, precomputedBuckets } = this.#parameters

    const size = precomputedCanvasSize ?? utils.measure('Size', () => this.#calculateCanvasSize(items, getBoundingBox))
    // TODO: this methodology for bucketSize isn't great if there's clustering of items or if items are tightly packed
    // on a large viewport
    const bucketSize = precomputedBucketSize ?? Math.max(100, Math.min(size.width, size.height, 1000))
    const getBucket: types.GetBucket<Key, Item> = (item, key) => {
      const box = getBoundingBox(item, key)
      return [Math.floor(box.x / bucketSize), Math.floor(box.y / bucketSize)]
    }
    const buckets = precomputedBuckets ?? utils.measure('Buckets', () => this.#calculateBuckets(items, getBucket))

    return { size, bucketSize, buckets }
  }

  #process = (
    prevParameters: Defined<VirtualizableParams<Key, Item>, 'scrollPosition' | 'overscan'>
  ): ProcessingResult<Key> => {
    const { items, getBoundingBox, precomputedCanvasSize, precomputedBucketSize, precomputedBuckets } = this.#parameters
    const prevProcessed = this.#processed

    if (items !== prevParameters.items) {
      // TODO: this is a naive implementation; we should be able to diff the items and update the size accordingly
      const size =
        precomputedCanvasSize ?? utils.measure('Size', () => this.#calculateCanvasSize(items, getBoundingBox))
      const bucketSize = precomputedBucketSize ?? Math.max(100, Math.min(size.width, size.height, 1000))
      const getBucket: types.GetBucket<Key, Item> = (item, key) => {
        const box = getBoundingBox(item, key)
        return [Math.floor(box.x / bucketSize), Math.floor(box.y / bucketSize)]
      }

      // Figure out diff'd items
      const prevItemsSet = new Set(Object.values(prevParameters.items)) as Set<Item>
      const newItemsSet = new Set(Object.values(items)) as Set<Item>
      const { added, removed } = utils.diffSets(prevItemsSet, newItemsSet)

      const buckets =
        precomputedBuckets ??
        utils.measure('Buckets', () => {
          // TODO: is copying necessary?
          const newBuckets = { ...prevProcessed.buckets } as types.Buckets<Key>

          added.forEach((item) => {
            const key = Object.keys(items).find((k) => this.#getItem(items, k as Key) === item) as Key
            const [x, y] = getBucket(item, key)
            const bucketKey = this.#getBucketKey(x, y)

            if (!newBuckets[bucketKey]) {
              newBuckets[bucketKey] = []
            }
            newBuckets[bucketKey].push(key)
          })

          removed.map((item) => {
            const key = Object.keys(prevParameters.items).find(
              (k) => this.#getItem(prevParameters.items as Items, k as Key) === item
            ) as Key
            const [x, y] = getBucket(item, key)
            const bucketKey = this.#getBucketKey(x, y)

            // TODO: naive and should be replaced with a faster operation
            newBuckets[bucketKey] = newBuckets[bucketKey].filter((k) => k !== key)
          })

          return newBuckets
        })

      return { size, bucketSize, buckets }
    }

    const size = precomputedCanvasSize ?? prevProcessed.size
    // TODO: when bucketSize changes, we need to recalculate the buckets
    const bucketSize = precomputedBucketSize ?? prevProcessed.bucketSize
    const buckets = precomputedBuckets ?? prevProcessed.buckets

    return {
      size,
      bucketSize,
      buckets,
    }
  }

  #calculateKeys = (): Set<Key> => {
    const { scrollPosition: scroll, getBoundingBox, viewportSize, items, overscan } = this.#parameters
    const { bucketSize, buckets } = this.#processed

    const bucketMinX = Math.floor((scroll.x - overscan) / bucketSize)
    const bucketMinY = Math.floor((scroll.y - overscan) / bucketSize)
    const bucketMaxX = Math.floor((scroll.x + viewportSize.width + overscan) / bucketSize)
    const bucketMaxY = Math.floor((scroll.y + viewportSize.height + overscan) / bucketSize)

    const visibleKeys: Set<Key> = new Set()

    for (let x = bucketMinX - 1; x <= bucketMaxX + 1; x++) {
      for (let y = bucketMinY - 1; y <= bucketMaxY + 1; y++) {
        // Relevant buckets
        const bucketKey = this.#getBucketKey(x, y)
        const bucket = buckets[bucketKey] ?? []

        for (const key of bucket) {
          const item = this.#getItem(items, key)
          const box = getBoundingBox(item, key)

          if (
            box.x < scroll.x + viewportSize.width + overscan &&
            box.y < scroll.y + viewportSize.height + overscan &&
            box.x + box.width > scroll.x - overscan &&
            box.y + box.height > scroll.y - overscan
          ) {
            visibleKeys.add(key)
          }
        }
      }
    }

    return visibleKeys
  }

  #broadcast = (): void => {
    this.#listeners.forEach((listener) => listener())
  }

  subscribe = (listener: types.Listener): (() => void) => {
    this.#listeners.push(listener)
    return () => this.unsubscribe(listener)
  }

  unsubscribe = (listener: types.Listener): void => {
    this.#listeners.splice(this.#listeners.indexOf(listener), 1)
  }

  getCanvasSize = (): types.Size => {
    return this.#processed.size
  }

  getVisibleKeys = (): Set<Key> => {
    return this.#visibleKeys
  }

  update = (updateArgs: Partial<VirtualizableParams<Key, Item, Items>>): void => {
    const prevParameters = this.#parameters
    const prevProcessed = this.#processed
    const prevVisibleKeys = this.#visibleKeys
    this.#parameters = { ...this.#parameters, ...updateArgs }

    const processedArgs = [
      'items',
      'getBoundingBox',
      'precomputedCanvasSize',
      'precomputedBucketSize',
      'precomputedBuckets',
    ] as const
    if (processedArgs.some((key) => prevParameters[key] !== this.#parameters[key])) {
      // Data for processing has changed, reprocess
      this.#processed = this.#process(prevParameters)
    }

    const visibleKeysArgs = ['scrollPosition', 'getBoundingBox', 'viewportSize', 'items', 'overscan'] as const
    if (
      visibleKeysArgs.some((key) => prevParameters[key] !== this.#parameters[key]) ||
      prevProcessed !== this.#processed
    ) {
      // Data for calculating visible keys has changed, recalculate visible keys
      this.#visibleKeys = this.#calculateKeys()
    }

    // Return if no changes based on reference equality
    if (prevProcessed === this.#processed && prevVisibleKeys === this.#visibleKeys) return

    // Return if no changes based on set equality
    if (
      utils.areSetsEqual(this.#visibleKeys, prevVisibleKeys) &&
      utils.isSizeEqual(this.#processed.size, prevProcessed.size)
    )
      return

    // Emit changes to listeners
    this.#broadcast()
  }
}
