import * as React from 'react'

export type Milliseconds = number
export type PositiveNumber = number // [0, ∞)

export type Position = { x: PositiveNumber; y: PositiveNumber }
export type Size = { width: PositiveNumber; height: PositiveNumber }
export type Box = Position & Size

export type ItemBase = unknown
export type KeyBase = string | number
export type Collection<Key extends KeyBase, Item extends ItemBase> = Record<Key, Item>
export type BucketKey = `${number}-${number}`
export type Buckets<Key extends KeyBase> = Record<BucketKey, Key[]>

export type RenderItem<Key extends KeyBase, Item extends ItemBase> = (item: Item, key: Key) => React.ReactNode
export type GetBoundingBox<Key extends KeyBase, Item extends ItemBase> = (item: Item, key: Key) => Box
export type GetBucket<Key extends KeyBase, Item extends ItemBase> = (item: Item, key: Key) => readonly [number, number]

export type GetElementType<K extends keyof JSX.IntrinsicElements> =
  JSX.IntrinsicElements[K] extends React.DetailedHTMLProps<React.HTMLAttributes<unknown>, infer El> ? El : never

export type SupportedElements = {
  [K in keyof JSX.IntrinsicElements]: GetElementType<K>
}
export type SupportedElementKeys = keyof SupportedElements

export type InnerComponentProps<K extends keyof JSX.IntrinsicElements> = {
  ref?: React.LegacyRef<GetElementType<K>>
  style?: React.CSSProperties | undefined
  children?: React.ReactNode
}

export type AsProps<
  Key extends SupportedElementKeys,
  ComponentProps extends InnerComponentProps<Key> = InnerComponentProps<Key>
> =
  | (Omit<JSX.IntrinsicElements['div'], 'ref'> & { as?: 'div' })
  | (Omit<JSX.IntrinsicElements[Key], 'ref'> & { as: Key })
  | (ComponentProps & { as: React.ComponentType<ComponentProps> })
