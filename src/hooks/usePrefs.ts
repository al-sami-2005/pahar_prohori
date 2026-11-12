import { useSyncExternalStore } from 'react'

/**
 * Per-viewer UI conveniences, kept in memory and mirrored to browser storage
 * when available — the app must behave correctly when storage is blocked, so
 * every access is guarded.
 *
 * - railExpanded: remembered across visits (localStorage)
 * - onboardingDismissed: remembered for this browser session only
 *   (sessionStorage), so a new demo session starts with the explainer again
 */
export interface Prefs {
  railExpanded: boolean | null
  onboardingDismissed: boolean
}

const KEY = 'pahar-prohori:prefs:v1'
const SESSION_KEY = 'pahar-prohori:session:v1'

function read(storage: 'localStorage' | 'sessionStorage', key: string): Record<string, unknown> {
  try {
    const raw = window[storage].getItem(key)
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function write(storage: 'localStorage' | 'sessionStorage', key: string, value: object): void {
  try {
    window[storage].setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable — in-memory only */
  }
}

function load(): Prefs {
  const local = read('localStorage', KEY)
  const session = read('sessionStorage', SESSION_KEY)
  return {
    railExpanded: typeof local.railExpanded === 'boolean' ? local.railExpanded : null,
    onboardingDismissed: session.onboardingDismissed === true,
  }
}

let state: Prefs = typeof window === 'undefined' ? { railExpanded: null, onboardingDismissed: false } : load()
const listeners = new Set<() => void>()

export function setPrefs(patch: Partial<Prefs>): void {
  state = { ...state, ...patch }
  write('localStorage', KEY, { railExpanded: state.railExpanded })
  write('sessionStorage', SESSION_KEY, { onboardingDismissed: state.onboardingDismissed })
  listeners.forEach((l) => l())
}

/** Current prefs outside React (e.g. inside map event handlers). */
export function readPrefs(): Prefs {
  return state
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  )
}
