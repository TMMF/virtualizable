type Milliseconds = number

export const throttle = <Args extends unknown[]>(fn: (...args: Args) => unknown, wait: Milliseconds) => {
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

export const measurePerformance = <Result>(name: string, fn: () => Result): Result => {
  //if (__DEV__) return fn()

  performance.mark(`${name}-start`)
  const result = fn()
  performance.mark(`${name}-end`)

  // @ts-expect-error - TODO need to fix
  const { duration } = performance.measure(`${name}-measure`, { start: `${name}-start`, end: `${name}-end` })
  performance.clearMarks()
  performance.clearMeasures()

  console.log(`${name} Duration:`, duration)
  return result
}
