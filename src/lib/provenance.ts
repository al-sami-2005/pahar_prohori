import {
  CalendarClock,
  Cpu,
  FlaskConical,
  History,
  Hourglass,
  Info,
  Newspaper,
  Satellite,
  SquareFunction,
  TestTube,
  type LucideIcon,
} from 'lucide-react'
import type { DataProvenance } from '@/types/domain'
import type { Tone } from './tones'

/** Every label the UI may attach to a value. */
export type ProvenanceLabel =
  | 'nasa'
  | 'derived'
  | 'simulated'
  | 'lab'
  | 'stale'
  | 'validation-pending'
  | 'prototype-backtest'
  | 'illustrative'
  | 'reported'
  | 'post-event'

export interface ProvenanceMeta {
  label: string
  description: string
  tone: Tone
  icon: LucideIcon
  /** Dashed outline = not a measurement. Solid = measured or published data. */
  dashed: boolean
}

export const PROVENANCE_META: Record<ProvenanceLabel, ProvenanceMeta> = {
  nasa: {
    label: 'NASA Data',
    description: 'Published by NASA or NASA–ISRO and used as-is.',
    tone: 'satellite',
    icon: Satellite,
    dashed: false,
  },
  derived: {
    label: 'Derived',
    description: 'Computed by the team from NASA data. See Method for the processing steps.',
    tone: 'ai',
    icon: SquareFunction,
    dashed: false,
  },
  simulated: {
    label: 'Simulated',
    description: 'Deterministic demo value. Not an observation or measurement.',
    tone: 'neutral',
    icon: Cpu,
    dashed: true,
  },
  lab: {
    label: 'Lab Test',
    description: 'Measured in a controlled soil-tray experiment. Not field data.',
    tone: 'healthy',
    icon: FlaskConical,
    dashed: false,
  },
  stale: {
    label: 'Stale',
    description: 'Older than its expected refresh interval.',
    tone: 'neutral',
    icon: History,
    dashed: false,
  },
  'validation-pending': {
    label: 'Validation Pending',
    description: 'Not yet validated against observed landslides.',
    tone: 'neutral',
    icon: Hourglass,
    dashed: true,
  },
  'prototype-backtest': {
    label: 'Prototype Backtest',
    description: 'From a small-sample prototype backtest. Not operational validation.',
    tone: 'neutral',
    icon: TestTube,
    dashed: true,
  },
  illustrative: {
    label: 'Illustrative',
    description: 'Illustrative placeholder — not a measurement and not operational.',
    tone: 'neutral',
    icon: Info,
    dashed: true,
  },
  reported: {
    label: 'Reported',
    description: 'Reported event data (agency or press report). Not a NASA observation.',
    tone: 'neutral',
    icon: Newspaper,
    dashed: false,
  },
  'post-event': {
    label: 'Post-event',
    description: 'Evidence that only exists after the 5 July 2026 backtest cutoff. Used for validation, never as a pre-event signal.',
    tone: 'neutral',
    icon: CalendarClock,
    dashed: true,
  },
}

/** Expand a provenance record into the ordered list of labels to display. */
export function provenanceLabels(p: DataProvenance): ProvenanceLabel[] {
  const labels: ProvenanceLabel[] = [p.kind]
  if (p.stale) labels.push('stale')
  if (p.validation === 'pending') labels.push('validation-pending')
  if (p.validation === 'prototype-backtest') labels.push('prototype-backtest')
  return labels
}

/** True only for values that come from a real observation or measurement. */
export function isMeasured(p: DataProvenance): boolean {
  return p.kind === 'nasa' || p.kind === 'lab'
}
