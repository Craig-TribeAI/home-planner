// Free diagnostic (no actor RUN, so no cost): fetch an actor's input schema and print its
// fields, so we can choose an actor that takes a plain section URL and know its exact input.
// Usage: node scripts/apify-schema.mjs <actorId>   e.g. epctex~pinterest-scraper
import { loadApifyToken } from './lib/apify-sync.mjs'

const actorId = process.argv[2]
const token = loadApifyToken()
if (!actorId) { console.log('Usage: node scripts/apify-schema.mjs <actorId>'); process.exit(1) }
if (!token) { console.log('No Apify token found.'); process.exit(1) }

const api = (p) => `https://api.apify.com/v2/${p}${p.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`

try {
  const actRes = await fetch(api(`acts/${encodeURIComponent(actorId)}`))
  if (!actRes.ok) { console.log(`actor fetch HTTP ${actRes.status}: ${(await actRes.text()).slice(0,200)}`); process.exit(1) }
  const act = (await actRes.json()).data
  console.log(`Actor: ${act.username}/${act.name}  (id ${act.id})`)
  const buildId = act.taggedBuilds?.latest?.buildId
  if (!buildId) { console.log('No latest build id found.'); process.exit(0) }

  const bRes = await fetch(api(`actor-builds/${buildId}`))
  if (!bRes.ok) { console.log(`build fetch HTTP ${bRes.status}`); process.exit(1) }
  const build = (await bRes.json()).data
  const schemaStr = build.inputSchema
  if (!schemaStr) { console.log('No inputSchema on build.'); process.exit(0) }
  const schema = typeof schemaStr === 'string' ? JSON.parse(schemaStr) : schemaStr
  console.log('\nTitle:', schema.title)
  console.log('Required:', JSON.stringify(schema.required || []))
  console.log('\nProperties:')
  for (const [key, def] of Object.entries(schema.properties || {})) {
    const enumv = def.enum ? ` enum=${JSON.stringify(def.enum)}` : ''
    console.log(`  - ${key} (${def.type})${enumv}: ${def.title || ''}`)
    if (def.description) console.log(`      ${def.description.slice(0, 120)}`)
  }
} catch (err) {
  console.log('schema probe failed:', err.message || err)
  process.exit(1)
}
