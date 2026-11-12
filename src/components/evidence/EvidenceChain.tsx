import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { BrainCircuit, CloudRain, Droplets, Satellite, Scale, Waves, type LucideIcon } from 'lucide-react'
import type { Slope } from '@/types/domain'
import { EVIDENCE_STEPS, type EvidenceState, type EvidenceStep } from '@/lib/alertEngine'
import { ALERT_META } from '@/lib/alertLevels'
import { cn } from '@/lib/cn'
import { formatDate, formatIndex, formatNumber } from '@/lib/formatters'
import { useLang } from '@/lib/i18n'
import { ALERT_THRESHOLDS } from '@/lib/scenarioConfig'
import { toneBg, toneBorder, toneSoft, toneText, type Tone } from '@/lib/tones'
import { getChangeForSlope, primaryPair } from '@/data/nisar'
import { slopeCount } from '@/data/slopes'
import type { SlopeLive } from '@/data/telemetry'
import { isActive, reasonText } from './evidenceText'
import { StatePill } from './StatePill'
import { ProvenanceTag } from '@/components/ui/ProvenanceTag'

const STEP_META: Record<Exclude<EvidenceStep, 'decision'>, { tone: Tone; icon: LucideIcon }> = {
  space: { tone: 'satellite', icon: Satellite },
  environment: { tone: 'satellite', icon: CloudRain },
  terrain: { tone: 'ai', icon: BrainCircuit },
  ground: { tone: 'healthy', icon: Droplets },
  movement: { tone: 'healthy', icon: Waves },
}

const day = (iso: string) => formatDate(`${iso}T00:00:00+06:00`).replace(/ \d{4}$/, '')
const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - Date.parse(`${iso}T00:00:00+06:00`)) / 86_400_000))

/** Rail dot: filled when confirmed, ring when contributing, hollow when observed, faint otherwise. */
function Dot({ state, tone }: { state: EvidenceState; tone: Tone }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative z-10 grid size-[14px] place-items-center rounded-full border-2 bg-canvas transition-colors duration-500',
        state === 'confirmed' && cn(toneBorder[tone], toneBg[tone]),
        state === 'contributing' && toneBorder[tone],
        state === 'observed' && 'border-fg/35',
        state === 'not-triggered' && 'border-fg/15',
        (state === 'stale' || state === 'unavailable') && 'border-dashed border-muted/50',
      )}
    >
      {state === 'contributing' ? <span className={cn('size-[5px] rounded-full', toneBg[tone])} /> : null}
    </span>
  )
}

/**
 * The connected Evidence Chain: SPACE → ENVIRONMENT → TERRAIN/AI → GROUND →
 * MOVEMENT → DECISION. Every state comes from the alert engine for this frame;
 * rows flash softly when their state changes, so causality is visible as the
 * scenario runs.
 */
