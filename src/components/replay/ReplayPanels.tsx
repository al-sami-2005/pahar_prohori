import type { CSSProperties, ReactNode } from 'react'
import { CalendarClock, CircleDashed, CloudRain, Lock, Newspaper, Satellite, Scale, Sparkles, X } from 'lucide-react'
import type { SiteId, Slope } from '@/types/domain'
import { useMission } from '@/hooks/useMission'
import { cn } from '@/lib/cn'
import { formatIndex } from '@/lib/formatters'
import { useLang, type I18nKey } from '@/lib/i18n'
import { candidatesFor, scopeRank } from '@/lib/deployment'
import { ProvenanceTag } from '@/components/ui/ProvenanceTag'
import { getChangeForSlope } from '@/data/nisar'
import { slopeName } from '@/data/slopes'
import {
  BACKTEST_CUTOFF,
  BACKTEST_RANKING,
  evidenceFor,
  knowledgeAt,
  storyCaption,
  type EvidenceKind,
  type EvidenceRole,
  type ReplayEvidence,
} from '@/data/replayEvidence'
import { KnowledgeChip } from './KnowledgeChip'
import { dayShort, evidenceTitle, evidenceWindow } from './evidenceLabel'

const KIND_ICON: Record<EvidenceKind, typeof Satellite> = {
  'nisar-pass': Satellite,
  footprint: CircleDashed,
  'rain-report': CloudRain,
  'impact-report': Newspaper,
}

const ROLE_TITLE: Record<EvidenceRole, I18nKey> = {
  input: 'replay.known.inputs',
  'event-record': 'replay.known.record',
  validation: 'replay.known.validation',
}

function EvidenceRow({ e, day }: { e: ReplayEvidence; day: string }) {
  const { t } = useLang()
  const state = knowledgeAt(e, day)
  const locked = state === 'not-yet'
  const Icon = locked ? Lock : KIND_ICON[e.kind]
  const tags = e.provenance.filter((p) => !(p === 'post-event' && state === 'post-event'))
  // NISAR: acquisition ≠ availability — the window is disclosed under the chip.
  const window = evidenceWindow(t, e)
  return (
    <li
      data-evidence={e.id}
      data-state={state}
      className={cn('grid grid-cols-[1.75rem_1fr] gap-x-2.5 py-2 transition-opacity duration-300', locked && 'opacity-60')}
    >
      <span
        className={cn(
          'mt-0.5 grid size-7 place-items-center rounded-lg',
          locked ? 'border border-dashed border-line-strong text-muted' : 'bg-fg/[0.05] text-fg/85',
        )}
      >
        <Icon size={13} strokeWidth={1.9} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm leading-snug text-fg">{evidenceTitle(t, e, day)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <KnowledgeChip state={state} />
          {locked ? null : tags.map((p) => <ProvenanceTag key={p} label={p} />)}
        </div>
        {window && !locked ? (
          <p className="mt-1 text-2xs leading-relaxed text-fg/75 tabular-nums" data-window>
            {window}
          </p>
        ) : null}
        {locked ? (
          <p className="mt-1 text-xs leading-relaxed text-muted">{t('replay.availableFrom', { date: dayShort(e.availableAt) })}</p>
        ) : (
          <p className="mt-1 text-xs leading-relaxed text-muted">{t(e.why, e.vars)}</p>
        )}
      </div>
    </li>
  )
}

/** The prototype backtest ranking: labelled as a simulated placeholder, never as observed evidence. */
function RankingNote() {
  const { t } = useLang()
  return (
    <div className="mt-3 rounded-lg border border-dashed border-line-strong px-3 py-2.5" data-ranking-note>
      <h3 className="flex items-center gap-1.5 text-sm leading-snug text-fg">
        <Sparkles size={13} strokeWidth={1.9} aria-hidden className="shrink-0 text-ai" />
        {t(BACKTEST_RANKING.title)}
      </h3>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {BACKTEST_RANKING.provenance.map((p) => (
          <ProvenanceTag key={p} label={p} />
        ))}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">{t(BACKTEST_RANKING.why)}</p>
    </div>
  )
}

