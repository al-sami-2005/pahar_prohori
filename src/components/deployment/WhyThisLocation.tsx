import type { ReactNode } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import type { Slope } from '@/types/domain'
import { cn } from '@/lib/cn'
import { formatDeg, formatIndex } from '@/lib/formatters'
import { useLang } from '@/lib/i18n'
import { RISK_BAND_META } from '@/lib/alertLevels'
import { candidatesFor, scopeRank, type DeploymentPlan, type DeployScope } from '@/lib/deployment'
import { ProvenanceTag } from '@/components/ui/ProvenanceTag'
import { getChangeForSlope } from '@/data/nisar'
import { slopeName } from '@/data/slopes'
import { PlanBadge } from './PlanList'

function Step({ label, children, tag, last = false }: { label: string; children: ReactNode; tag?: ReactNode; last?: boolean }) {
  return (
    <li className="relative grid grid-cols-[14px_1fr] gap-x-3">
      {/* The reasoning reads as one sequence: a thin rail joins the steps. */}
      <span aria-hidden className="relative flex justify-center">
        <span className="mt-[7px] size-[7px] rounded-full border border-healthy/70 bg-canvas" />
        {last ? null : <span className="absolute top-[16px] bottom-[-6px] w-px bg-hairline" />}
      </span>
      <div className="pb-3">
        <p className="text-xs text-muted">{label}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg">
          {children}
          {tag}
        </div>
      </div>
    </li>
  )
}

/**
 * "Why this location?" — the planner's reasoning for one slope, as a compact
 * sequence. Only the Relative Risk Index orders the list; everything else is
 * context. Never presented as an optimal placement.
 */
export function WhyThisLocation({
  slope,
  plan,
  scope,
  onBack,
}: {
  slope: Slope
  plan: DeploymentPlan
  scope: DeployScope
  onBack: () => void
}) {
  const { t, lang } = useLang()
  // A slope outside a single-site scope is explained against the all-sites ranking.
  const effScope: DeployScope = scope === 'all' || scope === slope.site ? scope : 'all'
  const rank = scopeRank(slope.id, effScope) ?? slope.rank
  const n = candidatesFor(effScope).length
  const item = plan.items.find((i) => i.slope.id === slope.id)
  const change = getChangeForSlope(slope.id)
  const scopeLabel = effScope === 'all' ? t('deploy.scope.all') : t(`site.short.${effScope}`)
  const rec = item ? (item.status === 'existing' ? 'why.rec.existing' : 'why.rec.proposed') : 'why.rec.outside'

  const reasons: string[] = [t('why.r.rank', { r: rank, n, scope: scopeLabel })]
  if (item) reasons.push(t('why.r.top', { n: plan.budget }))
  reasons.push(slope.sensorId ? t('why.r.hasNode', { id: slope.sensorId }) : t('why.r.noNode'))
  if (change) reasons.push(t('why.r.nisar'))

  return (
    <section aria-labelledby="why-title" data-why={slope.id}>
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-muted transition-colors hover:bg-fg/[0.05] hover:text-fg"
      >
        <ArrowLeft size={15} strokeWidth={1.9} aria-hidden />
        {t('why.back')}
      </button>

      <p className="mt-3 text-xs text-muted">{t('why.title')}</p>
      <div className="mt-1.5 flex items-center gap-2.5">
        {item ? <PlanBadge n={item.position} status={item.status} /> : null}
        <h2 id="why-title" className="text-md font-semibold text-fg" data-why-heading>
          {item ? t('why.priority', { n: item.position }) : t('why.outside', { r: rank })}
        </h2>
      </div>
      <p className="mt-1 text-sm text-fg/90">
        {slopeName(slope, lang)} <span className="numeric text-muted">· {slope.id}</span>
      </p>

      <ol className="mt-4">
        <Step label={t('why.rri')} tag={<ProvenanceTag label="simulated" />}>
          <span className="numeric font-medium">{formatIndex(slope.relativeRiskIndex)}</span>
          <span aria-hidden className="block h-[3px] w-16 overflow-hidden rounded-full bg-fg/[0.07]">
            <span className="block h-full rounded-full bg-ai" style={{ width: `${slope.relativeRiskIndex * 100}%` }} />
          </span>
        </Step>
        <Step label={t('why.band')}>
          <span aria-hidden className={cn('size-2.5 rounded-[3px]', RISK_BAND_META[slope.riskBand].swatch)} />
          {t(`band.${slope.riskBand}`)}
          <span className="text-muted">· {t('why.rankValue', { r: rank, n })}</span>
        </Step>
        <Step label={t('why.nisar')} tag={change ? <ProvenanceTag label="illustrative" /> : undefined}>
          {change ? t('why.nisar.yes') : <span className="text-fg/80">{t('why.nisar.no')}</span>}
        </Step>
        <Step label={t('why.slope')} tag={<ProvenanceTag label="simulated" />}>
          <span className="numeric">{formatDeg(slope.slopeDegrees, 0)}</span>
        </Step>
        <Step label={t('why.node')} last tag={slope.sensorId ? <ProvenanceTag label="simulated" /> : undefined}>
          {slope.sensorId ? t('why.node.existing', { id: slope.sensorId }) : <span className="text-fg/80">{t('why.node.none')}</span>}
        </Step>
      </ol>

      <div
        className={cn(
          'mt-1 rounded-xl border px-3.5 py-3',
          item ? 'border-healthy/35 bg-healthy/[0.06]' : 'border-dashed border-line-strong bg-fg/[0.025]',
        )}
      >
        <p className="text-xs text-muted">{t('why.rec')}</p>
        <p className="mt-1 text-sm leading-snug text-fg" data-why-rec={item?.status ?? 'outside'}>
          {t(rec, { r: rank })}
        </p>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-fg">{t('why.why')}</h3>
      <ul className="mt-2 flex flex-col gap-1.5">
        {reasons.map((r) => (
          <li key={r} className="flex gap-2 text-sm leading-snug text-fg/85">
            <Check size={14} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0 text-healthy" />
            {r}
          </li>
        ))}
      </ul>
      <p className="mt-3.5 text-xs leading-relaxed text-muted">{t('why.caveat')}</p>
    </section>
  )
}
