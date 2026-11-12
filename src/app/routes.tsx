import { useSyncExternalStore } from 'react'

/**
 * Minimal hash router. Four product routes don't justify a router
 * dependency, and hash URLs work on any static host (including offline).
 */
export type RouteId = 'mission' | 'replay' | 'deploy' | 'method' | 'system'

const PATH_TO_ROUTE: Record<string, RouteId> = {
  '/': 'mission',
  '/replay': 'replay',
  '/deploy': 'deploy',
  '/method': 'method',
  '/system': 'system',
}

const ROUTE_TO_PATH: Record<RouteId, string> = {
  mission: '/',
  replay: '/replay',
  deploy: '/deploy',
  method: '/method',
  system: '/system',
}

export function parseHash(hash: string): RouteId {
  const path = hash.replace(/^#/, '').split('?')[0] || '/'
  return PATH_TO_ROUTE[path] ?? 'mission'
}

export function hrefFor(route: RouteId): string {
  return `#${ROUTE_TO_PATH[route]}`
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function getSnapshot(): RouteId {
  return parseHash(window.location.hash)
}

export function useHashRoute(): RouteId {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'mission' as const)
}
