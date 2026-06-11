// Standalone pin sync — NOT part of the dev server. `npm run sync-pins`.
// Two sources, merged per room into content/rooms/<slug>/pins.json + pins/ images:
//   1. RSS  — boards.json maps a room slug to a PUBLIC board URL (whole-board feed).
//   2. Apify — apify.json maps a room slug to a board SECTION URL (sections have no RSS).
// Both normalize to { imageUrl, title, source }; a shared step rewrites 236x->736x,
// dedupes against what's already saved, downloads new images, and appends to pins.json.
// Only ever ADDS, never deletes. One room/source failing never aborts the rest.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { XMLParser } from 'fast-xml-parser'
import { fetchSectionPins, fetchBoardPins, loadApifyConfig, loadApifyToken } from './lib/apify-sync.mjs'
import { ROOM_SLUGS } from '../src/rooms.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CONTENT = path.join(ROOT, 'content')

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

// ---------- shared helpers ----------
function asArray(x) {
  return Array.isArray(x) ? x : x == null ? [] : [x]
}

function toHiRes(url) {
  return url.replace('/236x/', '/736x/')
}

function filenameFromUrl(url) {
  try {
    return path.basename(new URL(url).pathname) || null
  } catch {
    return null
  }
}

function loadPinsJson(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (Array.isArray(data)) return { syncedAt: null, pins: data }
    return { syncedAt: data.syncedAt ?? null, pins: Array.isArray(data.pins) ? data.pins : [] }
  } catch {
    return { syncedAt: null, pins: [] }
  }
}

async function downloadImage(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': 'home-planner-sync' } })
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest))
}

// ---------- source: RSS (whole public board) ----------
function extractRssImageUrl(item) {
  const enclosure = item.enclosure?.['@_url']
  if (enclosure) return enclosure
  const media = item['media:content']?.['@_url'] || item['media:thumbnail']?.['@_url']
  if (media) return media
  const html = item.description || item['content:encoded'] || ''
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html)
  return m ? m[1] : null
}

async function rssPins(boardUrl) {
  const rssUrl = boardUrl.replace(/\/$/, '') + '.rss'
  const res = await fetch(rssUrl, { headers: { 'User-Agent': 'home-planner-sync' } })
  if (!res.ok) throw new Error(`feed HTTP ${res.status}`)
  const parsed = parser.parse(await res.text())
  return asArray(parsed?.rss?.channel?.item)
    .map((item) => ({
      imageUrl: extractRssImageUrl(item),
      title: (item.title || '').toString().trim(),
      source: item.link || '',
    }))
    .filter((p) => p.imageUrl)
}

// ---------- merge incoming pins into a room ----------
// `incoming` = [{ imageUrl, title, source }]. Returns { added, skipped }.
async function mergeIntoRoom(slug, incoming) {
  const pinsDir = path.join(CONTENT, 'rooms', slug, 'pins')
  const pinsJsonFile = path.join(CONTENT, 'rooms', slug, 'pins.json')
  fs.mkdirSync(pinsDir, { recursive: true })

  const { pins } = loadPinsJson(pinsJsonFile)
  const known = new Set(pins.map((p) => p.image))
  const knownSources = new Set(pins.map((p) => p.source).filter(Boolean))

  let added = 0
  let skipped = 0
  for (const { imageUrl, title, source } of incoming) {
    const url = toHiRes(imageUrl)
    const filename = filenameFromUrl(url)
    if (!filename) {
      skipped++
      continue
    }
    const dest = path.join(pinsDir, filename)
    if (known.has(filename) || fs.existsSync(dest) || (source && knownSources.has(source))) {
      skipped++
      continue
    }
    try {
      await downloadImage(url, dest)
      pins.push({ image: filename, title, source })
      known.add(filename)
      if (source) knownSources.add(source)
      added++
    } catch {
      skipped++
    }
  }

  fs.writeFileSync(
    pinsJsonFile,
    JSON.stringify({ syncedAt: new Date().toISOString(), pins }, null, 2) + '\n',
  )
  return { added, skipped }
}

