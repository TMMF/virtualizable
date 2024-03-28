export const measure = <Result>(name: string, fn: () => Result): Result => {
  if (process.env.NODE_ENV !== 'development') return fn()

  performance.mark(`${name}-start`)
  const result = fn()
  performance.mark(`${name}-end`)

  const { duration } = performance.measure(`${name}-measure`, { start: `${name}-start`, end: `${name}-end` })
  console.debug(`${name}: ${duration}ms`)

  return result
}
