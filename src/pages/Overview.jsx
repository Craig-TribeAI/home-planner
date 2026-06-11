import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconHome, IconChevronDown, IconChevronUp, IconPhoto } from '@tabler/icons-react'
import { useManifest } from '../useManifest.js'
import { useLightbox } from '../useLightbox.js'
import Markdown from '../components/Markdown.jsx'
import Lightbox from '../components/Lightbox.jsx'
import RoomIcon from '../components/RoomIcon.jsx'
import { assetUrl } from '../assetUrl.js'

export default function Overview() {
  const { house, rooms } = useManifest()
  const lb = useLightbox()
  const [briefOpen, setBriefOpen] = useState(false)

  const photos = house.photos
  // First line of the brief doubles as the collapsed teaser.
  const teaser = (house.brief || '').trim().split('\n').find((l) => l.trim()) || ''

  return (
    <div className="page">
      <div className="panel">
        <header className="panel-head">
          <span className="title">
            <IconHome size={18} /> Wissahickon house
          </span>
          <span className="muted">move-in July 20</span>
        </header>

        <div className="panel-body">
          {/* Hero gallery: first photo large, next two stacked */}
          {photos.length > 0 ? (
            <div className="hero">
              {photos.slice(0, 3).map((p, i) => (
                <button
                  key={p.url}
                  className={`hero-tile${i === 0 ? ' hero-lead' : ''}`}
                  onClick={() => lb.open('house', photos, i)}
                  title={p.name}
                >
                  <img src={assetUrl(p.url)} alt={p.name} loading="lazy" />
                </button>
              ))}
            </div>
          ) : (
            <div className="hero-empty">
              <IconPhoto size={22} />
              <span>Drop exterior & front-of-house photos into content/house/photos/</span>
            </div>
          )}

          {/* Overall brief, collapsible */}
          <div className="brief-teaser">
            <p className="serif lead">{teaser}</p>
            {briefOpen && <Markdown className="serif brief-full">{house.brief}</Markdown>}
            {house.brief && house.brief.trim() !== teaser && (
              <button className="link-btn" onClick={() => setBriefOpen((v) => !v)}>
                {briefOpen ? 'Show less' : 'Read the full brief'}{' '}
                {briefOpen ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
              </button>
            )}
          </div>

          <h2 className="rooms-heading">Rooms</h2>
          <div className="room-cards">
            {rooms.map((room) => (
              <Link key={room.slug} to={`/room/${room.slug}`} className="room-card">
                <div className="room-thumb">
                  {room.thumbnail ? (
                    <img src={assetUrl(room.thumbnail)} alt={room.label} loading="lazy" />
                  ) : (
                    <RoomIcon name={room.icon} size={20} />
                  )}
                </div>
                <p className="room-name">{room.label}</p>
                <p className="room-counts">
                  {room.counts.photos} {room.counts.photos === 1 ? 'photo' : 'photos'} ·{' '}
                  {room.counts.mockups} {room.counts.mockups === 1 ? 'mockup' : 'mockups'} ·{' '}
                  {room.counts.pins} pins
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {lb.state && (
        <Lightbox
          images={lb.state.images}
          index={lb.state.index}
          onIndex={lb.setIndex}
          onClose={lb.close}
        />
      )}
    </div>
  )
}