/** "What the system knew on {date}" — every item gated by its conservative availability. */
export function KnowledgePanel({ site, day }: { site: SiteId; day: string }) {
  const { t } = useLang()
  const items = evidenceFor(site)
  const available = items.filter((e) => ['available', 'post-event'].includes(knowledgeAt(e, day))).length
  const frozen = day >= BACKTEST_CUTOFF
  const roles: EvidenceRole[] = ['input', 'event-record', 'validation']
  return (
    <section aria-labelledby="known-title" data-knowledge-panel>
      <div className="rounded-xl bg-elevated/60 p-3.5">
        <h2 id="known-title" className="text-md font-semibold text-fg">
          {t('replay.known.title', { date: dayShort(day) })}
        </h2>
        <p className="mt-1 text-sm text-muted">{t('replay.knownCount', { n: available, total: items.length })}</p>
        <p className="mt-2 text-xs leading-relaxed text-fg/80">
          {frozen ? t('replay.frozen') : t('replay.live')}
        </p>
      </div>

      <RankingNote />

      <details className="mt-3 rounded-xl border border-line bg-surface">
        <summary className="cursor-pointer list-none px-3.5 py-3 text-sm font-medium text-fg marker:hidden">
          {t('replay.showDetails')}
          <span className="ml-2 text-xs font-normal text-muted">NASA passes · event record · validation evidence</span>
        </summary>
        <div className="border-t border-line px-3.5 pb-3">
          {roles.map((role) => {
            const group = items.filter((e) => e.role === role)
            if (!group.length) return null
            return (
              <div key={role} className="mt-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-1">
                  <h3 className="text-xs font-medium text-fg/85">{t(ROLE_TITLE[role])}</h3>
                  {role === 'input' ? (
                    <span className={cn('text-2xs', frozen ? 'text-fg/80' : 'text-satellite')}>
                      {frozen ? t('replay.frozen') : t('replay.live')}
                    </span>
                  ) : null}
                </div>
                <ul>
                  {group.map((e) => (
                    <EvidenceRow key={e.id} e={e} day={day} />
                  ))}
                </ul>
              </div>
            )
          })}
          <ul className="mt-3 flex flex-col gap-1.5 text-xs leading-relaxed text-muted">
            <li data-latency-note>{t('replay.latencyNote')}</li>
            <li>{t('replay.noNodes')}</li>
            <li>{t('replay.noLandslides')}</li>
          </ul>
        </div>
      </details>
    </section>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-start gap-x-3 py-1.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="flex flex-wrap items-center gap-1.5 text-sm text-fg">{children}</dd>
    </div>
  )
}

/** The selected slope as of the replay date: pre-event rank always; later evidence only once it exists. */
export function ReplaySlopeCard({ slope, day }: { slope: Slope | undefined; day: string }) {
  const { t, lang } = useLang()
  const { dispatch } = useMission()
  if (!slope) {
    return <p className="rounded-xl border border-dashed border-line-strong px-3.5 py-2.5 text-xs leading-relaxed text-muted">{t('replay.slope.hint')}</p>
  }
  const rank = scopeRank(slope.id, slope.site) ?? slope.rank
  const n = candidatesFor(slope.site).length
  const fp = evidenceFor(slope.site).find((e) => e.kind === 'footprint')
  const fpState = fp ? knowledgeAt(fp, day) : 'not-yet'
  const hasChange = !!getChangeForSlope(slope.id)
  return (
    <section className="rounded-xl border border-hairline bg-fg/[0.03] px-3.5 pt-2.5 pb-2" data-replay-slope={slope.id} aria-labelledby="replay-slope-title">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted">{t('replay.slope.title', { date: dayShort(day) })}</p>
          <h2 id="replay-slope-title" className="mt-0.5 truncate text-sm font-semibold text-fg">
            {slopeName(slope, lang)} <span className="numeric font-normal text-muted">· {slope.id}</span>
          </h2>
        </div>
        <button
          type="button"
          aria-label={t('why.close')}
          onClick={() => dispatch({ type: 'select', id: null })}
          className="-mr-1.5 grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg"
        >
          <X size={15} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <dl className="mt-1.5">
        <Fact label={t('replay.slope.rank')}>
          <span className="numeric">{t('replay.slope.rankValue', { r: rank, n, v: formatIndex(slope.relativeRiskIndex) })}</span>
          {BACKTEST_RANKING.provenance.map((p) => (
            <ProvenanceTag key={p} label={p} />
          ))}
        </Fact>
        <Fact label={t('replay.slope.footprint')}>
          {fpState === 'not-yet' ? (
            <>
              <span className="text-fg/80">{t('replay.slope.fpNotYet', { date: fp ? dayShort(fp.availableAt) : '—' })}</span>
              <KnowledgeChip state="not-yet" />
            </>
          ) : fpState === 'processing' || fpState === 'possible' ? (
            <>
              <span className="text-fg/80">{t('replay.slope.fpProcessing', { date: fp?.acquiredAt ? dayShort(fp.acquiredAt) : '—' })}</span>
              <KnowledgeChip state={fpState} />
            </>
          ) : hasChange ? (
            <>
              <span>{t('replay.slope.fpPost')}</span>
              <KnowledgeChip state="post-event" />
            </>
          ) : (
            <span className="text-fg/80">{t('replay.slope.fpNone')}</span>
          )}
        </Fact>
        <Fact label={t('replay.slope.node')}>
          <span className="text-fg/80">{t('replay.slope.nodeNone')}</span>
        </Fact>
        <Fact label={t('replay.slope.report')}>
          <span className="text-fg/80">{t('replay.slope.reportNone')}</span>
        </Fact>
      </dl>
    </section>
  )
}

