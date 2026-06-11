// Focused probe for the imbuedata Pinterest API Scraper two-step section flow.
// 1) getBoardSectionBySlug  (username + boardSlug + sectionSlug)  -> section incl. ids
// 2) getSectionPins         (boardId + sectionId)                 -> the pins
// Prints the shapes so we can wire the connector + set field paths. Never prints the token.
import { loadApifyToken } from './lib/apify-sync.mjs'

const ACTOR = '7AmGS416wqlRTFhWm'
const token = loadApifyToken()
if (!token) { console.log('No Apify token.'); process.exit(1) }

const url = process.argv[2] || 'https://www.pinterest.com/craigbarowsky/quentin-st/dining-room/'
const parts = new URL(url).pathname.split('/').filter(Boolean)
const [username, boardSlug, sectionSlug] = parts
console.log(`Parsed: username=${username} boardSlug=${boardSlug} sectionSlug=${sectionSlug}\n`)

async function run(input) {
  const endpoint = `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`
  const res = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status} ${text.slice(0, 300)}`)
  return JSON.parse(text)
}

// helper: search an object for the first key matching /board.*id/i and /section.*id/i
function findId(obj, re) {
  let found = null
  const walk = (o) => {
    if (found || o == null || typeof o !== 'object') return
    for (const [k, v] of Object.entries(o)) {
      if (found) return
      if (re.test(k) && (typeof v === 'string' || typeof v === 'number')) { found = String(v); return }
      if (typeof v === 'object') walk(v)
    }
  }
  walk(obj)
  return found
}

try {
  console.log('── STEP 1: getBoardSectionBySlug ──')
  const sec = await run({ action: 'getBoardSectionBySlug', username, boardSlug, sectionSlug })
  console.log('items:', Array.isArray(sec) ? sec.length : 'not-array')
  const s0 = Array.isArray(sec) ? sec[0] : sec
  console.log('keys:', s0 && Object.keys(s0).join(', '))
  console.log(JSON.stringify(s0, null, 2).slice(0, 1500))

  const boardId = s0?.board?.id || findId(s0, /board.*id/i)
  const sectionId = s0?.id || findId(s0, /section.*id/i)
  console.log(`\nExtracted boardId=${boardId} sectionId=${sectionId}`)

  if (boardId && sectionId) {
    console.log('\n── STEP 2: getSectionPins ──')
    const pins = await run({ action: 'getSectionPins', boardId, sectionId, maxItems: 5 })
    console.log('pins:', Array.isArray(pins) ? pins.length : 'not-array')
    const p0 = Array.isArray(pins) ? pins[0] : pins
    console.log('\n-- candidate IMAGE fields --')
    console.log('images keys:', p0?.images && Object.keys(p0.images).join(', '))
    console.log('images.orig:', JSON.stringify(p0?.images?.orig))
    console.log('images["736x"]:', JSON.stringify(p0?.images?.['736x']))
    console.log('\n-- candidate TITLE fields --')
    console.log('title:', JSON.stringify(p0?.title))
    console.log('grid_title:', JSON.stringify(p0?.grid_title))
    console.log('auto_alt_text:', JSON.stringify(p0?.auto_alt_text))
    console.log('story pin_title:', JSON.stringify(p0?.story_pin_data?.metadata?.pin_title))
    console.log('\n-- candidate SOURCE fields --')
    console.log('id:', JSON.stringify(p0?.id))
    console.log('seo_url:', JSON.stringify(p0?.seo_url))
    console.log('link:', JSON.stringify(p0?.link))
  }
} catch (err) {
  console.log('probe failed:', err.message || err)
  process.exit(1)
}