export function EvidenceChain({ slope, live }: { slope: Slope; live: SlopeLive }) {
  const { t } = useLang()
  const { decision, reading, node } = live
  const states = decision.evidenceStates
  const change = getChangeForSlope(slope.id)
  const pair = change ?? primaryPair(slope.site)
  const level = ALERT_META[decision.alertLevel]
  const reduced = useReducedMotion()

  // When the status escalates, bring the decision basis into view (it is below the fold on laptops).
  const decisionRef = useRef<HTMLLIElement>(null)
  const lastLevel = useRef(decision.alertLevel)
  useEffect(() => {
    if (lastLevel.current === decision.alertLevel) return
    const escalated = ALERT_META[decision.alertLevel].severity > ALERT_META[lastLevel.current].severity
    lastLevel.current = decision.alertLevel
    if (escalated) decisionRef.current?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
  }, [decision.alertLevel, reduced])

  const content: Record<Exclude<EvidenceStep, 'decision'>, { value: string; meta: string }> = {
    // Footprint = ILLUSTRATIVE; pass = NASA catalog metadata. Never "detected".
    space: {
      value: change ? t('evidence.space.signal') : t('evidence.space.none'),
      meta: pair
        ? t('evidence.space.meta', {
            product: pair.product,
            track: pair.track,
            a: day(pair.before),
            b: day(pair.after),
            d: daysSince(pair.after),
          })
        : t('drawer.nisar.role'),
    },
    environment: {
      value: t('evidence.env.value', { rate: formatNumber(reading.rainRate, 1), r24: formatNumber(reading.rain24h, 0) }),
      meta:
        reading.rainSource === 'gauge' && node
          ? t('drawer.src.gauge', { id: node.id })
          : t('drawer.src.gpmLatency'),
    },
    terrain: {
      value: t('evidence.terrain.value', {
        v: formatIndex(slope.relativeRiskIndex),
        band: t(`band.${slope.riskBand}`),
        r: slope.rank,
        n: slopeCount,
      }),
      meta: t('evidence.terrain.meta'),
    },
    ground:
      reading.soilTop !== undefined && node
        ? {
            value: t('evidence.ground.value', { t: reading.soilTop, d: reading.soilDeep ?? 0 }),
            meta: t('evidence.ground.meta', { thr: ALERT_THRESHOLDS.saturationDeep, id: node.id }),
          }
        : { value: '—', meta: t('evidence.none.meta') },
    movement:
      reading.tiltDelta !== undefined && node
        ? {
            value: t('evidence.move.value', {
              tilt: formatNumber(reading.tiltDelta, 2),
              rate: formatNumber(reading.tiltRate ?? 0, 2),
            }),
            meta: t('evidence.move.meta', { thr: ALERT_THRESHOLDS.movementTilt, id: node.id }),
          }
        : { value: '—', meta: t('evidence.none.meta') },
  }

  return (
    <div>
      <ol aria-label={t('evidence.title')} className="relative">
        {EVIDENCE_STEPS.map((step, i) => {
          const state = states[step]
          const last = i === EVIDENCE_STEPS.length - 1
          const feeds = isActive(state)
          if (step === 'decision') {
            // The chain ends in the rule itself: the decision basis is the final link.
            return (
              <li key={step} ref={decisionRef} className="grid scroll-mb-3 grid-cols-[14px_1fr] gap-x-3">
                <span className="flex justify-center pt-4">
                  <span aria-hidden className={cn('relative z-10 size-[14px] rounded-full', toneBg[level.tone])} />
                </span>
                <DecisionBasis live={live} />
              </li>
            )
          }
          const meta = STEP_META[step]
          const Icon = meta.icon
          return (
            <li key={step} className={cn('relative grid grid-cols-[14px_1fr] gap-x-3', !last && 'pb-1.5')}>
              <span className="relative flex justify-center pt-1">
                <Dot state={state} tone={meta.tone} />
                {/* Connector to the next link: lit while this evidence feeds the decision. */}
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-[19px] -bottom-1 w-[2px] rounded-full transition-colors duration-500',
                    feeds ? 'bg-fg/45' : 'bg-fg/[0.07]',
                  )}
                />
              </span>
              <motion.div
                key={state}
                initial={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                animate={{ backgroundColor: 'rgba(255,255,255,0)' }}
                transition={{ duration: 1.1 }}
                className="-mx-2 -mt-1 min-w-0 rounded-lg px-2 pt-1 pb-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="flex min-w-0 items-center gap-1.5 text-2xs font-medium tracking-[0.08em] uppercase">
                    <Icon size={13} strokeWidth={1.9} aria-hidden className={cn('shrink-0', toneText[meta.tone])} />
                    <span className={cn('whitespace-nowrap', toneText[meta.tone])}>{t(`evidence.step.${step}`)}</span>
                    <span className="truncate tracking-normal text-muted normal-case">· {t(`evidence.what.${step}`)}</span>
                  </p>
                  <StatePill state={state} />
                </div>
                <p className="numeric mt-0.5 flex items-center gap-1.5 text-[13px] leading-5 text-fg">
                  <span className="min-w-0 truncate">{content[step].value}</span>
                  {step === 'space' ? <ProvenanceTag label="illustrative" /> : null}
                </p>
                <p className="flex items-center gap-1.5 text-2xs leading-4 text-muted" title={content[step].meta}>
                  {step === 'space' && pair ? <ProvenanceTag label="nasa" /> : null}
                  <span className="min-w-0 truncate">{content[step].meta}</span>
                </p>
              </motion.div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** The rule, spelled out: which current-condition checks are met, how many independent signals, the result. */
export function DecisionBasis({ live }: { live: SlopeLive }) {
  const { t, lang } = useLang()
  const { decision } = live
  const level = ALERT_META[decision.alertLevel]
  const LevelIcon = level.icon
  const confirming = decision.decisionExplanation === 'warning.confirming'
  const two = decision.independentSignals === 2

  return (
    <motion.section
      key={decision.alertLevel}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      aria-labelledby="basis-title"
      className={cn(
        'mt-1 rounded-xl border px-3.5 py-2.5 transition-colors duration-500',
        toneBorder[level.tone],
        decision.alertLevel !== 'normal' && toneSoft[level.tone],
      )}
    >
      <div className="flex items-center justify-between">
        <h3 id="basis-title" className="text-2xs font-semibold tracking-[0.1em] text-fg uppercase">
          {t('evidence.step.decision')} <span className="font-medium text-muted">· {t('basis.title')}</span>
        </h3>
        <Scale size={14} strokeWidth={1.9} aria-hidden className="text-muted" />
      </div>
      <dl className="mt-1.5">
        {decision.basis.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-3 py-[3px]">
            <dt className="text-sm text-fg/90">{t(`basis.${row.id}`)}</dt>
            <dd>
              <StatePill state={row.state} />
            </dd>
          </div>
        ))}
        <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-fg/10 pt-2">
          <dt className="text-sm text-fg/90">{t('basis.signals')}</dt>
          <dd className={cn('numeric text-sm font-semibold', two ? 'text-fg' : 'text-muted')}>
            {t('basis.signalsValue', { n: decision.independentSignals })}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1">
          <dt className="text-sm text-fg/90">{t('basis.result')}</dt>
          <dd className={cn('flex items-center gap-1.5 text-base font-semibold tracking-[0.06em] uppercase', toneText[level.tone])}>
            <LevelIcon size={16} strokeWidth={2.2} aria-hidden />
            {lang === 'bn' ? level.labelBn : level.label}
          </dd>
        </div>
      </dl>
      {confirming ? (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-2 rounded-lg border border-evacuate/50 bg-evacuate/10 px-2.5 py-1.5 text-center text-xs font-semibold tracking-[0.08em] text-evacuate uppercase"
        >
          {t('basis.revealed')}
        </motion.p>
      ) : null}
      <p className="mt-2 text-sm leading-snug text-fg/90">{reasonText(t, lang, decision)}</p>
      <p className="mt-1.5 text-2xs leading-relaxed text-muted">
        {t('basis.riskNote')} {t('basis.illustrative')}
      </p>
    </motion.section>
  )
}
