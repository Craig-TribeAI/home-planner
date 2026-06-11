// Resolve an internal content path (e.g. "/content/rooms/x/pins/y.jpg") against the app's base.
// Dev: BASE_URL is "/", so it stays "/content/..." and the dev-server middleware serves it.
// Build (GitHub Pages project site): BASE_URL is "/<repo>/", so it becomes "/<repo>/content/...",
// matching the static images copied into dist/content/ at build time.
// External URLs (http...) and falsy values pass through untouched.
export function assetUrl(u) {
  if (!u || /^https?:\/\//.test(u)) return u
  return import.meta.env.BASE_URL + String(u).replace(/^\//, '')
}
