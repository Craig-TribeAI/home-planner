// One-off diagnostic: run the configured Apify actor against a SINGLE section and print the
// raw shape of what it returns, so we can set the field dot-paths in apify.json correctly.
// Runs ONE section only (default: dining-room) to keep the Apify cost to a single run.
// Never prints the API token. Usage: node scripts/apify-probe.mjs [room-slug]
import { fetchRaw, loadApifyConfig, loadApifyToken } from './lib/apify-sync.mjs'

const slug = process.argv[2] || 'dining-room'
const config = loadApifyConfig()
const token = loadApifyToken()

if (!config) {
  console.log('No apify.json found.')
  process.exit(1)
}
if (!token) {
  console.log('No Apify token found. Add it to a `.apify-token` file (or APIFY_TOKEN env).')
  process.exit(1)
}
const url = config.rooms?.[slug]
if (!url) {
  console.log(`No section URL for "${slug}" in apify.json rooms.`)
  process.exit(1)
}

console.log(`Probing actor ${config.actorId} for "${slug}"`)
console.log(`Section: ${url}\n(one Apify run — may take 20–60s)\n`)

try {
  const items = await fetchRaw(config, token, url)
  if (!Array.isArray(items)) {
    console.log('Actor did not return an array. Raw:', JSON.stringify(items).slice(0, 500))
    process.exit(0)
  }
  console.log(`Returned ${items.length} item(s).`)
  if (items.length === 0) {
    console.log('Empty result — the actor may need a different input shape, or the section is private.')
    process.exit(0)
  }
  const first = items[0]
  console.log('\nTop-level keys of item[0]:')
  console.log('  ' + Object.keys(first).join(', '))
  console.log('\nFull item[0] (so we can pick image / title / source field paths):')
  console.log(JSON.stringify(first, null, 2).slice(0, 4000))
} catch (err) {
  console.log('Probe failed:', err.message || err)
  process.exit(1)
}
