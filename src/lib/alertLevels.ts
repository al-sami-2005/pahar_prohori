import { Eye, ShieldCheck, Siren, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { AlertLevel, Confidence, RiskBand } from '@/types/domain'
import type { Tone } from './tones'

export interface AlertMeta {
  level: AlertLevel
  /** 0 = normal … 3 = evacuate */
  severity: 0 | 1 | 2 | 3
  label: string
  labelBn: string
  icon: LucideIcon
  tone: Tone
  /** When this level applies (concept-brief wording). */
  criteria: string
  /** What people should do. */
  action: string
  actionBn: string
}

export const ALERT_META: Record<AlertLevel, AlertMeta> = {
  normal: {
    level: 'normal',
    severity: 0,
    label: 'Normal',
    labelBn: 'স্বাভাবিক',
    icon: ShieldCheck,
    tone: 'healthy',
    criteria: 'No escalation criteria met.',
    action: 'Routine monitoring',
    actionBn: 'নিয়মিত পর্যবেক্ষণ চলছে',
  },
  watch: {
    level: 'watch',
    severity: 1,
    label: 'Watch',
    labelBn: 'নজরদারি',
    icon: Eye,
    tone: 'watch',
    criteria: 'Heavy or accumulated rainfall over a high-risk slope.',
    action: 'Officials and volunteers alerted',
    actionBn: 'কর্মকর্তা ও স্বেচ্ছাসেবকদের সতর্ক করা হয়েছে',
  },
  warning: {
    level: 'warning',
    severity: 2,
    label: 'Warning',
    labelBn: 'সতর্কতা',
    icon: TriangleAlert,
    tone: 'warning',
    criteria: 'Soil near saturation and rain continuing.',
    action: 'Residents prepare · shelters open',
    actionBn: 'বাসিন্দারা প্রস্তুত থাকুন · আশ্রয়কেন্দ্র খোলা হচ্ছে',
  },
  evacuate: {
    level: 'evacuate',
    severity: 3,
    label: 'Evacuate',
    labelBn: 'সরে যান',
    icon: Siren,
    tone: 'evacuate',
    criteria: 'Saturation and rising tilt — two independent signals agree.',
    action: 'Leave the slope now',
    actionBn: 'এখনই পাহাড় থেকে নিরাপদ স্থানে সরে যান',
  },
}

export const ALERT_ORDER: readonly AlertLevel[] = ['normal', 'watch', 'warning', 'evacuate']

export interface RiskBandMeta {
  label: string
  /** Tailwind background class for swatches. */
  swatch: string
  /** Inclusive lower bound of the Relative Risk Index for this band. */
  min: number
}

/**
 * Band cut-points for the Relative Risk Index. These are display bands for a
 * ranking, not calibrated probability thresholds.
 */
export const RISK_BAND_META: Record<RiskBand, RiskBandMeta> = {
  low: { label: 'Low', swatch: 'bg-risk-low', min: 0 },
  moderate: { label: 'Moderate', swatch: 'bg-risk-moderate', min: 0.4 },
  high: { label: 'High', swatch: 'bg-risk-high', min: 0.6 },
  critical: { label: 'Critical', swatch: 'bg-risk-critical', min: 0.8 },
}

export const RISK_BAND_ORDER: readonly RiskBand[] = ['low', 'moderate', 'high', 'critical']

export function riskBandFor(index: number): RiskBand {
  if (index >= RISK_BAND_META.critical.min) return 'critical'
  if (index >= RISK_BAND_META.high.min) return 'high'
  if (index >= RISK_BAND_META.moderate.min) return 'moderate'
  return 'low'
}

export const CONFIDENCE_META: Record<Confidence, { label: string; bars: 1 | 2 | 3 }> = {
  low: { label: 'Low confidence', bars: 1 },
  medium: { label: 'Medium confidence', bars: 2 },
  high: { label: 'High confidence', bars: 3 },
}
