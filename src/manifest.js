// The manifest is the read model of content/. It arrives synchronously via the virtual module
// for first paint, then a tiny subscription keeps it live: when the dev server's watcher fires
// `content:changed`, we refetch /api/manifest (authoritative) and notify subscribers so the UI
// reflects newly dropped/uploaded/synced files without a full reload.
import initial from 'virtual:content-manifest'

let current = initial
const subscribers = new Set()

export function getManifest() {
  return current
}

export function subscribe(fn) {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

async function refetch() {
  try {
    const res = await fetch('/api/manifest', { cache: 'no-store' })
    if (!res.ok) return
    current = await res.json()
    subscribers.forEach((fn) => fn(current))
  } catch {
    // ignore — transient during restart
  }
}

if (import.meta.hot) {
  // Server pushes this custom event after a debounced rescan of content/.
  import.meta.hot.on('content:changed', refetch)
  // If the virtual module itself is re-evaluated, adopt its fresh data too.
  import.meta.hot.accept('virtual:content-manifest', (mod) => {
    if (mod?.default) {
      current = mod.default
      subscribers.forEach((fn) => fn(current))
    }
  })
}
