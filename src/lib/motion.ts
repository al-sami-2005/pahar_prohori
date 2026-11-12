/**
 * Motion tokens (seconds for Motion, milliseconds for MapLibre).
 * Calm by default; urgency comes from state, not from more animation.
 * Reduced motion is honoured globally via <MotionConfig reducedMotion="user">
 * and the prefers-reduced-motion block in globals.css.
 */
import type { Transition } from 'motion/react'

export const duration = {
  fast: 0.16,
  panel: 0.22,
  chart: 0.5,
} as const

/** MapLibre camera durations (ms). */
export const mapDuration = {
  flyTo: 700,
  ease: 400,
} as const

export const ease = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const

export const panelTransition: Transition = {
  duration: duration.panel,
  ease: ease.out,
}

export const fastTransition: Transition = {
  duration: duration.fast,
  ease: ease.out,
}
