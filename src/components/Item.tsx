import * as React from 'react'
import { ItemContext } from '../contexts'
import * as types from '../types'

export type ItemRef<ElKey extends types.SupportedElementKeys, Element extends types.SupportedElements[ElKey]> = {
  getInnerRef: () => React.Ref<Element>
}

export const Item = <ElKey extends types.SupportedElementKeys, Element extends types.SupportedElements[ElKey]>(
  props: types.AsProps<ElKey>,
  ref: React.Ref<ItemRef<ElKey, Element>>
) => {
  const { as: _as = 'div', style, children, ...rest } = props
  const Component = _as as unknown as React.ComponentType<types.InnerComponentProps<ElKey>>

  const { box } = React.useContext(ItemContext)

  const domRef = React.useRef<Element>(null)
  React.useImperativeHandle(
    ref,
    () => ({
      getInnerRef: () => domRef,
    }),
    []
  )

  return (
    <Component
      {...rest}
      ref={domRef}
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        ...style,
      }}
    >
      {children}
    </Component>
  )
}

export default React.memo(React.forwardRef(Item))
