interface UnsafeHtmlDivElement {
  (element: NonNullable<unknown>): HTMLDivElement
  (element: unknown): HTMLDivElement | null
}

export const unsafeHtmlDivElementTypeCoercion: UnsafeHtmlDivElement = (element) => element as HTMLDivElement
