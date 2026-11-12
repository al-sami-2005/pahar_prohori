import { useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Info } from 'lucide-react'
import { useMission } from '@/hooks/useMission'
import { useViewport } from '@/hooks/useViewport'
import { setDeploymentPrefs, useDeploymentPrefs } from '@/hooks/useDeploymentPrefs'
import { cn } from '@/lib/cn'
import { useLang } from '@/lib/i18n'
import { chromeTop, deployPanelWidth, routeSheetHeight } from '@/lib/layout'
import { fastTransition, panelTransition } from '@/lib/motion'
import { planDeployment, type DeployScope } from '@/lib/deployment'
import { Pill } from '@/components/ui/Pill'
import { LocationHeader } from '@/components/command/LocationHeader'
import { SiteSwitch } from '@/components/command/SiteSwitch'
import { BudgetControl, ScopeControl } from '@/components/deployment/PlanControls'
import { PlanLegend, PlanSummary, PriorityList } from '@/components/deployment/PlanList'
import { WhyThisLocation } from '@/components/deployment/WhyThisLocation'
import { getSlope } from '@/data/slopes'

const SURFACE = 'rounded-[22px] bg-overlay shadow-overlay ring-1 ring-line backdrop-blur-md'

/**
 * Guardian Deployment Planner — a prototype priority ranking, not an optimiser.
 * The plan is a pure function of (budget, scope) over the same slopes and the
 * same Relative Risk Index ranking as Mission Control (lib/deployment.ts).
 */
export default function DeploymentPlanner() {
  const { state, dispatch } = useMission()
  const { t } = useLang()
  const { width, height, mode } = useViewport()
  const { budget, scope } = useDeploymentPrefs()
  const scrollRef = useRef<HTMLElement>(null)

  const plan = useMemo(() => planDeployment(budget, scope), [budget, scope])
  const ids = useMemo(() => plan.items.map((i) => i.slope.id), [plan])
  const existing = useMemo(() => plan.items.filter((i) => i.status === 'existing').map((i) => i.slope.id), [plan])

  // One map, one view: the plan is pushed to the map as ids + status; markers diff in place.
  useEffect(() => {
    dispatch({ type: 'view', view: { kind: 'deploy', ids, existing, hovered: null } })
  }, [dispatch, ids, existing])

  // A single-area scope follows the map's area (and the other way round, see setScope).
  useEffect(() => {
    if (scope !== 'all' && scope !== state.site) setDeploymentPrefs({ scope: state.site })
  }, [scope, state.site])

  const setScope = (next: DeployScope) => {
    setDeploymentPrefs({ scope: next })
    if (next !== 'all' && next !== state.site) dispatch({ type: 'site', site: next })
  }

  const selected = getSlope(state.selectedSlopeId)
  const desktop = mode === 'desktop'
  const scopeLabel = scope === 'all' ? t('deploy.scope.all') : t(`site.short.${scope}`)

  // Opening / closing the explanation starts it at the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [selected?.id])

  const planView = (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">{t('deploy.eyebrow')}</span>
          <Pill variant="simulated" icon={Info}>
            {t('deploy.status')}
          </Pill>
        </div>
        <h1 className="mt-2 text-xl leading-snug font-semibold tracking-[-0.01em] text-fg">
          {t('deploy.question', { n: budget })}
        </h1>
        <p className="mt-2 border-l-2 border-healthy/60 pl-3 text-sm leading-relaxed text-fg/85">{t('deploy.message')}</p>
      </div>

      <BudgetControl value={budget} onChange={(b) => setDeploymentPrefs({ budget: b })} />
      <ScopeControl value={scope} onChange={setScope} />
      {mode === 'mobile' && scope === 'all' ? <SiteSwitch /> : null}

      <PlanSummary plan={plan} scopeLabel={scopeLabel} />

      <section>
        <h2 className="text-md font-semibold text-fg">{t('deploy.list')}</h2>
        <p className="mt-1 mb-2.5 text-xs leading-relaxed text-muted">{t('deploy.listHint')}</p>
        <div>
          <PriorityList plan={plan} showSite={scope === 'all' && mode !== 'mobile'} />
        </div>
      </section>

      <details className="rounded-2xl bg-elevated/45 ring-1 ring-line">
        <summary className="cursor-pointer list-none px-3.5 py-3 text-sm font-medium text-fg marker:hidden">
          {t('deploy.how')}
          <span className="ml-2 text-xs font-normal text-muted">{t('deploy.rankNote')}</span>
        </summary>
        <div className="border-t border-line px-3.5 py-3">
          <PlanLegend />
          <p className="mt-3 text-sm leading-relaxed text-muted">{t('deploy.how.body')}</p>
          <p className="mt-2 text-xs text-muted">{t('deploy.statusNote')}</p>
        </div>
      </details>
    </div>
  )

  const body = (
    <AnimatePresence mode="wait" initial={false}>
      {selected ? (
        <motion.div key="why" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={fastTransition}>
          <WhyThisLocation slope={selected} plan={plan} scope={scope} onBack={() => dispatch({ type: 'select', id: null })} />
        </motion.div>
      ) : (
        <motion.div key="plan" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={fastTransition}>
          {planView}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {mode === 'mobile' ? null : <LocationHeader as="h2" />}
      <motion.aside
        ref={scrollRef}
        initial={desktop ? { opacity: 0, x: 16 } : { opacity: 0, y: 16 }}
        animate={desktop ? { opacity: 1, x: 0 } : { opacity: 1, y: 0 }}
        transition={panelTransition}
        aria-label={t('deploy.eyebrow')}
        data-deploy-panel
        className={cn(SURFACE, 'pointer-events-auto absolute z-20 overflow-y-auto overscroll-contain p-5', desktop ? '' : 'inset-x-0 bottom-0 rounded-t-[22px] rounded-b-none border-t border-line')}
        style={
          desktop
            ? { top: chromeTop(width) + 12, right: 12, bottom: 12, width: deployPanelWidth(width) }
            : { height: routeSheetHeight(width, height) }
        }
      >
        {body}
      </motion.aside>
      <p aria-live="polite" aria-atomic="true" className="sr-only" data-deploy-announce>
        {t('deploy.announceSummary', { n: plan.budget, p: plan.proposed, e: plan.existing })}
      </p>
    </>
  )
}
