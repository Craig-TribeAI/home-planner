// Apify connector for syncing pins from a Pinterest board SECTION.
// We use Apify because section URLs expose no RSS feed and the official Pinterest API
// required Trial access we couldn't get. Actor: imbuedata "Pinterest API Scraper"
// (pay-per-use). Getting a section's pins is a two-step flow:
//   1) getBoardSectionBySlug(username, boardSlug, sectionSlug) -> resolves board id + section id
//   2) getSectionPins(boardId, sectionId)                      -> the pins
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')

// Token from APIFY_TOKEN env, else a gitignored .apify-token file. Returns null if absent.
export function loadApifyToken() {
  if (process.env.APIFY_TOKEN) return process.env.APIFY_TOKEN.trim()
  try {
    return fs.readFileSync(path.join(ROOT, '.apify-token'), 'utf8').trim() || null
  } catch {
    return null
  }
}

export function loadApifyConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'apify.json'), 'utf8'))
  } catch {
    return null
  }
}

// Run one actor action synchronously and return the dataset items array.
async function runAction(actorId, token, input) {
  const endpoint =
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}` +
    `/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Apify HTTP ${res.status} ${text.slice(0, 200)}`)
  return JSON.parse(text)
}

// A Pinterest SECTION URL is /username/boardSlug/sectionSlug/.
function parseSectionUrl(url) {
  const parts = new URL(url).pathname.split('/').filter(Boolean)
  if (parts.length < 3) throw new Error(`not a section URL: ${url}`)
  return { username: parts[0], boardSlug: parts[1], sectionSlug: parts[2] }
}

// Pick the highest-res image URL available, by preference order.
function pickImage(pin, prefs) {
  const imgs = pin.images || {}
  for (const key of prefs) {
    if (imgs[key]?.url) return imgs[key].url
  }
  for (const key of Object.keys(imgs)) {
    if (imgs[key]?.url) return imgs[key].url
  }
  return null
}

// seo_url is a relative path like "/pin/123/"; make it absolute so links work in the app.
function absolutize(u) {
  if (!u) return ''
  if (u.startsWith('http')) return u
  if (u.startsWith('/')) return 'https://www.pinterest.com' + u
  return u
}

// Resolve a section URL to its normalized pins: [{ imageUrl, title, source }].
// Throws on HTTP / resolution errors so the caller can report per-room and continue.
export async function fetchSectionPins(config, token, sectionUrl) {
  const { actorId, maxItems = 100, imagePreference = ['orig', '736x', '474x'] } = config
  const { username, boardSlug, sectionSlug } = parseSectionUrl(sectionUrl)

  const secArr = await runAction(actorId, token, {
    action: 'getBoardSectionBySlug',
    username,
    boardSlug,
    sectionSlug,
  })
  const sec = Array.isArray(secArr) ? secArr[0] : secArr
  const boardId = sec?.board?.id
  const sectionId = sec?.id
  if (!boardId || !sectionId) {
    throw new Error('could not resolve board/section id (is the section public?)')
  }

  const pins = await runAction(actorId, token, {
    action: 'getSectionPins',
    boardId,
    sectionId,
    maxItems,
  })
  if (!Array.isArray(pins)) throw new Error('getSectionPins did not return an array')

  return pins.map((p) => normalizePin(p, imagePreference)).filter((p) => p.imageUrl)
}

// Normalize one raw pin object to { imageUrl, title, source }.
function normalizePin(p, imagePreference) {
  const imageUrl = pickImage(p, imagePreference)
  return {
    imageUrl: typeof imageUrl === 'string' && imageUrl.startsWith('http') ? imageUrl : null,
    title: (p.title || p.grid_title || p.auto_alt_text || '').toString().trim(),
    source: absolutize(p.seo_url || (p.id ? `/pin/${p.id}/` : '')),
  }
}

// Fetch ALL pins on a board (used by the misc catch-all). Two-step: getBoardDetails -> getBoardPins.
export async function fetchBoardPins(config, token, boardUrl) {
  const { actorId, maxItems = 100, imagePreference = ['orig', '736x', '474x'] } = config
  const detailArr = await runAction(actorId, token, { action: 'getBoardDetails', boardUrl })
  const detail = Array.isArray(detailArr) ? detailArr[0] : detailArr
  const boardId = detail?.id
  if (!boardId) throw new Error('could not resolve board id for catch-all')

  const pins = await runAction(actorId, token, { action: 'getBoardPins', boardId, maxItems })
  if (!Array.isArray(pins)) throw new Error('getBoardPins did not return an array')
  return pins.map((p) => normalizePin(p, imagePreference)).filter((p) => p.imageUrl)
}
