import * as React from 'react'

export const useMountEffect = (fn: () => void): void => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(fn, [])
}

export const useMemoOnce = <Res>(fn: () => Res): Res => {
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
}
