// Pure content scanner: walks content/ and produces the manifest object that drives the UI.
// "The filesystem is the database" — this is the read side. Shared by the virtual module and
// the /api/manifest endpoint (both serve the SAME cached object so they can never disagree).
import fs from 'node:fs'
import path from 'node:path'
import { ROOMS } from '../src/rooms.js'

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'])

const isImage = (name) => IMAGE_EXTS.has(path.extname(name).toLowerCase())

// List image files in a dir, sorted by name. Tolerates a missing directory.
function listImages(dir, urlBase) {
  let entries
  try {
    entries = fs.readdirSync(dir)
  } catch {
    return []
  }
  return entries
    .filter((name) => isImage(name))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, url: `${urlBase}/${encodeURIComponent(name)}` }))
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch {
    return ''
  }
}

// Read a room's pins.json. Accepts either { syncedAt, pins:[] } or a bare array (back-compat).
function readPins(roomDir, slug) {
  const file = path.join(roomDir, 'pins.json')
  let raw
  try {
    raw = fs.readFileSync(file, 'utf8')
  } catch {
    return { syncedAt: null, pins: [] }
  }
  let data
  try {
    data = JSON.parse(raw)
  } catch {
    return { syncedAt: null, pins: [] }
  }
  const list = Array.isArray(data) ? data : Array.isArray(data.pins) ? data.pins : []
  const syncedAt = Array.isArray(data) ? null : data.syncedAt ?? null
  const pins = list
    .filter((p) => p && p.image)
    .map((p) => ({
      image: p.image,
      title: p.title || '',
      source: p.source || '',
      url: `/content/rooms/${slug}/pins/${encodeURIComponent(p.image)}`,
    }))
  return { syncedAt, pins }
}

export function scanContent(contentDir) {
  // House: overall brief + hero photos
  const housePhotos = listImages(
    path.join(contentDir, 'house', 'photos'),
    '/content/house/photos',
  )
  const house = {
    brief: readText(path.join(contentDir, 'house', 'brief.md')),
    photos: housePhotos,
  }

  // Rooms, in fixed order
  const rooms = ROOMS.map(({ slug, label, icon }) => {
    const roomDir = path.join(contentDir, 'rooms', slug)
    const original = listImages(path.join(roomDir, 'original'), `/content/rooms/${slug}/original`)
    const mockups = listImages(path.join(roomDir, 'mockups'), `/content/rooms/${slug}/mockups`)
    const { syncedAt, pins } = readPins(roomDir, slug)
    return {
      slug,
      label,
      icon,
      brief: readText(path.join(roomDir, 'brief.md')),
      original,
      mockups,
      pins,
      pinsSyncedAt: syncedAt,
      thumbnail: original[0]?.url ?? null,
      counts: { photos: original.length, mockups: mockups.length, pins: pins.length },
    }
  })

  return { house, rooms, generatedAt: new Date().toISOString() }
}
