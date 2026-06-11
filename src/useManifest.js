import { useEffect, useState } from 'react'
import { getManifest, subscribe } from './manifest.js'

// React binding for the live manifest. Re-renders whenever content/ changes.
export function useManifest() {
  const [manifest, setManifest] = useState(getManifest)
  useEffect(() => subscribe(setManifest), [])
  return manifest
}
