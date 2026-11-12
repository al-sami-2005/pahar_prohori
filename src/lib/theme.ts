/**
 * JS mirror of src/styles/tokens.css for MapLibre/Recharts consumers.
 * Keep these values in sync with tokens.css.
 */
import type { AlertLevel, RiskBand } from '@/types/domain'

export const palette = {
  canvas: '#f7f6f1',
  surface: '#ffffff',
  elevated: '#f1f4ef',
  raised: '#e5ece6',
  fg: '#21302a',
  muted: '#5e6f66',
  faint: '#7f8f86',
  line: 'rgba(34, 67, 54, 0.12)',
  lineStrong: 'rgba(34, 67, 54, 0.22)',
  satellite: '#2b7899',
  ai: '#77658f',
  healthy: '#2a7a5a',
  accent: '#216c59',
  watch: '#8d6a18',
  warning: '#b45a2a',
  evacuate: '#be4353',
  sea: '#dceef0',
} as const

export const alertColor: Record<AlertLevel, string> = {
  normal: palette.healthy,
  watch: palette.watch,
  warning: palette.warning,
  evacuate: palette.evacuate,
}

export const riskColor: Record<RiskBand, string> = {
  low: '#e7e5df',
  moderate: '#d7cedc',
  high: '#a996b7',
  critical: '#735d85',
}
