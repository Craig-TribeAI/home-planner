import { useState, useCallback } from 'react'

// Tracks which section's lightbox is open and the active index within it.
// Each section passes a stable `key` so arrow-nav stays scoped to that section.
export function useLightbox() {
  const [state, setState] = useState(null) // { key, images, index } | null
  const open = useCallback((key, images, index) => setState({ key, images, index }), [])
  const close = useCallback(() => setState(null), [])
  const setIndex = useCallback((index) => setState((s) => (s ? { ...s, index } : s)), [])
  return { state, open, close, setIndex }
}
