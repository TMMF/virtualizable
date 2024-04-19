import * as React from 'react'
import * as types from '../types'
import { Virtualizable } from '@virtualizable/core'
import { unsafeHtmlDivElementTypeCoercion } from './coercion'
import { throttle } from './generic'

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
  ElKey extends types.SupportedElementKeys,
  Element extends types.SupportedElements[ElKey]
> = {
  domRef: React.Ref<Element>
  size: types.Size
  visibleKeys: Key[]
  onScroll: React.UIEventHandler<Element>
}

export const useVirtualizable = <
  Key extends types.KeyBase,
  Item extends types.ItemBase,
  ElKey extends types.SupportedElementKeys,
  Element extends types.SupportedElements[ElKey]
>(
  args: UseVirtualizableArgs<Key, Item>
): UseVirtualizableResult<Key, ElKey, Element> => {
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
      v.update({
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
      v.update({
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
          v.update({ viewportSize: unsafeHtmlDivElementTypeCoercion(e.target)?.getBoundingClientRect() })
        )
      }

      const _el = unsafeHtmlDivElementTypeCoercion(el)
      _el.addEventListener('resize', cb)
      return _el.removeEventListener('resize', cb)
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      React.startTransition(() => v.update({ viewportSize: entry.contentRect }))
    })

    if (el) resizeObserver.observe(el as Element)
    return () => resizeObserver.disconnect()
  }, [v])

  const onScroll = React.useMemo(
    () =>
      throttle((event: React.UIEvent<Element>) => {
        const target = unsafeHtmlDivElementTypeCoercion(event.target)
        const scrollPosition = { x: target.scrollLeft, y: target.scrollTop }
        React.startTransition(() => v.update({ scrollPosition }))
      }, scrollThrottle),
    [scrollThrottle, v]
  )

  const canvasSize = React.useSyncExternalStore(v.subscribe, v.getCanvasSize)
  const visibleKeys = React.useSyncExternalStore(v.subscribe, v.getVisibleKeys)

  return React.useMemo(
    () => ({
      domRef,
      size: canvasSize,
      visibleKeys: Array.from(visibleKeys),
      onScroll,
    }),
    [canvasSize, onScroll, visibleKeys]
  )
}
