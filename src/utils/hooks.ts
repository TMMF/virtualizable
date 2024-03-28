import * as React from 'react'

export const useMountEffect = (fn: () => void) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(fn, [])
}
