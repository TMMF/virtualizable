import * as types from '../types'

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

export const debounce = <Args extends unknown[]>(fn: (...args: Args) => unknown, wait: types.Milliseconds) => {
  let timeout: ReturnType<typeof setTimeout> | undefined = undefined

  return (...args: Args): void => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), wait)
  }
}

export const getItem = <Key extends types.KeyBase, Item extends types.ItemBase>(
  items: types.Collection<Key, Item>,
  key: Key
  // @ts-expect-error - TS doesn't think Key is a key of items
) => items[key]
