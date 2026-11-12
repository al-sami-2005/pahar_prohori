import { useState, type ReactNode } from 'react'
import {
  BrainCircuit,
  ChevronRight,
  CloudRain,
  Crosshair,
  Droplets,
  Layers,
  Megaphone,
  Move,
  Play,
  RadioTower,
  RotateCcw,
  Satellite,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { AlertLevel, DataProvenance, RiskBand } from '@/types/domain'
import { AlertBadge } from '@/components/alerts/AlertBadge'
import { Button } from '@/components/ui/Button'
import { ConfidenceMeter } from '@/components/ui/ConfidenceMeter'
import { IconButton } from '@/components/ui/IconButton'
import { IllustrativeNote } from '@/components/ui/IllustrativeNote'
import { Metric } from '@/components/ui/Metric'
import { Panel } from '@/components/ui/Panel'
import { ProvenanceTag } from '@/components/ui/ProvenanceTag'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatusDot } from '@/components/ui/StatusDot'
import { Switch } from '@/components/ui/Switch'
import { ALERT_META, ALERT_ORDER, RISK_BAND_META, RISK_BAND_ORDER } from '@/lib/alertLevels'
import { cn } from '@/lib/cn'
import { formatCoord, formatTimestamp, toBengaliDigits } from '@/lib/formatters'
import { PROVENANCE_META, type ProvenanceLabel } from '@/lib/provenance'
import { toneBg, toneText, type Tone } from '@/lib/tones'

/**
 * Dev/QA specimen for M1. Every sample value on this page is simulated.
 */

const SAMPLE: DataProvenance = { kind: 'simulated', source: 'Design-system specimen' }
const SAMPLE_TIME = '2026-07-07T08:30:00Z'

const THESIS: Array<{
  step: string
  question: string
  body: string
  token: string
  tone: Tone
  icon: LucideIcon
}> = [
  {
    step: 'Space',
    question: 'Where is the ground changing?',
    body: 'NISAR L-band SAR · GCOV change · GUNW interferograms',
    token: '--color-satellite',
    tone: 'satellite',
    icon: Satellite,
  },
  {
    step: 'AI',
    question: 'How likely, relative to other slopes?',
    body: 'Relative Risk Index · GPM IMERG · NASADEM · Landslide Catalog',
    token: '--color-ai',
    tone: 'ai',
    icon: BrainCircuit,
  },
  {
    step: 'Ground',
    question: 'When are conditions escalating?',
    body: 'ESP32 nodes · soil moisture ×2 · tilt · rain gauge · LoRa',
    token: '--color-healthy',
    tone: 'healthy',
    icon: RadioTower,
  },
  {
    step: 'Human action',
    question: 'What should people do now?',
    body: 'Watch → Warning → Evacuate · siren · Bengali alert',
    token: '--color-watch / warning / evacuate',
    tone: 'warning',
    icon: Megaphone,
  },
]

const SURFACES = [
  { name: 'canvas', hex: '#F5F7FA', className: 'bg-canvas' },
  { name: 'surface', hex: '#FFFFFF', className: 'bg-surface' },
  { name: 'elevated', hex: '#EEF3F7', className: 'bg-elevated' },
  { name: 'raised', hex: '#E4EBF1', className: 'bg-raised' },
] as const

const PROVENANCE_ORDER: ProvenanceLabel[] = [
  'nasa',
  'derived',
  'simulated',
  'lab',
  'stale',
  'validation-pending',
  'prototype-backtest',
  'illustrative',
]

type Budget = '5' | '10' | '25' | '50'

/** Width of a band on the 0–1 index scale, from its own and the next band's lower bound. */
function bandWidth(band: RiskBand): number {
  const i = RISK_BAND_ORDER.indexOf(band)
  const next = RISK_BAND_ORDER[i + 1]
  const upper = next ? RISK_BAND_META[next].min : 1
  return upper - RISK_BAND_META[band].min
}

function Section({
  index,
  title,
  description,
  children,
}: {
  index: number
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="grid grid-cols-12 gap-x-8 border-t border-line pt-8 first:border-t-0 first:pt-0">
      <div className="col-span-12 mb-6 lg:col-span-3 lg:mb-0">
        <SectionLabel index={index}>{title}</SectionLabel>
        {description ? <p className="mt-2 max-w-xs text-sm text-muted">{description}</p> : null}
      </div>
      <div className="col-span-12 lg:col-span-9">{children}</div>
    </section>
  )
}

