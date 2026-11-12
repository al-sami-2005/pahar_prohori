/**
 * Semantic tone → Tailwind class lookups.
 * Class names are written out in full so Tailwind's scanner can see them.
 */

export type Tone =
  | 'neutral'
  | 'satellite'
  | 'ai'
  | 'healthy'
  | 'accent'
  | 'watch'
  | 'warning'
  | 'evacuate'

export const toneText: Record<Tone, string> = {
  neutral: 'text-fg',
  satellite: 'text-satellite',
  ai: 'text-ai',
  healthy: 'text-healthy',
  accent: 'text-accent',
  watch: 'text-watch',
  warning: 'text-warning',
  evacuate: 'text-evacuate',
}

export const toneBg: Record<Tone, string> = {
  neutral: 'bg-muted',
  satellite: 'bg-satellite',
  ai: 'bg-ai',
  healthy: 'bg-healthy',
  accent: 'bg-accent',
  watch: 'bg-watch',
  warning: 'bg-warning',
  evacuate: 'bg-evacuate',
}

/** Low-alpha tint for badges and state washes. */
export const toneSoft: Record<Tone, string> = {
  neutral: 'bg-fg/6',
  satellite: 'bg-satellite/10',
  ai: 'bg-ai/10',
  healthy: 'bg-healthy/10',
  accent: 'bg-accent/10',
  watch: 'bg-watch/12',
  warning: 'bg-warning/12',
  evacuate: 'bg-evacuate/14',
}

export const toneBorder: Record<Tone, string> = {
  neutral: 'border-line-strong',
  satellite: 'border-satellite/40',
  ai: 'border-ai/40',
  healthy: 'border-healthy/40',
  accent: 'border-accent/45',
  watch: 'border-watch/45',
  warning: 'border-warning/50',
  evacuate: 'border-evacuate/55',
}
