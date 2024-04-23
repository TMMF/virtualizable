import * as React from 'react'
import { ItemContext } from '../contexts'
import * as types from '../types'

export type ItemProps = {
  onVisible?: (visible: boolean) => void
}

export type ItemRef<
  ElKey extends types.SupportedElementKeys = types.SupportedElementKeys,
  Element extends types.SupportedElements[ElKey] = types.SupportedElements[ElKey]
> = {
  getInnerRef: () => React.Ref<Element> | undefined
  getBoundingBox: () => types.Box
}

export const Item = <ElKey extends types.SupportedElementKeys, Element extends types.SupportedElements[ElKey]>(
  props: types.AsProps<ElKey> & ItemProps,
  ref: React.Ref<ItemRef<ElKey, Element>>
) => {
  const { as: _as = 'div', onVisible, style, children, ...rest } = props
  const Component = _as as unknown as React.ComponentType<types.InnerComponentProps<ElKey>>

  const { box } = React.useContext(ItemContext)
  const domRef = React.useRef<Element>(null)

  React.useEffect(() => {
    const el = domRef.current
    if (!el || !onVisible) return
    if (!window.IntersectionObserver) return // TODO: polyfill (?)

    const intersectionObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        onVisible(true)
      } else {
        onVisible(false)
      }
    })

    if (el) intersectionObserver.observe(el as Element)
    return () => intersectionObserver.disconnect()
  }, [onVisible])

  React.useImperativeHandle(
    ref,
    (): ItemRef<ElKey, Element> => ({
      getInnerRef: () => domRef,
      getBoundingBox: () => box,
    }),
    [box]
  )

  return (
    <Component
      {...rest}
      ref={domRef}
      style={{
        position: 'absolute',
        translate: `${box.x}px ${box.y}px`,
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
