// After `vite build`, copy the content/ images into dist/content/ so the static site can serve
// them (the dev-server middleware that normally serves /content/* doesn't exist on a static host).
// Copies image files only (briefs/pins.json are already baked into the bundle's manifest).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'content')
const DEST = path.join(ROOT, 'dist', 'content')

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'])

let copied = 0
function walk(dir, rel = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    const relPath = path.join(rel, entry.name)
    if (entry.isDirectory()) {
      walk(abs, relPath)
    } else if (IMAGE_EXTS.has(path.extname(entry.name).toLowerCase())) {
      const out = path.join(DEST, relPath)
      fs.mkdirSync(path.dirname(out), { recursive: true })
      fs.copyFileSync(abs, out)
      copied++
    }
  }
}

if (!fs.existsSync(SRC)) {
  console.error('No content/ directory to copy.')
  process.exit(1)
}
walk(SRC)
console.log(`Copied ${copied} image(s) into dist/content/`)
