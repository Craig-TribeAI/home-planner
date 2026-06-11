import { IconExternalLink, IconSparkles } from '@tabler/icons-react'
import { assetUrl } from '../assetUrl.js'

// Masonry (CSS columns) layout of Pinterest pins. Each pin links to its source pin in a new tab;
// clicking the image opens the lightbox. The link chip sits in a corner so the image stays clickable.
export default function PinGrid({ pins, onOpen }) {
  if (pins.length === 0) {
    return (
      <p className="empty-hint">
        <IconSparkles size={15} /> No pins yet — fill in boards.json and run{' '}
        <code>npm run sync-pins</code>, or drop images into this room's <code>pins/</code> folder.
      </p>
    )
  }
  return (
    <div className="pin-grid">
      {pins.map((pin, i) => (
        <div className="pin" key={pin.url}>
          <button className="pin-img" onClick={() => onOpen(i)} title={pin.title}>
            <img src={assetUrl(pin.url)} alt={pin.title} loading="lazy" />
          </button>
          {pin.source && (
            <a
              className="pin-link"
              href={pin.source}
              target="_blank"
              rel="noreferrer"
              title={`Open on Pinterest: ${pin.title}`}
            >
              <IconExternalLink size={13} />
              {pin.title && <span>{pin.title}</span>}
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
