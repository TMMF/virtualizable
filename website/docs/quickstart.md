---
sidebar_position: 1
---

# Quickstart

If you're getting started with Virtualizable, then you're in the right place! Let's get you going as quickly as possible and from there you can learn more about Virtualizable concepts and how to use them effectively to solve your problems.

:::info[Playground]

Don't want to jump right into integrating Virtualizable into your codebase? Feel free to try it out with the playground and see if looks like it would work for you first!

[Go to Playground →](#)

:::

## Installation

```bash
npm install @virtualizable/react
```

Then within your application, you can import the `Virtualizable` component and use that to virtualize what you need:

```tsx
import { Virtualizable } from '@virtualizable/react'

// ...

const Item = ({ item }) => {
  return <p>Idx: {item}</p>
}

const Container = () => {
  const items = useMemo(() => [1, 2, 3], [])

  const getBoundingBox = useCallback((item: number, idx: number) => {
    return { x: 0, y: idx * 10, width: 10, height: 10 }
  }, [])

  const renderItem = useCallback((item: number, idx: number) => {
    return <Item item={item} />
  }, [])

  return <Virtualizable items={items} getBoundingBox={getBoundingBox} renderItem={renderItem} />
}
```

Let's break this down to understand what's going on! To start, `Virtualizable` takes three required arguments: `items`, `getBoundingBox` and `renderItem`.

- `items` is a collection of the items that will be virtualized. This can be any object/array. Virtualizable will reference the key of the object (index of the array) for handling
  :::danger
  Use basic objects for Virtualizable. Hidden/template fields on an object passed in may inadvertently be referenced and cause problems.
  :::
- `getBoundingBox` is a function that returns the bounding box for an item. It receives both the item and its key (or index for arrays) and needs to return the position and size of the item. This allows the underlying virtualization system to know when to show/hide individual items.
- `renderItem` is a function that renders a given item. It receives both the item and its key (or index for arrays) and returns that item rendered out.

The example above defines all three props within the `Container` component, but you could just as easily define them outside of the component to avoid the use of `useMemo` and `useCallback`.

:::tip
It is recommended to use `useMemo` and `useCallback` when your items/functions rely on data within the component. This avoids changing references which can break reference equality checks and degrade performance.
:::

And it's as simple as that! You have a working virtualized container that you can use to improve your application performance. Check out the [examples](#) to get inspiration for different components that can benefit from virtualization.
