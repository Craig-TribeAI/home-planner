// Vite plugin: the write+serve side of "the filesystem is the database".
//   - virtual:content-manifest  -> synchronous manifest for first paint + HMR
//   - GET  /api/manifest        -> same cached manifest object, for post-upload refetch
//   - GET  /content/*           -> streams images that live OUTSIDE public/
//   - POST /api/upload/:slug     -> writes raw image bytes into <slug>/original/
//   - watcher on content/        -> debounced rescan + content:changed HMR event
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanContent } from './scan-content.js'
import { ROOM_SLUGS } from '../src/rooms.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = path.resolve(__dirname, '..', 'content')

const VID = 'virtual:content-manifest'
const RESOLVED_VID = '\0' + VID

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
}
const IMAGE_EXTS = new Set(Object.keys(MIME))

export default function contentPlugin() {
  let manifest = scanContent(CONTENT_DIR)

  function rebuild() {
    manifest = scanContent(CONTENT_DIR)
  }

  return {
    name: 'home-planner-content',

    resolveId(id) {
      if (id === VID) return RESOLVED_VID
    },
    load(id) {
      if (id === RESOLVED_VID) {
        return `export default ${JSON.stringify(manifest)}`
      }
    },

    configureServer(server) {
      // --- GET /api/manifest : authoritative live read of the cached object ---
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/manifest')) return next()
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify(manifest))
      })

      // --- POST /api/upload/:slug : write raw bytes into <slug>/original/ ---
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/upload/')) return next()
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end('Method Not Allowed')
        }
        const slug = decodeURIComponent(req.url.slice('/api/upload/'.length).split('?')[0])
        if (!ROOM_SLUGS.includes(slug)) {
          res.statusCode = 400
          return res.end(JSON.stringify({ ok: false, error: `Unknown room: ${slug}` }))
        }
        const rawName = req.headers['x-filename']
        const safe = safeFilename(Array.isArray(rawName) ? rawName[0] : rawName)
        if (!safe) {
          res.statusCode = 400
          return res.end(JSON.stringify({ ok: false, error: 'Missing or invalid x-filename header' }))
        }
        const destDir = path.join(CONTENT_DIR, 'rooms', slug, 'original')
        fs.mkdirSync(destDir, { recursive: true })
        const finalName = uniqueName(destDir, safe)
        const out = fs.createWriteStream(path.join(destDir, finalName))
        req.pipe(out)
        out.on('finish', () => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, written: finalName }))
        })
        out.on('error', (err) => {
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: String(err) }))
        })
        req.on('error', () => out.destroy())
      })

      // --- GET /content/* : stream images from outside public/ ---
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/content/')) return next()
        const rel = decodeURIComponent(req.url.slice('/content/'.length).split('?')[0])
        const resolved = path.resolve(CONTENT_DIR, rel)
        // Traversal guard: resolved path must stay inside CONTENT_DIR.
        if (resolved !== CONTENT_DIR && !resolved.startsWith(CONTENT_DIR + path.sep)) {
          res.statusCode = 403
          return res.end('Forbidden')
        }
        const ext = path.extname(resolved).toLowerCase()
        const type = MIME[ext]
        if (!type) {
          res.statusCode = 404
          return res.end('Not Found')
        }
        const stream = fs.createReadStream(resolved)
        stream.on('open', () => {
          res.setHeader('Content-Type', type)
          res.setHeader('Cache-Control', 'no-cache')
        })
        stream.on('error', () => {
          res.statusCode = 404
          res.end('Not Found')
        })
        stream.pipe(res)
      })

      // --- Watch content/ : debounced rescan + HMR ---
      server.watcher.add(CONTENT_DIR)
      let timer = null
      const onChange = (file) => {
        if (!file || !file.startsWith(CONTENT_DIR)) return
        const base = path.basename(file)
        const ext = path.extname(file).toLowerCase()
        const relevant = IMAGE_EXTS.has(ext) || base === 'brief.md' || base === 'pins.json'
        if (!relevant) return
        clearTimeout(timer)
        timer = setTimeout(() => {
          rebuild()
          const mod = server.moduleGraph.getModuleById(RESOLVED_VID)
          if (mod) server.moduleGraph.invalidateModule(mod)
          server.ws.send({ type: 'custom', event: 'content:changed' })
        }, 200)
      }
      server.watcher.on('add', onChange)
      server.watcher.on('unlink', onChange)
      server.watcher.on('change', onChange)
    },
  }
}

// path.basename strips any directory, then drop leading dots and disallow non-images.
function safeFilename(name) {
  if (!name || typeof name !== 'string') return null
  let base = path.basename(name).replace(/^\.+/, '').trim()
  if (!base) return null
  if (!IMAGE_EXTS.has(path.extname(base).toLowerCase())) return null
  return base
}

// Avoid clobbering an existing file: photo.jpg -> photo-1.jpg -> photo-2.jpg ...
function uniqueName(dir, name) {
  const ext = path.extname(name)
  const stem = name.slice(0, name.length - ext.length)
  let candidate = name
  let i = 1
  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${stem}-${i}${ext}`
    i++
  }
  return candidate
}
