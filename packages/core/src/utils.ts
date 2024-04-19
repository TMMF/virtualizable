import * as types from './types'

export const areSetsEqual = <T>(a: Set<T>, b: Set<T>) => {
  if (a.size !== b.size) return false
  return [...a].every((item) => b.has(item))
}

export const diffSets = <T>(prev: Set<T>, next: Set<T>) => {
  const added: T[] = []
  const removed: T[] = []

  next.forEach((item) => (!prev.has(item) ? added.push(item) : null))
  prev.forEach((item) => (!next.has(item) ? removed.push(item) : null))

  return { added, removed }
}

export const isSizeEqual = (a: types.Size, b: types.Size) => a.width === b.width && a.height === b.height

export const measure = <Result>(name: string, fn: () => Result): Result => {
  if (process.env.NODE_ENV !== 'development') return fn()

  performance.mark(`${name}-start`)
  const result = fn()
  performance.mark(`${name}-end`)

  const { duration } = performance.measure(`${name}-measure`, { start: `${name}-start`, end: `${name}-end` })
  console.debug(`${name}: ${duration}ms`)

  return result
}
