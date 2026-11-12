/**
 * Method & provenance copy (English). Every statement here must stay true to
 * the concept brief and to what the prototype actually does.
 */
import type { LucideIcon } from 'lucide-react'
import { BrainCircuit, Megaphone, RadioTower, Satellite } from 'lucide-react'
import type { AlertLevel } from '@/types/domain'
import type { ProvenanceLabel } from '@/lib/provenance'
import type { Tone } from '@/lib/tones'
import { ALERT_THRESHOLDS as T } from '@/lib/scenarioConfig'

export interface ChainStep {
  key: string
  step: string
  question: string
  uses: string
  output: string
  status: string
  tone: Tone
  icon: LucideIcon
}

export const CHAIN: readonly ChainStep[] = [
  {
    key: 'space',
    step: 'Space',
    question: 'Where is the ground changing?',
    uses: 'NASA–ISRO NISAR L-band radar: GCOV before/after brightness images, and GUNW interferograms where practical. Radar works day and night, through monsoon cloud.',
    output: 'Change and scar evidence; candidate unstable or creeping slopes.',
    status: 'Pass list is real (NASA CMR catalog). Change footprints on the map are illustrative until GCOV processing is run.',
    tone: 'satellite',
    icon: Satellite,
  },
  {
    key: 'ai',
    step: 'AI',
    question: 'How likely, compared with other slopes?',
    uses: 'An XGBoost-style ranking that combines NISAR change, GPM IMERG rainfall, NASADEM slope and past landslides from the NASA Global Landslide Catalog. NASA LHASA is the baseline to compare against.',
    output: 'A Relative Risk Index per slope, and the order in which slopes should receive sensors.',
    status: 'Values are placeholders — the model is not trained yet. The index is a ranking, never a probability of failure.',
    tone: 'ai',
    icon: BrainCircuit,
  },
  {
    key: 'ground',
    step: 'Ground',
    question: 'When are conditions escalating?',
    uses: 'Low-cost ESP32 nodes with two capacitive soil-moisture probes, an MPU6050 tilt sensor and a rain gauge, reporting over LoRa to a Raspberry Pi gateway.',
    output: 'Rain, soil saturation and tilt, every few seconds, on the slopes that matter most.',
    status: 'Telemetry in this demo is simulated. A soil-tray lab test is planned; it will not prove field performance.',
    tone: 'healthy',
    icon: RadioTower,
  },
  {
    key: 'human',
    step: 'Human action',
    question: 'What should people do now?',
    uses: 'Alert rules on the gateway, a siren and light on the slope, and Bengali voice/SMS messages for residents, camp managers and officials.',
    output: 'Watch → Warning → Evacuate, with the reason for each level.',
    status: 'Alert thresholds are illustrative demo values, not operational.',
    tone: 'warning',
    icon: Megaphone,
  },
]

export interface AlertRule {
  level: AlertLevel
  when: string
  action: string
}

export const ALERT_RULES: readonly AlertRule[] = [
  {
    level: 'watch',
    when: `Rain of ${T.meaningfulRainRate} mm/h or more (or ${T.meaningfulRain24h} mm in 24 h) on a high- or critical-susceptibility slope. Slopes without a ground node never go higher.`,
    action: 'Officials and volunteers are alerted and pay attention.',
  },
  {
    level: 'warning',
    when: `Rain continuing at ${T.continuingRainRate} mm/h or more after ${T.continuingRain24h} mm in 24 h, and the deep soil probe at ${T.saturationDeep}% saturation or more.`,
    action: 'Residents are told to prepare; shelters open.',
  },
  {
    level: 'evacuate',
    when: `Two independent in-situ signals agree for ${T.evacuateHoldMin} minutes: deep soil at ${T.saturationDeep}% or more, and tilt change of ${T.movementTilt}° or more that is still increasing. Relative risk never counts toward this.`,
    action: 'Siren on the slope; voice and SMS: leave now.',
  },
]

export interface SourceRow {
  source: string
  gives: string
  status: string
  labels: ProvenanceLabel[]
}

export const SOURCES: readonly SourceRow[] = [
  {
    source: 'NISAR GCOV',
    gives: 'Terrain-corrected radar brightness before and after an event — surface change and new scars.',
    status: 'Pass list real (CMR query, 24 Sep 2026). Change footprints illustrative.',
    labels: ['nasa', 'simulated'],
  },
  {
    source: 'NISAR GUNW',
    gives: 'Interferograms — centimetre-scale ground movement and coherence loss.',
    status: 'Pair identified (30 Jun → 12 Jul, Chattogram). Not processed yet.',
    labels: ['nasa'],
  },
  {
    source: 'GPM IMERG',
    gives: 'Satellite rainfall every 30 minutes on a 0.1° grid.',
    status: 'Simulated field on the IMERG grid. Early-run latency is about 4 hours.',
    labels: ['simulated'],
  },
  {
    source: 'NASADEM',
    gives: 'Elevation and slope angle.',
    status: 'Planned. Slope angles shown are placeholders.',
    labels: ['simulated'],
  },
  {
    source: 'NASA Global Landslide Catalog',
    gives: 'Past landslides — training labels for the ranking.',
    status: 'Import pending.',
    labels: ['validation-pending'],
  },
  {
    source: 'NASA LHASA',
    gives: 'Global landslide hazard nowcast — the baseline to compare against.',
    status: 'Comparison pending.',
    labels: ['validation-pending'],
  },
  {
    source: 'Ground sensor nodes',
    gives: 'Soil moisture at two depths, tilt, rainfall, battery and LoRa signal.',
    status: 'Simulated telemetry. Lab test planned.',
    labels: ['simulated', 'lab'],
  },
  {
    source: 'geoBoundaries + Natural Earth',
    gives: 'Coastline, rivers and administrative boundaries for the base map.',
    status: 'Real data, bundled so the map works offline.',
    labels: [],
  },
]

export const REAL: readonly string[] = [
  'NISAR pass dates, tracks and products for both areas (NASA CMR catalog).',
  'The July 2026 event facts: 412.3 mm on 7 July, and reported deaths (press, BMD).',
  'Coastline, rivers and administrative boundaries on the base map.',
  'Hill locality names and the two monitored areas.',
]

export const SIMULATED: readonly string[] = [
  'Slope-unit shapes and their exact positions within each locality.',
  'Relative Risk Index values and ranks.',
  'NISAR change footprints.',
  'The GPM rainfall field.',
  'Sensor readings, battery and LoRa values.',
  'Alert thresholds (illustrative, not operational).',
]

export const LIMITS: readonly string[] = [
  'NISAR passes about every 12 days and processed data arrives 36–72 hours later. It says where, not when.',
  'NISAR products are provisional, and monsoon vegetation weakens InSAR coherence.',
  'One event is a small validation sample; results will be presented as a case study with uncertainty.',
  'A soil-tray lab result does not prove field performance.',
]

export const NEXT: readonly string[] = [
  'Run GCOV change detection for both areas and replace the illustrative footprints.',
  'Train the ranking on the Global Landslide Catalog and backtest July 2026 against NASA LHASA.',
  'Pilot 2–3 slopes in the 2027 monsoon with local disaster authorities and camp management.',
]
