import {
  IconDoorEnter,
  IconSofa,
  IconGlassFull,
  IconToolsKitchen2,
  IconPuzzle,
  IconBed,
  IconMoonStars,
  IconBath,
  IconDots,
} from '@tabler/icons-react'

const MAP = {
  IconDoorEnter,
  IconSofa,
  IconGlassFull,
  IconToolsKitchen2,
  IconPuzzle,
  IconBed,
  IconMoonStars,
  IconBath,
  IconDots,
}

// Resolve a room's icon name (from src/rooms.js) to its Tabler component.
export default function RoomIcon({ name, ...props }) {
  const Cmp = MAP[name] || IconSofa
  return <Cmp {...props} />
}