function MetricRow({ label, q }: { label: I18nKey; q: I18nKey }) {
  const { t, lang } = useLang()
  return (
    <li className="border-t border-hairline py-2.5 first:border-t-0" data-metric={label}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-fg">{t(label)}</span>
        <span
          className={cn(
            'label-micro inline-flex h-5 items-center rounded-xs border border-dashed border-line-strong px-1.5 whitespace-nowrap text-fg/80',
            lang === 'bn' && 'font-sans tracking-normal normal-case text-[11.5px]',
          )}
        >
          {t('val.notMeasured')}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">{t(q)}</p>
    </li>
  )
}

/** Validation: the questions the backtest will answer — no numbers until it runs. */
export function ValidationPanel() {
  const { t } = useLang()
  return (
    <section aria-labelledby="val-title" data-validation-panel>
      <div className="flex items-center justify-between gap-2">
        <h2 id="val-title" className="flex items-center gap-2 text-md font-semibold text-fg">
          <Scale size={15} strokeWidth={1.9} aria-hidden className="text-muted" />
          {t('val.title')}
        </h2>
        <ProvenanceTag label="validation-pending" />
      </div>
      <ul className="mt-2 rounded-xl border border-dashed border-line-strong px-3.5">
        <MetricRow label="val.hit" q="val.hit.q" />
        <MetricRow label="val.fa" q="val.fa.q" />
        <MetricRow label="val.lhasa" q="val.lhasa.q" />
      </ul>
      <p className="mt-2 text-xs leading-relaxed text-muted">{t('val.needs')}</p>

      <div className="mt-4 rounded-xl border border-hairline bg-fg/[0.03] p-3.5" data-lhasa>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-fg">{t('lhasa.title')}</h3>
          <ProvenanceTag label="validation-pending" />
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-fg/85">{t('lhasa.body')}</p>
        <p className="mt-1.5 text-xs text-muted">{t('lhasa.status')}</p>
      </div>
    </section>
  )
}

/** One-line story caption over the map, derived from the replay date (never its own timer). */
export function StoryCaption({ site, day, className, style }: { site: SiteId; day: string; className?: string; style?: CSSProperties }) {
  const { t } = useLang()
  const cap = storyCaption(site, day)
  const text = t(cap.key, cap.vars)
  const post = day >= BACKTEST_CUTOFF
  return (
    <div className={cn('pointer-events-none absolute z-10 flex justify-center', className)} style={style} data-story={cap.key}>
      {/* Keyed by caption: a new moment fades in; rapid scrubbing can never leave it blank. */}
      <p
        key={text}
        className="caption-in flex max-w-full items-start gap-2 rounded-[18px] border border-hairline bg-overlay px-3.5 py-1.5 text-sm leading-snug text-fg shadow-overlay backdrop-blur-md"
      >
          {post ? (
            <CalendarClock size={14} strokeWidth={1.9} aria-hidden className="mt-[3px] shrink-0 text-fg/70" />
          ) : (
            <Satellite size={14} strokeWidth={1.9} aria-hidden className="mt-[3px] shrink-0 text-satellite" />
          )}
          <span className="numeric mt-[1px] shrink-0 text-xs text-muted">{dayShort(day)}</span>
          <span className="min-w-0">{text}</span>
      </p>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {text}
      </p>
    </div>
  )
}
