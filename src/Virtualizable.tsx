import React, { HTMLAttributes, ReactNode, useMemo } from 'react'
import { throttle } from './utils'

type PositiveNumber = number // [0, ∞)
type Box = {
  x: number
  y: number
  width: PositiveNumber
  height: PositiveNumber
}

type Item = {
  id: string
}

export interface ListProps<I extends Item> extends HTMLAttributes<HTMLDivElement> {
  items: I[]
  getBoundingBox: (item: I) => Box
  renderItem: (item: I) => ReactNode
}

export const Virtualizable = <I extends Item>(props: ListProps<I>): JSX.Element => {
  const { items, getBoundingBox, renderItem, className, style } = props

  const [domRef, setDomRef] = React.useState<HTMLDivElement | null>(null)
  const [scroll, setScroll] = React.useState({ x: 0, y: 0 })
  const handleScroll = useMemo(
    () =>
      throttle((event: React.UIEvent<HTMLDivElement>) => {
        // @ts-expect-error - TODO need to fix
        setScroll({ x: event.target.scrollLeft, y: event.target.scrollTop })
      }, 100),
    []
  )

  const { width, height } = items.reduce(
    (acc, item) => {
      const box = getBoundingBox(item)
      return {
        width: Math.max(acc.width, box.x + box.width),
        height: Math.max(acc.height, box.y + box.height),
      }
    },
    { width: 0, height: 0 }
  )

  const visibleItems = items.filter((item) => {
    const box = getBoundingBox(item)
    const containerBox = domRef?.getBoundingClientRect() ?? { width: 0, height: 0 }

    return (
      box.x < scroll.x + containerBox.width &&
      box.y < scroll.y + containerBox.height &&
      box.x + box.width > scroll.x &&
      box.y + box.height > scroll.y
    )
  })

  console.log(
    '# Visible Items:',
    visibleItems.length,
    '| Item IDs:',
    visibleItems.map((item) => item.id)
  )

  return (
    <div
      ref={setDomRef}
      className={className}
      onScroll={handleScroll}
      style={{ overflow: 'auto', border: '1px solid blue', ...style }}
    >
      <div style={{ width, height, position: 'relative' }}>{visibleItems.map(renderItem)}</div>
    </div>
  )
}
