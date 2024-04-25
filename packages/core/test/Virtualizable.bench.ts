import { describe, bench } from 'vitest'
import { Virtualizable } from '../src'

type Key = string
type Item = { x: number; y: number; width: number; height: number }

const SMALL_DATASET: Record<Key, Item> = {}
const SMALL_GRID_SIZE = 10
for (let i = 0; i < SMALL_GRID_SIZE; i++) {
  for (let j = 0; j < SMALL_GRID_SIZE; j++) {
    const id = `${j}-${i}`
    SMALL_DATASET[id] = { x: i * 20, y: j * 20, width: 10, height: 10 }
  }
}

const MEDIUM_DATASET: Record<Key, Item> = {}
const MEDIUM_GRID_SIZE = 100
for (let i = 0; i < MEDIUM_GRID_SIZE; i++) {
  for (let j = 0; j < MEDIUM_GRID_SIZE; j++) {
    const id = `${j}-${i}`
    MEDIUM_DATASET[id] = { x: i * 20, y: j * 20, width: 10, height: 10 }
  }
}

const LARGE_DATASET: Record<Key, Item> = {}
const LARGE_GRID_SIZE = 1000
for (let i = 0; i < LARGE_GRID_SIZE; i++) {
  for (let j = 0; j < LARGE_GRID_SIZE; j++) {
    const id = `${j}-${i}`
    LARGE_DATASET[id] = { x: i * 20, y: j * 20, width: 10, height: 10 }
  }
}

const identity = <I>(i: I): I => i

let smallV: Virtualizable<Key, Item, Record<Key, Item>>
let mediumV: Virtualizable<Key, Item, Record<Key, Item>>
let largeV: Virtualizable<Key, Item, Record<Key, Item>>

describe('Initialization', () => {
  bench('100 Items', () => {
    smallV = new Virtualizable({
      items: SMALL_DATASET,
      getBoundingBox: identity,
      viewportSize: { width: 50, height: 50 },
    })
  })

  bench('10K Items', () => {
    mediumV = new Virtualizable({
      items: MEDIUM_DATASET,
      getBoundingBox: identity,
      viewportSize: { width: 50, height: 50 },
    })
  })

  bench.skip('1M Items', () => {
    largeV = new Virtualizable({
      items: LARGE_DATASET,
      getBoundingBox: identity,
      viewportSize: { width: 50, height: 50 },
    })
  })
})

describe('ScrollPosition Update', () => {
  bench('100 Items', () => {
    smallV.updateParams({ scrollPosition: { x: 100, y: 100 } })
  })

  bench('10K Items', () => {
    mediumV.updateParams({ scrollPosition: { x: 100, y: 100 } })
  })

  bench.skip('1M Items', () => {
    largeV.updateParams({ scrollPosition: { x: 100, y: 100 } })
  })
})

describe('ViewportSize Update', () => {
  bench('100 Items', () => {
    smallV.updateParams({ viewportSize: { width: 100, height: 100 } })
  })

  bench('10K Items', () => {
    mediumV.updateParams({ viewportSize: { width: 100, height: 100 } })
  })

  bench.skip('1M Items', () => {
    largeV.updateParams({ viewportSize: { width: 100, height: 100 } })
  })
})

describe('Items Update', () => {
  const newItem = { x: 5, y: 5, width: 5, height: 5 }

  bench('100 Items', () => {
    smallV.updateParams({ items: { ...SMALL_DATASET, newItem } })
  })

  bench('10K Items', () => {
    mediumV.updateParams({ items: { ...MEDIUM_DATASET, newItem } })
  })

  bench.skip('1M Items', () => {
    largeV.updateParams({ items: { ...LARGE_DATASET, newItem } })
  })
})
