export type Milliseconds = number
export type PositiveNumber = number // [0, ∞)

export type Position = { x: PositiveNumber; y: PositiveNumber }
export type Size = { width: PositiveNumber; height: PositiveNumber }
export type Box = Position & Size
export type Listener = () => unknown

export type ItemBase = unknown
export type KeyBase = string | number
export type Collection<Key extends KeyBase, Item extends ItemBase> = Record<Key, Item> | Item[]
export type BucketKey = `${number}-${number}`
export type Buckets<Key extends KeyBase> = Record<BucketKey, Key[]>

export type GetBoundingBox<Key extends KeyBase, Item extends ItemBase> = (item: Item, key: Key) => Box
export type GetBucket<Key extends KeyBase, Item extends ItemBase> = (item: Item, key: Key) => readonly [number, number]
