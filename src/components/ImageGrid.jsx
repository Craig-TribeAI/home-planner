import { IconPhotoOff } from '@tabler/icons-react'
import { assetUrl } from '../assetUrl.js'

// A flat responsive grid of clickable thumbnails. Used for Original and Mockups sections.
// `cols` controls column count; clicking a tile opens the lightbox at that index.
export default function ImageGrid({ images, onOpen, cols = 4, emptyHint }) {
  if (images.length === 0) {
    return (
      <p className="empty-hint">
        <IconPhotoOff size={15} /> {emptyHint}
      </p>
    )
  }
  return (
    <div className="img-grid" style={{ '--cols': cols }}>
      {images.map((img, i) => (
        <button
          key={img.url}
          className="tile"
          onClick={() => onOpen(i)}
          title={img.name}
        >
          <img src={assetUrl(img.url)} alt={img.name} loading="lazy" />
        </button>
      ))}
    </div>
  )
}
