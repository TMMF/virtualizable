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

export const areSetsEqual = <T>(a: Set<T>, b: Set<T>) => {
  if (a.size !== b.size) return false
  return [...a].every((item) => b.has(item))
}

export const areArraysEqual = <T>(a: T[], b: T[]) => {
  if (a.length !== b.length) return false
  return a.every((item, i) => item === b[i])
}

export const areKeysEqual = <Key extends types.KeyBase>(a: Key[], b: Key[]) => {
  return areSetsEqual(new Set(a), new Set(b))
}
