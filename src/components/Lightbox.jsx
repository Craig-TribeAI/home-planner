import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { IconX, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { assetUrl } from '../assetUrl.js'

// Full-screen lightbox scoped to ONE section's ordered image list.
// Arrow keys move within this section only (wrap-around); ESC closes; body scroll locked.
// `images` is an array of { url, name|title }. `index`/`onIndex` are controlled by the parent.
export default function Lightbox({ images, index, onIndex, onClose }) {
  const count = images.length

  const go = useCallback(
    (delta) => {
      onIndex((index + delta + count) % count)
    },
    [index, count, onIndex],
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [go, onClose])

  if (count === 0) return null
  const current = images[index]

  return createPortal(
    <div className="lb" onClick={onClose}>
      <button className="lb-close" aria-label="Close" onClick={onClose}>
        <IconX size={22} />
      </button>
      {count > 1 && (
        <button
          className="lb-nav lb-prev"
          aria-label="Previous"
          onClick={(e) => {
            e.stopPropagation()
            go(-1)
          }}
        >
          <IconChevronLeft size={28} />
        </button>
      )}
      <figure className="lb-figure" onClick={(e) => e.stopPropagation()}>
        <img src={assetUrl(current.url)} alt={current.title || current.name || ''} />
        <figcaption>
          {current.title || current.name}
          {count > 1 && (
            <span className="lb-count">
              {index + 1} / {count}
            </span>
          )}
        </figcaption>
      </figure>
      {count > 1 && (
        <button
          className="lb-nav lb-next"
          aria-label="Next"
          onClick={(e) => {
            e.stopPropagation()
            go(1)
          }}
        >
          <IconChevronRight size={28} />
        </button>
      )}
    </div>,
    document.body,
  )
}