// Set of every pin image filename already saved across ALL rooms — the cross-room dedup key
// for the misc catch-all (Pinterest filenames are content hashes, stable across sizes).
function buildGlobalKnownSet() {
  const set = new Set()
  for (const slug of ROOM_SLUGS) {
    const { pins } = loadPinsJson(path.join(CONTENT, 'rooms', slug, 'pins.json'))
    for (const p of pins) if (p.image) set.add(p.image)
  }
  return set
}

// ---------- orchestration ----------
function loadBoards() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'boards.json'), 'utf8'))
    return Object.entries(data).filter(
      ([k, v]) => !k.startsWith('_') && typeof v === 'string' && v.trim(),
    )
  } catch {
    return []
  }
}

async function main() {
  // Build a per-room task list from both sources.
  const tasks = [] // { slug, kind, run: () => Promise<incoming[]> }

  for (const [slug, url] of loadBoards()) {
    tasks.push({ slug, kind: 'rss', run: () => rssPins(url) })
  }

  const apifyConfig = loadApifyConfig()
  const apifyRooms = apifyConfig?.rooms
    ? Object.entries(apifyConfig.rooms).filter(([, u]) => typeof u === 'string' && u.trim())
    : []
  if (apifyRooms.length) {
    const token = loadApifyToken()
    if (!token) {
      console.log(
        'apify.json has section URLs but no token found. Add your Apify API token to a `.apify-token` file (or set APIFY_TOKEN), then re-run.\n',
      )
    } else {
      for (const [slug, url] of apifyRooms) {
        tasks.push({ slug, kind: 'apify', run: () => fetchSectionPins(apifyConfig, token, url) })
      }
    }
  }

  if (tasks.length === 0) {
    console.log(
      'Nothing to sync. Add public board URLs to boards.json (RSS) and/or section URLs to apify.json (Apify), then re-run.',
    )
    return
  }

  const results = []
  for (const task of tasks) {
    process.stdout.write(`Syncing ${task.slug} (${task.kind})… `)
    try {
      const incoming = await task.run()
      const { added, skipped } = await mergeIntoRoom(task.slug, incoming)
      results.push({ ...task, added, skipped, error: null })
      console.log(`+${added} new, ${skipped} skipped`)
    } catch (err) {
      results.push({ ...task, added: 0, skipped: 0, error: String(err.message || err) })
      console.log(`FAILED — ${err.message || err}`)
    }
  }

  // Catch-all: after every section is synced, pull ALL board pins and add to the misc room any
  // that aren't already filed in some room (unsectioned / overflow). Runs last for full dedup.
  const catchAll = apifyConfig?.catchAll
  if (catchAll?.boardUrl && catchAll?.room) {
    const token = loadApifyToken()
    if (token) {
      process.stdout.write(`Syncing ${catchAll.room} (catch-all)… `)
      try {
        const known = buildGlobalKnownSet()
        const boardPins = await fetchBoardPins(apifyConfig, token, catchAll.boardUrl)
        const fresh = boardPins.filter((p) => {
          const fn = filenameFromUrl(toHiRes(p.imageUrl))
          return fn && !known.has(fn)
        })
        const { added, skipped } = await mergeIntoRoom(catchAll.room, fresh)
        results.push({ slug: catchAll.room, kind: 'catch-all', added, skipped, error: null })
        console.log(`+${added} new, ${skipped} skipped (scanned ${boardPins.length} board pins)`)
      } catch (err) {
        results.push({ slug: catchAll.room, kind: 'catch-all', added: 0, skipped: 0, error: String(err.message || err) })
        console.log(`FAILED — ${err.message || err}`)
      }
    }
  }

  console.log('\nSummary')
  console.log('─'.repeat(56))
  let total = 0
  for (const r of results) {
    total += r.added
    const status = r.error ? `error: ${r.error}` : `+${r.added} new, ${r.skipped} skipped`
    console.log(`  ${`${r.slug} (${r.kind})`.padEnd(28)} ${status}`)
  }
  console.log('─'.repeat(56))
  console.log(`  ${total} new pin${total === 1 ? '' : 's'} downloaded total.`)
}

main().catch((err) => {
  console.error('Sync failed:', err)
  process.exit(1)
})
