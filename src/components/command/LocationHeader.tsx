import { MapPin } from 'lucide-react'
import { useMission } from '@/hooks/useMission'
import { useResidentWarning } from '@/hooks/useResidentWarning'
import { useTour } from '@/hooks/useTour'
import { useViewport } from '@/hooks/useViewport'
import { cn } from '@/lib/cn'
import { useLang } from '@/lib/i18n'
import { chromeTop } from '@/lib/layout'
import { SITES } from '@/data/sites'
import { SiteSwitch } from './SiteSwitch'

/**
 * Location context without a dashboard card. Desktop gets a small map title;
 * phones get only the familiar location selector so the map remains the hero.
 */
export function LocationHeader({ as: Heading = 'h1' }: { as?: 'h1' | 'h2' }) {
  const { state } = useMission()
  const warning = useResidentWarning()
  const tour = useTour()
  const { t } = useLang()
  const { width, mode } = useViewport()
  const site = SITES[state.site]
  const mobile = mode === 'mobile'
  const hidden = tour.active || state.focus || (mobile && (!!state.tool || !!state.selectedSlopeId)) || (warning.expanded && !mobile)

  return (
    <div
      className={cn(
        'pointer-events-none absolute left-3 z-20 transition-all duration-200',
        hidden ? '-translate-y-1 opacity-0' : 'translate-y-0 opacity-100',
      )}
      style={{ top: chromeTop(width) + 10 }}
      inert={hidden}
    >
      {mobile ? (
        <div className="pointer-events-auto">
          <SiteSwitch compact />
        </div>
      ) : (
        <div className="flex items-end gap-3">
          <div className="pb-0.5 [text-shadow:0_1px_2px_rgb(255_255_255/0.9)]">
            <Heading className="text-[25px] font-bold tracking-[-0.025em] text-fg">{t(`site.${site.id}`)}</Heading>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-muted">
              <MapPin size={13} strokeWidth={2} aria-hidden className="text-accent" />
              {t('location.summary', { n: site.slopeCount, m: site.instrumentedCount })}
            </p>
          </div>
          <div className="pointer-events-auto">
            <SiteSwitch compact />
          </div>
        </div>
      )}
    </div>
  )
}
