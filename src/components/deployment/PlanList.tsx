import { useEffect, useRef, type ReactNode } from 'react'
import { RadioTower } from 'lucide-react'
import { useMission } from '@/hooks/useMission'
import { cn } from '@/lib/cn'
import { formatIndex } from '@/lib/formatters'
import { useLang, type I18nKey } from '@/lib/i18n'
import type { DeploymentPlan, PlanStatus } from '@/lib/deployment'
import { slopeName } from '@/data/slopes'

/** The list's twin of the map marker: outline = proposed, solid = existing simulated node. */
export function PlanBadge({ n, status, className }: { n: number | string; status: PlanStatus; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'numeric grid h-[22px] min-w-[22px] shrink-0 place-items-center rounded-full border-[1.5px] border-healthy px-1 text-[11px] leading-none font-bold',
        status === 'existing' ? 'bg-healthy text-white' : 'bg-canvas/80 text-healthy',
        className,
      )}
    >
      {n}
    </span>
  )
}

/** Translate `key` with {n} rendered as an emphasised number. */
function Counted({ k, n }: { k: I18nKey; n: number }) {
  const { t } = useLang()
  const [before, after] = t(k, { n: '\u0001' }).split('\u0001')
  return (
    <>
      {before}
      <span className="numeric font-semibold text-fg">{n}</span>
      {after}
    </>
  )
}

export function PlanSummary({ plan, scopeLabel }: { plan: DeploymentPlan; scopeLabel: string }) {
  const { t } = useLang()
  const row = (children: ReactNode, glyph: ReactNode, id: string) => (
    <li className="flex items-start gap-2.5 text-sm text-muted" data-sum={id}>
      <span className="grid h-[18px] w-[22px] shrink-0 place-items-center">{glyph}</span>
      <span>{children}</span>
    </li>
  )
  return (
    <div>
      <ul className="flex flex-col gap-1.5" aria-label={t('deploy.eyebrow')}>
        {row(<Counted k="deploy.sum.nodes" n={plan.budget} />, <RadioTower size={14} strokeWidth={1.9} className="text-muted" aria-hidden />, 'nodes')}
        {row(
          <>
            <Counted k="deploy.sum.selected" n={plan.items.length} />
            {plan.scope === 'all' ? (
              <span className="block text-xs text-muted" data-sum-split>
                {t('deploy.sum.split', {
                  c: plan.items.filter((i) => i.slope.site === 'chattogram').length,
                  u: plan.items.filter((i) => i.slope.site === 'ukhiya-teknaf').length,
                })}
              </span>
            ) : null}
          </>,
          <span aria-hidden className="h-2.5 w-3.5 rounded-[3px] border-[1.5px] border-healthy/80" />,
          'selected',
        )}
        {row(<Counted k="deploy.sum.existing" n={plan.existing} />, <span aria-hidden className="size-3 rounded-full border-[1.5px] border-healthy bg-healthy" />, 'existing')}
        {row(<Counted k="deploy.sum.proposed" n={plan.proposed} />, <span aria-hidden className="size-3 rounded-full border-[1.5px] border-healthy" />, 'proposed')}
      </ul>
      {plan.exhausted ? (
        <p className="mt-2.5 rounded-lg border border-dashed border-line-strong px-3 py-2 text-xs leading-relaxed text-fg/85" data-exhausted>
          {t('deploy.sum.exhausted', { n: plan.candidates, scope: scopeLabel, m: plan.unassigned })}
        </p>
      ) : null}
    </div>
  )
}

export function PlanLegend() {
  const { t } = useLang()
  return (
    <div className="flex flex-col gap-1.5 text-xs text-muted">
      <span className="flex items-center gap-2">
        <PlanBadge n="4" status="proposed" />
        {t('deploy.legend.proposed')}
      </span>
      <span className="flex items-center gap-2">
        <PlanBadge n="3" status="existing" />
        {t('deploy.legend.existing')}
      </span>
      <span className="flex items-center gap-2">
        <span aria-hidden className="grid w-[22px] place-items-center">
          <span className="size-[9px] rounded-full bg-healthy shadow-[0_0_0_2px_var(--color-canvas),0_0_0_3px_rgb(8_119_90/0.34)]" />
        </span>
        {t('deploy.legend.outside')}
      </span>
    </div>
  )
}

/**
 * Priority list. Row number = map marker number. Hovering or focusing a row
 * highlights its marker and outline; hovering a marker highlights (and reveals) the row.
 */
export function PriorityList({ plan, showSite }: { plan: DeploymentPlan; showSite: boolean }) {
  const { state, dispatch } = useMission()
  const { t, lang } = useLang()
  const hovered = state.view.kind === 'deploy' ? state.view.hovered : null
  const listRef = useRef<HTMLOListElement>(null)

  // A marker hovered on the map scrolls its row into view (rows hovered directly are already visible).
  useEffect(() => {
    if (!hovered) return
    const row = listRef.current?.querySelector<HTMLElement>(`[data-row="${hovered}"]`)
    if (row && !row.matches(':hover')) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [hovered])

  return (
    <ol ref={listRef} className="flex flex-col" aria-label={t('deploy.list')}>
      {plan.items.map((item) => {
        const s = item.slope
        const active = hovered === s.id
        const statusKey = item.status === 'existing' ? 'deploy.row.existing' : 'deploy.row.proposed'
        return (
          <li key={s.id}>
            <button
              type="button"
              data-row={s.id}
              data-position={item.position}
              data-status={item.status}
              data-active={active || undefined}
              onClick={() => dispatch({ type: 'select', id: s.id })}
              onMouseEnter={() => dispatch({ type: 'deployHover', id: s.id })}
              onMouseLeave={() => dispatch({ type: 'deployHover', id: null })}
              onFocus={() => dispatch({ type: 'deployHover', id: s.id })}
              onBlur={() => dispatch({ type: 'deployHover', id: null })}
              aria-label={t('deploy.rowLabel', {
                n: item.position,
                name: slopeName(s, lang),
                id: s.id,
                v: formatIndex(s.relativeRiskIndex),
                status: t(statusKey),
              })}
              className={cn(
                'relative grid min-h-12 w-full grid-cols-[1.75rem_1fr_auto] items-center gap-x-3 rounded-lg px-2 py-2 text-left transition-colors duration-150',
                active ? 'bg-fg/[0.07]' : 'hover:bg-fg/[0.04]',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'absolute inset-y-2 left-0 w-[2px] rounded-full bg-healthy transition-opacity duration-150',
                  active ? 'opacity-100' : 'opacity-0',
                )}
              />
              <PlanBadge n={item.position} status={item.status} />
              <span className="min-w-0">
                <span className="block truncate text-sm text-fg">{slopeName(s, lang)}</span>
                <span className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted">
                  <span className="numeric shrink-0">{s.id}</span>
                  {showSite ? <span className="truncate">{t(`site.short.${s.site}`)}</span> : null}
                  <span className={cn('flex shrink-0 items-center gap-1', item.status === 'existing' ? 'text-healthy' : 'text-fg/75')}>
                    {item.status === 'existing' ? <RadioTower size={11} strokeWidth={2} aria-hidden /> : null}
                    {t(statusKey)}
                  </span>
                </span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <span className="numeric text-sm text-fg">{formatIndex(s.relativeRiskIndex)}</span>
                <span aria-hidden className="block h-[3px] w-12 overflow-hidden rounded-full bg-fg/[0.07]">
                  <span className="block h-full rounded-full bg-ai" style={{ width: `${s.relativeRiskIndex * 100}%` }} />
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
