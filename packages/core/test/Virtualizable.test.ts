import { describe, test, expect } from 'vitest'
import { Virtualizable } from '../src'

const RECORD_ITEMS: Record<string, { x: number; y: number; width: number; height: number }> = {}
const GRID_SIZE = 20
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    const id = `${j}-${i}`
    RECORD_ITEMS[id] = { x: i * 20, y: j * 20, width: 10, height: 10 }
  }
}

const identity = <I>(i: I): I => i

describe('Virtualizable', () => {
  test('Record-Based items', () => {
    const v = new Virtualizable({
      items: RECORD_ITEMS,
      getBoundingBox: identity,
      viewportSize: { width: 50, height: 50 },
      overscan: 0,
    })

    expect(v.getCanvasSize()).toMatchInlineSnapshot(`
      {
        "height": 390,
        "width": 390,
      }
    `)

    expect(v.getRenderedKeys()).toMatchInlineSnapshot(`
      Set {
        "0-0",
        "1-0",
        "2-0",
        "0-1",
        "1-1",
        "2-1",
        "0-2",
        "1-2",
        "2-2",
      }
    `)

    v.updateParams({
      scrollPosition: { x: 340, y: 340 },
    })

    expect(v.getRenderedKeys()).toMatchInlineSnapshot(`
      Set {
        "17-17",
        "18-17",
        "19-17",
        "17-18",
        "18-18",
        "19-18",
        "17-19",
        "18-19",
        "19-19",
      }
    `)

    v.updateParams({
      scrollPosition: { x: 170, y: 170 },
    })

    expect(v.getRenderedKeys()).toMatchInlineSnapshot(`
      Set {
        "9-9",
        "10-9",
        "9-10",
        "10-10",
      }
    `)
  })

  test('Array-Based Items', () => {})

  test('Overscan', () => {})
  test('Precomputed Canvas Size', () => {})
  test('Precomputed Bucket Size', () => {})
  test('Precomputed Buckets', () => {})

  test('Updating ScrollPosition', () => {})
  test('Updating ViewportSize', () => {})
  test('Updating Items', () => {})
})