export default function DesignSystem() {
  const [budget, setBudget] = useState<Budget>('10')
  const [layers, setLayers] = useState({ nisar: true, risk: true, sensors: true, hillshade: false })
  const [level, setLevel] = useState<AlertLevel>('warning')

  return (
    <div className="min-h-full bg-canvas">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-end justify-between gap-6 px-10 pt-10 pb-8">
          <div>
            <p className="label-micro text-muted">
              Pahar Prohori · <span lang="bn">পাহাড় প্রহরী</span> · The Hill Guardian
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.02em]">Design system</h1>
            <p className="mt-3 max-w-xl text-lg text-muted">
              Tokens and primitives for an Earth-observation emergency intelligence command center.
              Calm by default — urgency comes from state, not decoration.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ProvenanceTag label="simulated" />
            <span className="label-micro text-muted">M1 · Foundation · dev reference</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] space-y-12 px-10 pt-10 pb-24">
        {/* 01 — Thesis */}
        <Section
          index={1}
          title="Thesis layers"
          description="Each layer of SPACE → AI → GROUND → HUMAN ACTION owns one hue, so the map reads as the chain itself."
        >
          <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
            {THESIS.map((layer, i) => {
              const Icon = layer.icon
              return (
                <li key={layer.step} className="relative flex flex-col gap-3 bg-surface p-5">
                  {layer.step === 'Human action' ? (
                    <span aria-hidden className="absolute inset-x-0 top-0 flex h-0.5">
                      <span className="flex-1 bg-watch" />
                      <span className="flex-1 bg-warning" />
                      <span className="flex-1 bg-evacuate" />
                    </span>
                  ) : (
                    <span aria-hidden className={cn('absolute inset-x-0 top-0 h-0.5', toneBg[layer.tone])} />
                  )}
                  <div className="flex items-center justify-between">
                    <span className={cn('label-micro', toneText[layer.tone])}>
                      {String(i + 1).padStart(2, '0')} · {layer.step}
                    </span>
                    <Icon size={16} strokeWidth={1.75} aria-hidden className={toneText[layer.tone]} />
                  </div>
                  <p className="text-lg font-medium text-fg">{layer.question}</p>
                  <p className="text-xs text-muted">{layer.body}</p>
                  <p className="numeric mt-auto pt-2 text-[11px] text-faint">{layer.token}</p>
                  {i < THESIS.length - 1 ? (
                    <ChevronRight
                      size={16}
                      aria-hidden
                      className="absolute top-1/2 -right-2 z-10 hidden -translate-y-1/2 rounded-full bg-canvas text-muted md:block"
                    />
                  ) : null}
                </li>
              )
            })}
          </ol>
        </Section>

        {/* 02 — Surfaces + text */}
        <Section index={2} title="Surfaces & text" description="Four surface steps. Hairlines, not shadows, separate regions.">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {SURFACES.map((s) => (
              <div key={s.name} className="overflow-hidden rounded-lg border border-line">
                <div className={cn('h-20', s.className)} />
                <div className="flex items-center justify-between border-t border-line bg-surface px-3 py-2">
                  <span className="text-sm">{s.name}</span>
                  <span className="numeric text-xs text-muted">{s.hex}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-8 gap-y-2 rounded-lg border border-line bg-surface px-4 py-3">
            <span className="text-base text-fg">fg · primary text</span>
            <span className="text-base text-muted">muted · secondary text (7:1)</span>
            <span className="text-base text-faint">faint · decorative only</span>
          </div>
        </Section>

        {/* 03 — Alert states */}
        <Section
          index={3}
          title="Alert states"
          description="Never colour alone: icon + state name + Bengali. Red is reserved for EVACUATE."
        >
          <div className="overflow-hidden rounded-lg border border-line">
            {ALERT_ORDER.map((lvl) => {
              const meta = ALERT_META[lvl]
              return (
                <div
                  key={lvl}
                  className="grid grid-cols-12 items-center gap-4 border-b border-line bg-surface px-4 py-3 last:border-b-0"
                >
                  <div className="col-span-12 md:col-span-4">
                    <AlertBadge level={lvl} bilingual />
                  </div>
                  <p className="col-span-12 text-sm text-muted md:col-span-4">{meta.criteria}</p>
                  <div className="col-span-12 md:col-span-4">
                    <p className="text-sm text-fg">{meta.action}</p>
                    <p lang="bn" className="text-sm text-muted">
                      {meta.actionBn}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <AlertBadge level="watch" size="sm" />
            <AlertBadge level="warning" size="md" />
            <AlertBadge level="evacuate" size="lg" bilingual />
            <AlertBadge level="evacuate" size="lg" bilingual solid />
            <span className="text-xs text-muted">sm · md · lg (breathing) · solid banner</span>
          </div>
        </Section>

        {/* 04 — Relative Risk Index */}
        <Section
          index={4}
          title="Relative Risk Index"
          description="AI layer. A ranking of slopes against each other — never shown as a probability or percentage."
        >
          <div className="rounded-lg border border-line bg-surface p-4">
            <div className="flex h-3 overflow-hidden rounded-sm">
              {RISK_BAND_ORDER.map((band) => (
                <div
                  key={band}
                  className={cn('h-full', RISK_BAND_META[band].swatch)}
                  style={{ flexGrow: bandWidth(band) }}
                />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {RISK_BAND_ORDER.map((band) => (
                <div key={band} className="flex items-center gap-2">
                  <span aria-hidden className={cn('size-2.5 rounded-xs', RISK_BAND_META[band].swatch)} />
                  <span className="text-sm">{RISK_BAND_META[band].label}</span>
                  <span className="numeric text-xs text-muted">≥ {RISK_BAND_META[band].min.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs text-muted">
              <ProvenanceTag label="validation-pending" />
              Band cut-points are display bands for a ranking, not calibrated failure probabilities.
            </div>
          </div>
        </Section>

        {/* 05 — Provenance */}
        <Section
          index={5}
          title="Data provenance"
          description="Every value carries its origin. Dashed outline = not a measurement."
        >
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
            {PROVENANCE_ORDER.map((label) => (
              <div key={label} className="flex items-start gap-3">
                <ProvenanceTag label={label} className="mt-0.5" />
                <p className="text-sm text-muted">{PROVENANCE_META[label].description}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* 06 — Typography */}
        <Section
          index={6}
          title="Typography"
          description="Geist for UI, JetBrains Mono for telemetry and IDs, Noto Sans Bengali for local warnings."
        >
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 space-y-5 md:col-span-7">
              <p className="text-3xl font-medium tracking-[-0.02em] text-fg">
                Satellites know <span className="text-satellite">where</span>. AI knows{' '}
                <span className="text-ai">how likely</span>. The sensor knows{' '}
                <span className="text-healthy">when</span>.
              </p>
              <p className="max-w-lg text-base text-muted">
                Body copy stays short and plain. Technical provenance is available on demand, never in
                the way of the alert.
              </p>
              <div className="rounded-md border border-line bg-surface px-4 py-3">
                <p className="label-micro text-muted">Telemetry · mono</p>
                <p className="numeric mt-1.5 text-sm text-fg">
                  CTG-S03 · {formatCoord(22.3569, 91.7932)} · {formatTimestamp(SAMPLE_TIME)}
                </p>
                <p className="numeric mt-1 text-sm text-muted">RRI 0.84 · tilt Δ 0.42° · LoRa −97 dBm</p>
              </div>
            </div>
            <div className="col-span-12 md:col-span-5">
              <div className="w-full max-w-[340px] rounded-lg border border-evacuate/50 bg-evacuate/8 p-4">
                <div className="flex items-center justify-between gap-2">
                  <AlertBadge level="evacuate" size="sm" bilingual />
                  <ProvenanceTag label="simulated" />
                </div>
                <p lang="bn" className="mt-3 text-lg font-semibold text-fg">
                  জরুরি সতর্কবার্তা — পাহাড় প্রহরী
                </p>
                <p lang="bn" className="mt-1.5 text-base text-fg/90">
                  টানা ভারী বৃষ্টিতে পাহাড়ের মাটি প্রায় সম্পূর্ণ ভিজে গেছে এবং ঢালে নড়াচড়া শনাক্ত
                  হয়েছে। দেরি না করে এখনই নিকটবর্তী আশ্রয়কেন্দ্রে চলে যান।
                </p>
                <p lang="bn" className="mt-3 text-sm text-muted">
                  বৃষ্টিপাত (২৪ ঘণ্টা): {toBengaliDigits('186.4')} মিমি
                </p>
                <p className="mt-2 text-xs text-muted">Wrapping test · 340 px card</p>
              </div>
            </div>
          </div>
        </Section>

        {/* 07 — Controls */}
        <Section index={7} title="Controls" description="Accent is reserved for the single primary CTA on screen.">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="lg" icon={Play}>
                Run Monsoon Scenario
              </Button>
              <Button icon={RotateCcw}>Restart</Button>
              <Button variant="ghost" icon={Layers}>
                Layers
              </Button>
              <Button variant="danger" size="sm">
                Preview evacuation alert
              </Button>
              <Button disabled>Disabled</Button>
              <span className="mx-1 h-6 w-px bg-line" aria-hidden />
              <IconButton icon={Crosshair} label="Recenter map" />
              <IconButton icon={Layers} label="Layers" active />
              <IconButton icon={X} label="Close panel" size="sm" />
            </div>

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-5">
                <p className="label-micro mb-2 text-muted">Sensor budget</p>
                <SegmentedControl<Budget>
                  label="Sensor budget"
                  value={budget}
                  onChange={setBudget}
                  options={[
                    { value: '5', label: '5' },
                    { value: '10', label: '10' },
                    { value: '25', label: '25' },
                    { value: '50', label: '50' },
                  ]}
                />
                <p className="mt-2 text-xs text-muted">
                  Selected: <span className="numeric text-fg">{budget}</span> nodes
                </p>

                <p className="label-micro mt-6 mb-2 text-muted">Preview state</p>
                <SegmentedControl<AlertLevel>
                  label="Preview alert state"
                  size="sm"
                  value={level}
                  onChange={setLevel}
                  options={ALERT_ORDER.map((l) => ({ value: l, label: ALERT_META[l].label }))}
                />
                <div className="mt-3">
                  <AlertBadge level={level} bilingual />
                </div>
              </div>

              <div className="col-span-12 md:col-span-7">
                <Panel eyebrow="Map" title="Layers" floating className="max-w-sm" bodyClassName="px-2 py-2">
                  <Switch
                    checked={layers.nisar}
                    onCheckedChange={(v) => setLayers((s) => ({ ...s, nisar: v }))}
                    label="NISAR Change"
                    hint="GCOV before/after · Space"
                    tone="satellite"
                    leading={<span className="block size-3 rounded-xs border border-satellite bg-satellite/25" />}
                  />
                  <Switch
                    checked={layers.risk}
                    onCheckedChange={(v) => setLayers((s) => ({ ...s, risk: v }))}
                    label="AI Relative Risk"
                    hint="Slope ranking · AI"
                    tone="ai"
                    leading={
                      <span className="flex h-3 w-3 overflow-hidden rounded-xs">
                        <span className="flex-1 bg-risk-low" />
                        <span className="flex-1 bg-risk-high" />
                        <span className="flex-1 bg-risk-critical" />
                      </span>
                    }
                  />
                  <Switch
                    checked={layers.sensors}
                    onCheckedChange={(v) => setLayers((s) => ({ ...s, sensors: v }))}
                    label="Sensor nodes"
                    hint="ESP32 · LoRa · Ground"
                    tone="healthy"
                    leading={<StatusDot tone="healthy" size="md" className="m-0.5" />}
                  />
                  <Switch
                    checked={layers.hillshade}
                    onCheckedChange={(v) => setLayers((s) => ({ ...s, hillshade: v }))}
                    label="Terrain hillshade"
                    hint="Basemap"
                    tone="neutral"
                    leading={<span className="block size-3 rounded-xs bg-linear-to-br from-muted/60 to-canvas" />}
                  />
                </Panel>
              </div>
            </div>
          </div>
        </Section>

        {/* 08 — Metrics */}
        <Section
          index={8}
          title="Metrics & status"
          description="Tabular mono digits so values never jitter while the scenario updates."
        >
          <Panel
            eyebrow="Slope intelligence · sample"
            title="CTG-S03 · sample slope"
            actions={<IconButton icon={X} label="Close sample panel" size="sm" />}
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
              <Metric label="Rain · 24 h" icon={CloudRain} value="186.4" unit="mm" provenance={SAMPLE} />
              <Metric
                label="Topsoil"
                icon={Droplets}
                value="92"
                unit="% sat."
                tone="warning"
                provenance={SAMPLE}
              />
              <Metric label="Deep soil" icon={Droplets} value="88" unit="% sat." tone="warning" provenance={SAMPLE} />
              <Metric label="Tilt Δ" icon={Move} value="0.42" unit="°" tone="evacuate" provenance={SAMPLE} />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-line pt-4">
              <Metric label="Relative Risk Index" value="0.84" size="lg" tone="ai" hint="Rank 3 of 64 · sample" />
              <div className="flex flex-col gap-2">
                <ConfidenceMeter confidence="high" />
                <ConfidenceMeter confidence="medium" />
                <ConfidenceMeter confidence="low" />
              </div>
              <ul className="flex flex-col gap-2 text-xs">
                <li className="flex items-center gap-2">
                  <StatusDot tone="healthy" pulse /> <span className="text-fg">Node online</span>
                </li>
                <li className="flex items-center gap-2">
                  <StatusDot tone="watch" /> <span className="text-fg">LoRa link fair</span>
                </li>
                <li className="flex items-center gap-2">
                  <StatusDot tone="neutral" /> <span className="text-muted">Offline · last seen 3 h ago</span>
                </li>
              </ul>
            </div>
          </Panel>
          <IllustrativeNote className="mt-4 max-w-xl">
            Attached to every invented rule or threshold, e.g. the saturation level that moves a slope from
            WATCH to WARNING in the demo scenario.
          </IllustrativeNote>
        </Section>
      </main>
    </div>
  )
}
