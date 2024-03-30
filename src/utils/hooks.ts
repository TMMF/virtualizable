import * as React from 'react'
import * as types from '../types'
import { measure } from './perf'
import { process, calculateVisibleKeys } from './virtualization'
import { unsafeHtmlDivElementTypeCoercion } from './coercion'
import { throttle, areKeysEqual } from './generic'

export const useMountEffect = (fn: () => void): void => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(fn, [])
}

/**
 * Better to use this than a useEffect since this will execute within the same render cycle instead of causing
 * a second render back-to-back. By default, it won't execute on the first render since nothing has 'changed'.
 */
export const useOnDepChange = (
  fn: () => void,
  deps: React.DependencyList,
  options?: { executeFirstRender?: boolean }
): void => {
  const { executeFirstRender = false } = options ?? {}
  const prevDeps = React.useRef(executeFirstRender ? undefined : deps)

  if (deps.some((dep, i) => dep !== prevDeps.current?.[i])) {
    prevDeps.current = deps
    fn()
  }
}

/* export const useMergeRefs = <T>(...refs: React.Ref<T>[]): React.RefCallback<T> => {
  return React.useCallback((value) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value)
      } else if (ref) {
        ref.current = value
      }
    })
  }, refs)
} */

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

/* export const useMemoOnce = <Res>(fn: () => Res): Res => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useMemo(fn, [])
}

// Sets state based on an initial value, but also updates the state if the value changes (useful for prop -> state)
export const usePropState = <T>(value: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const prevValueRef = React.useRef(value)
  const result = React.useState(value)
  const [, setState] = result

  if (prevValueRef.current !== value) {
    prevValueRef.current = value
    setState(value)
  }

  return result
}

export const useSyncRef = <T>(value: T): React.MutableRefObject<T> => {
  const ref = React.useRef(value)
  ref.current = value
  return ref
} */

const DEFAULT_POSITION = { x: 0, y: 0 }
const EMPTY_SIZE = { width: 0, height: 0 }

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

  const id = React.useId()
  const domRef = React.useRef<Element>(null)
  const lastScrollCoords = React.useRef<types.Position>(DEFAULT_POSITION)
  const [visibleKeys, setVisibleKeys] = React.useState<Key[]>([])

  const { size, bucketSize, buckets } = React.useMemo(
    () =>
      measure('Processing', () =>
        process<Key, Item>({
          id,
          items,
          getBoundingBox,
          precomputedCanvasSize,
          precomputedBucketSize,
          precomputedBuckets,
        })
      ),
    // We don't care about the fns changing
    [id, items, precomputedBucketSize, precomputedBuckets, precomputedCanvasSize]
  )

  useOnDepChange(() => {
    const newVisibleKeys = measure('Calculating Visible Keys', () =>
      calculateVisibleKeys({
        scroll: lastScrollCoords.current,
        bucketSize,
        buckets,
        getBoundingBox,
        viewportSize: unsafeHtmlDivElementTypeCoercion(domRef.current)?.getBoundingClientRect() ?? EMPTY_SIZE,
        items,
        overscan,
      })
    )

    setVisibleKeys((prevVisibleKeys) =>
      // Prevents unnecessary re-renders
      areKeysEqual(prevVisibleKeys, newVisibleKeys) ? prevVisibleKeys : newVisibleKeys
    )
    // We don't care about the fns changing
  }, [bucketSize, buckets, items, overscan])

  const cvk = React.useCallback(
    (scroll: types.Position) =>
      measure('Calculating Visible Keys', () =>
        calculateVisibleKeys({
          scroll,
          bucketSize,
          buckets,
          getBoundingBox,
          viewportSize: unsafeHtmlDivElementTypeCoercion(domRef.current)?.getBoundingClientRect() ?? EMPTY_SIZE,
          items,
          overscan,
        })
      ),
    [bucketSize, buckets, getBoundingBox, items, overscan]
  )

  // Need to useMountEffect to set initial visible keys since it needs domRef.current to be set first
  useMountEffect(() => setVisibleKeys(cvk(lastScrollCoords.current)))

  const onScroll = React.useMemo(
    () =>
      throttle((event: React.UIEvent<Element>) => {
        const target = unsafeHtmlDivElementTypeCoercion(event.target)
        lastScrollCoords.current = { x: target.scrollLeft, y: target.scrollTop }
        const newVisibleKeys = cvk(lastScrollCoords.current)

        setVisibleKeys((prevVisibleKeys) =>
          // Prevents unnecessary re-renders
          areKeysEqual(prevVisibleKeys, newVisibleKeys) ? prevVisibleKeys : newVisibleKeys
        )
      }, scrollThrottle),
    [cvk, scrollThrottle]
  )

  React.useEffect(() => {
    const el = domRef.current
    if (!el) return

    if (!window.ResizeObserver) {
      const _el = unsafeHtmlDivElementTypeCoercion(el)
      const cb = (e: UIEvent) => onScroll(e as unknown as React.UIEvent<Element>)
      _el.addEventListener('resize', cb)
      return _el.removeEventListener('resize', cb)
    }

    const { x, y } = lastScrollCoords.current
    const resizeObserver = new ResizeObserver(() =>
      onScroll({ target: { scrollLeft: x, scrollTop: y } } as unknown as React.UIEvent<Element>)
    )

    if (el) resizeObserver.observe(el as Element)
    return () => resizeObserver.disconnect()
  }, [onScroll])

  return {
    domRef,
    size,
    visibleKeys,
    onScroll,
  }
}
