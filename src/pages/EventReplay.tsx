import { useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import { Hourglass } from 'lucide-react'
import type { SiteId } from '@/types/domain'
import { useMission } from '@/hooks/useMission'
import { useReplay } from '@/hooks/useReplay'
import { useViewport } from '@/hooks/useViewport'
import { cn } from '@/lib/cn'
import { useLang } from '@/lib/i18n'
import { chromeTop, replayAsideWidth, replayLayout, routeSheetHeight } from '@/lib/layout'
import { panelTransition } from '@/lib/motion'
import { Pill } from '@/components/ui/Pill'
import { SiteSwitch } from '@/components/command/SiteSwitch'
import { ReplayTimeline } from '@/components/replay/ReplayTimeline'
import { KnowledgePanel, ReplaySlopeCard, StoryCaption, ValidationPanel } from '@/components/replay/ReplayPanels'
import { SITE_ORDER } from '@/data/sites'
import { getSlope } from '@/data/slopes'
import { replayMapState } from '@/data/replayEvidence'

const SURFACE = 'rounded-[22px] bg-overlay shadow-overlay ring-1 ring-line backdrop-blur-md'

/**
 * July 2026 event replay — an as-of-time intelligence replay.
 *
 * One clock (useReplay) decides the date; everything shown — map layers,
 * knowledge list, slope card, captions — is a pure function of (site, date)
 * through the hindsight lock in data/replayEvidence.ts.
 */
export default function EventReplay() {
  const { state, dispatch } = useMission()
  const { date } = useReplay()
  const { t } = useLang()
  const { width, height, mode } = useViewport()
  const site = state.site

  // Per-area footprint availability; the map draws only these, only as post-event evidence.
  const footprintSites = useMemo(
    () => SITE_ORDER.filter((s: SiteId) => replayMapState(s, date).footprint),
    [date],
  )
  const fpKey = footprintSites.join(',')
  useEffect(() => {
    dispatch({ type: 'view', view: { kind: 'replay', footprintSites: fpKey ? (fpKey.split(',') as SiteId[]) : [] } })
  }, [dispatch, fpKey])

  const layout = replayLayout(width)
  const top = chromeTop(width) + 12
  const selected = getSlope(state.selectedSlopeId)
  const slope = selected && selected.site === site ? selected : undefined

  const header = (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">{t('replay.eyebrow')}</span>
        <Pill variant="pending" icon={Hourglass}>
          {t('label.validationPending')}
        </Pill>
      </div>
    </div>
  )

  const question = (
    <div>
      <h1 className={cn('font-semibold tracking-[-0.015em] text-balance text-fg', layout === 'sheet' ? 'text-lg leading-snug' : 'text-xl leading-snug')}>
        {t('replay.question')}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-fg/80">{t('replay.lead2')}</p>
    </div>
  )

  const details = (
    <div className="flex flex-col gap-4">
      <ReplaySlopeCard slope={slope} day={date} />
      <KnowledgePanel site={site} day={date} />
      <details className="rounded-2xl bg-elevated/45 ring-1 ring-line">
        <summary className="cursor-pointer list-none px-3.5 py-3 text-sm font-medium text-fg marker:hidden">
          {t('replay.validation')}
          <span className="ml-2 text-xs font-normal text-muted">{t('label.validationPending')}</span>
        </summary>
        <div className="border-t border-line px-3.5 py-3">
          <ValidationPanel />
        </div>
      </details>
    </div>
  )

  if (layout === 'sheet') {
    const sheetH = routeSheetHeight(width, height)
    return (
      <>
        <StoryCaption site={site} day={date} className="inset-x-3" style={{ bottom: sheetH + 12 + 10 }} />
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={panelTransition}
          aria-label={t('replay.title')}
          data-replay-panel="sheet"
          className={cn(SURFACE, 'pointer-events-auto absolute inset-x-0 bottom-0 z-20 overflow-y-auto overscroll-contain rounded-t-[22px] rounded-b-none border-t border-line')}
          style={{ height: sheetH }}
        >
          {/* Sticky: the date and the timeline never scroll away. */}
          <div className="sticky top-0 z-10 rounded-t-[22px] border-b border-hairline bg-surface/[0.98] px-4 pt-3 pb-2">
            <ReplayTimeline site={site} variant="sheet" compact={mode === 'mobile'} />
          </div>
          <div className="flex flex-col gap-4 px-4 pt-4 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {header}
              <SiteSwitch />
            </div>
            {question}
            {details}
          </div>
        </motion.section>
      </>
    )
  }

  const asideW = replayAsideWidth(width)
  return (
    <>
      <StoryCaption site={site} day={date} style={{ top: top + 4, left: 12 + asideW + 24, right: 72 }} />
      <motion.aside
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={panelTransition}
        aria-label={t('replay.title')}
        data-replay-panel="column"
        className={cn(SURFACE, 'pointer-events-auto absolute left-3 z-20 overflow-y-auto overscroll-contain')}
        style={{ top, bottom: 12, width: asideW }}
      >
        {/* Validation status stays in view while the column scrolls. */}
        <div className="sticky top-0 z-10 rounded-t-[14px] border-b border-hairline bg-surface/[0.98] px-5 py-2.5">
          {header}
        </div>
        <div className="flex flex-col gap-5 px-5 pt-4 pb-5">
          {question}
          <SiteSwitch />
          {details}
        </div>
      </motion.aside>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...panelTransition, delay: 0.05 }}
        aria-label={t('replay.timeline')}
        data-replay-panel="dock"
        className={cn(SURFACE, 'pointer-events-auto absolute right-3 bottom-3 z-20 px-4 pt-3 pb-3')}
        style={{ left: 12 + asideW + 12 }}
      >
        <ReplayTimeline site={site} variant="dock" />
      </motion.section>
    </>
  )
}
