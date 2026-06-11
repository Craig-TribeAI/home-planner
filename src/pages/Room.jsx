import { Link, useParams } from 'react-router-dom'
import {
  IconArrowLeft,
  IconCamera,
  IconWand,
  IconSparkles,
  IconRefresh,
} from '@tabler/icons-react'
import { useManifest } from '../useManifest.js'
import { useLightbox } from '../useLightbox.js'
import Markdown from '../components/Markdown.jsx'
import Lightbox from '../components/Lightbox.jsx'
import ImageGrid from '../components/ImageGrid.jsx'
import PinGrid from '../components/PinGrid.jsx'
import UploadZone from '../components/UploadZone.jsx'

// "5 min ago" style relative time for the sync badge.
function relTime(iso) {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  const secs = Math.round((Date.now() - then) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ago`
  const days = Math.round(hrs / 24)
  return `${days} ${days === 1 ? 'day' : 'days'} ago`
}

export default function Room() {
  const { slug } = useParams()
  const { rooms } = useManifest()
  const lb = useLightbox()
  const room = rooms.find((r) => r.slug === slug)

  if (!room) {
    return (
      <div className="page">
        <div className="panel">
          <div className="panel-body">
            <p>Room not found.</p>
            <Link to="/" className="link-btn">
              <IconArrowLeft size={14} /> All rooms
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { counts } = room
  const synced = relTime(room.pinsSyncedAt)

  return (
    <div className="page">
      <div className="panel">
        <header className="panel-head three-col">
          <Link to="/" className="muted back-link">
            <IconArrowLeft size={14} /> All rooms
          </Link>
          <span className="title">{room.label}</span>
          <span className="muted">
            {counts.photos} · {counts.mockups} · {counts.pins}
          </span>
        </header>

        <div className="panel-body">
          {/* Room brief */}
          <div className="room-brief">
            <p className="brief-kicker">From the brief</p>
            <Markdown className="serif">{room.brief}</Markdown>
          </div>

          {/* Original */}
          <section>
            <h3 className="section-head">
              <IconCamera size={16} /> Original{' '}
              <span className="count">
                {counts.photos} {counts.photos === 1 ? 'photo' : 'photos'}
              </span>
            </h3>
            <ImageGrid
              images={room.original}
              cols={4}
              onOpen={(i) => lb.open('original', room.original, i)}
              emptyHint="No photos yet — drop listing & tour shots below."
            />
            {!import.meta.env.PROD && <UploadZone slug={room.slug} />}
          </section>

          {/* Mockups */}
          <section>
            <h3 className="section-head">
              <IconWand size={16} /> Mockups <span className="count">{counts.mockups}</span>
            </h3>
            <ImageGrid
              images={room.mockups}
              cols={4}
              onOpen={(i) => lb.open('mockups', room.mockups, i)}
              emptyHint={`No mockups yet — save images into ${room.slug}/mockups/.`}
            />
          </section>

          {/* Inspiration */}
          <section>
            <h3 className="section-head">
              <IconSparkles size={16} /> Inspiration
              {(synced || counts.pins > 0) && (
                <span className="synced-badge">
                  {synced ? `synced ${synced} · ` : ''}
                  {counts.pins} pins
                </span>
              )}
            </h3>
            <PinGrid pins={room.pins} onOpen={(i) => lb.open('pins', room.pins, i)} />
            <div className="sync-footer">
              <IconRefresh size={14} />
              <span>
                <code>npm run sync-pins</code>&nbsp;·&nbsp; {room.slug} board
              </span>
            </div>
          </section>
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
