import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import contentPlugin from './plugins/content-plugin.js'

export default defineConfig({
  // Dev stays at "/" (the content middleware serves /content/*). For a GitHub Pages
  // project site, build with VITE_BASE="/<repo>/" so assets resolve under the subpath.
  base: process.env.VITE_BASE || '/',
  plugins: [react(), contentPlugin()],
})
