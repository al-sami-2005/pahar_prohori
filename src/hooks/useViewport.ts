import { useSyncExternalStore } from 'react'
import { layoutMode, type LayoutMode } from '@/lib/layout'

export interface Viewport {
  width: number
  height: number
  mode: LayoutMode
  /** Short laptop screens (e.g. 1366×768) get tighter vertical rhythm. */
  short: boolean
}

let cached: Viewport | null = null

function read(): Viewport {
  const width = window.innerWidth
  const height = window.innerHeight
  if (cached && cached.width === width && cached.height === height) return cached
  cached = { width, height, mode: layoutMode(width), short: height < 820 }
  return cached
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

const SERVER: Viewport = { width: 1440, height: 900, mode: 'desktop', short: false }

/** Structural breakpoints the layout switches on (CSS handles the finer ones). */
export function useViewport(): Viewport {
  return useSyncExternalStore(subscribe, read, () => SERVER)
}
