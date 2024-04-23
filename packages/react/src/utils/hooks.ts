import * as React from 'react'
import * as types from '../types'
import { Virtualizable } from '@virtualizable/core'
import { unsafeHtmlDivElementTypeCoercion } from './coercion'
import { getItem, throttle } from './generic'

const DEFAULT_VIEWPORT_SIZE = { width: 0, height: 0 }

export const useMountEffect = (fn: () => void): void => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(fn, [])
}

type Fn<Args extends unknown[], Res> = (...args: Args) => Res
export const useMergeFns = <
  Args extends unknown[],
  Fns extends (Fn<Args, unknown> | null | undefined)[] = (Fn<Args, unknown> | null | undefined)[]
>(
  ...fns: Fns
): Fn<Args, void> => {
  return React.useCallback((...args) => {
    fns.forEach((fn) => fn?.(...args))
  }, fns)
}

export type UseVirtualizableArgs<Key extends types.KeyBase, Item extends types.ItemBase> = {
  // --- Required Args ---
  items: types.Collection<Key, Item>
  getBoundingBox: types.GetBoundingBox<Key, Item>
  // --- Performance Optimizations ---
  overscan?: types.PositiveNumber
  scrollThrottle?: types.Milliseconds
  precomputedCanvasSize?: types.Size
  precomputedBucketSize?: types.PositiveNumber
  precomputedBuckets?: types.Buckets<Key>
}

export type UseVirtualizableResult<
  Key extends types.KeyBase,
  Item extends types.ItemBase,
  ElKey extends types.SupportedElementKeys,
  Element extends types.SupportedElements[ElKey]
> = {
  domRef: React.RefObject<Element>
  size: types.Size
  renderedKeys: Key[]
  renderedItems: Item[]
  renderedEntries: [Key, Item][]
  onScroll: React.UIEventHandler<Element>
  scrollTo: (x: number, y: number) => void
  scrollToItem: (key: Key, options?: types.ScrollToItemOptions) => void
  recompute: () => void
}

export const useVirtualizable = <
  Key extends types.KeyBase,
  Item extends types.ItemBase,
  ElKey extends types.SupportedElementKeys,
  Element extends types.SupportedElements[ElKey]
