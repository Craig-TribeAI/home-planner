// Fixed room order — the single source of truth for both the scanner (plugins/scan-content.js)
// and the UI. Never rely on readdir() order, which is not guaranteed.
// Icon names map to @tabler/icons-react components (resolved in the UI), mirroring the mockup.
export const ROOMS = [
  { slug: 'entryway', label: 'Entryway', icon: 'IconDoorEnter' },
  { slug: 'living-room', label: 'Living room', icon: 'IconSofa' },
  { slug: 'dining-room', label: 'Dining room', icon: 'IconGlassFull' },
  { slug: 'kitchen', label: 'Kitchen', icon: 'IconToolsKitchen2' },
  { slug: 'playroom', label: 'Playroom', icon: 'IconPuzzle' },
  { slug: 'master-bedroom', label: 'Master bedroom', icon: 'IconBed' },
  { slug: 'kids-bedroom', label: "Kids' bedroom", icon: 'IconMoonStars' },
  { slug: 'bathroom', label: 'Bathroom', icon: 'IconBath' },
  { slug: 'misc', label: 'Misc', icon: 'IconDots' },
]

export const ROOM_SLUGS = ROOMS.map((r) => r.slug)

export const roomBySlug = (slug) => ROOMS.find((r) => r.slug === slug)
