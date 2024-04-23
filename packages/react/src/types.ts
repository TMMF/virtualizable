import * as React from 'react'
export type * from '@virtualizable/core'
import type { KeyBase, ItemBase } from '@virtualizable/core'

export type AlignmentVerticalNormalized = 'top' | 'bottom' | 'center' | 'ignore'
export type AlignmentHorizontalNormalized = 'left' | 'right' | 'center' | 'ignore'
export type AlignmentNormalized = `${AlignmentVerticalNormalized}-${AlignmentHorizontalNormalized}`

export type AlignmentVertical = AlignmentVerticalNormalized | 'auto'
export type AlignmentHorizontal = AlignmentHorizontalNormalized | 'auto'
export type AlignmentShorthand = 'auto' | 'center'
export type AlignmentExtended = `${AlignmentVertical}-${AlignmentHorizontal}`
export type Alignment = AlignmentShorthand | AlignmentExtended

export type ScrollToItemOptions = { alignment?: Alignment; behavior?: ScrollBehavior; padding?: number }

export type RenderItem<Key extends KeyBase, Item extends ItemBase> = (item: Item, key: Key) => React.ReactNode

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