>(
  args: UseVirtualizableArgs<Key, Item>
): UseVirtualizableResult<Key, Item, ElKey, Element> => {
  const {
    items,
    getBoundingBox,
    precomputedBuckets,
    precomputedBucketSize,
    precomputedCanvasSize,
    overscan = 100,
    scrollThrottle = 50,
  } = args

  const domRef = React.useRef<Element>(null)

  const v = React.useMemo(
    () =>
      new Virtualizable<Key, Item>({
        items,
        getBoundingBox,
        viewportSize: DEFAULT_VIEWPORT_SIZE,
        precomputedCanvasSize,
        precomputedBucketSize,
        precomputedBuckets,
        overscan,
      }),
    // Ignoring since this is just to initialize within React's context
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  React.useEffect(() => {
    React.startTransition(() =>
      v.updateParams({
        items,
        precomputedBucketSize,
        precomputedBuckets,
        precomputedCanvasSize,
        overscan,
      })
    )
  }, [items, precomputedBucketSize, precomputedBuckets, precomputedCanvasSize, overscan, v])

  useMountEffect(() => {
    React.startTransition(() =>
      v.updateParams({
        viewportSize:
          unsafeHtmlDivElementTypeCoercion(domRef.current)?.getBoundingClientRect() ?? DEFAULT_VIEWPORT_SIZE,
      })
    )
  })

  React.useEffect(() => {
    const el = domRef.current
    if (!el) return

    if (!window.ResizeObserver) {
      const cb = (e: UIEvent) => {
        if (!e.target) return
        React.startTransition(() =>
          v.updateParams({ viewportSize: unsafeHtmlDivElementTypeCoercion(e.target)?.getBoundingClientRect() })
        )
      }

      const _el = unsafeHtmlDivElementTypeCoercion(el)
      _el.addEventListener('resize', cb)
      return _el.removeEventListener('resize', cb)
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      React.startTransition(() => v.updateParams({ viewportSize: entry.contentRect }))
    })

    if (el) resizeObserver.observe(el as Element)
    return () => resizeObserver.disconnect()
  }, [v])

  const onScroll = React.useMemo(
    () =>
      throttle((event: React.UIEvent<Element>) => {
        const target = unsafeHtmlDivElementTypeCoercion(event.target)
        const scrollPosition = { x: target.scrollLeft, y: target.scrollTop }
        React.startTransition(() => v.updateParams({ scrollPosition }))
      }, scrollThrottle),
    [scrollThrottle, v]
  )

  const canvasSize = React.useSyncExternalStore(v.subscribe, v.getCanvasSize)
  const renderedKeys = React.useSyncExternalStore(v.subscribe, v.getRenderedKeys)

  const scrollTo = React.useCallback((x: number, y: number) => {
    const element = unsafeHtmlDivElementTypeCoercion(domRef.current)
    if (!element) return

    element.scrollTo(x, y)
  }, [])

  const scrollToItem = React.useCallback(
    (key: Key, options: types.ScrollToItemOptions = {}) => {
      const element = unsafeHtmlDivElementTypeCoercion(domRef.current)
      if (!element) return

      const { alignment = 'auto', behavior = 'auto', padding = 0 } = options
      const item = getItem(items, key)
      const boundingBox = getBoundingBox(item, key)
      const viewportSize = element.getBoundingClientRect()
      const scrollPos = { x: element.scrollLeft, y: element.scrollTop }

      const topPos = boundingBox.y - padding
      const bottomPos = boundingBox.y + boundingBox.height + padding - viewportSize.height
      const leftPos = boundingBox.x - padding
      const rightPos = boundingBox.x + boundingBox.width + padding - viewportSize.width
      const vertCenterPos = boundingBox.y + boundingBox.height / 2 - viewportSize.height / 2
      const horzCenterPos = boundingBox.x + boundingBox.width / 2 - viewportSize.width / 2

      const normalizeAlignment = (): types.AlignmentNormalized => {
        let _alignment = alignment
        if (alignment.indexOf('-') < 0) {
          const shorthand = alignment as types.AlignmentShorthand
          _alignment = `${shorthand}-${shorthand}` as types.AlignmentExtended
        }

        let [vAlign, hAlign] = _alignment.split('-') as [types.AlignmentVertical, types.AlignmentHorizontal]

        if (vAlign === 'auto') {
          if (boundingBox.y < scrollPos.y) {
            vAlign = 'top'
          } else if (boundingBox.y + boundingBox.height > scrollPos.y + viewportSize.height) {
            vAlign = 'bottom'
          } else {
            vAlign = 'ignore'
          }
        }

        if (hAlign === 'auto') {
          if (boundingBox.x < scrollPos.x) {
            hAlign = 'left'
          } else if (boundingBox.x + boundingBox.width > scrollPos.x + viewportSize.width) {
            hAlign = 'right'
          } else {
            hAlign = 'ignore'
          }
        }

        return `${vAlign}-${hAlign}`
      }

      const normalizedAlignment = normalizeAlignment()

      const getPosition = (): { top?: number; left?: number } => {
        switch (normalizedAlignment) {
          case 'top-left':
            return { top: topPos, left: leftPos }
          case 'top-right':
            return { top: topPos, left: rightPos }
          case 'top-center':
            return { top: topPos, left: horzCenterPos }
          case 'top-ignore':
            return { top: topPos }
          case 'bottom-left':
            return { top: bottomPos, left: leftPos }
          case 'bottom-right':
            return { top: bottomPos, left: rightPos }
          case 'bottom-center':
            return { top: bottomPos, left: horzCenterPos }
          case 'bottom-ignore':
            return { top: bottomPos }
          case 'center-left':
            return { top: vertCenterPos, left: leftPos }
          case 'center-right':
            return { top: vertCenterPos, left: rightPos }
          case 'center-center':
            return { top: vertCenterPos, left: horzCenterPos }
          case 'center-ignore':
            return { top: vertCenterPos }
          case 'ignore-left':
            return { left: leftPos }
          case 'ignore-right':
            return { left: rightPos }
          case 'ignore-center':
            return { left: horzCenterPos }
          case 'ignore-ignore':
            return {}
        }
      }

      const position = getPosition()
      element.scrollTo({ ...position, behavior })
    },
    [getBoundingBox, items]
  )

  return React.useMemo(() => {
    const renderedKeysArr = Array.from(renderedKeys)

    return {
      domRef,
      size: canvasSize,
      renderedKeys: renderedKeysArr,
      renderedItems: renderedKeysArr.map((key) => getItem(items, key)),
      renderedEntries: renderedKeysArr.map((key) => [key, getItem(items, key)]),
      onScroll,
      scrollTo,
      scrollToItem,
      recompute: v.recompute,
    }
  }, [canvasSize, items, onScroll, renderedKeys, scrollTo, scrollToItem, v.recompute])
}
