import { ChevronDown, MapPin } from 'lucide-react'
import { useMission } from '@/hooks/useMission'
import { cn } from '@/lib/cn'
import { useLang } from '@/lib/i18n'
import { SITE_ORDER } from '@/data/sites'

/** Compact place selector modelled after familiar map/location controls. */
export function SiteSwitch({ className, showLabel = false, compact = false }: { className?: string; showLabel?: boolean; compact?: boolean }) {
  const { state, dispatch } = useMission()
  const { t } = useLang()
  return (
    <label className={cn('inline-flex items-center gap-2', className)}>
      {showLabel ? <span className="text-xs font-semibold text-muted">{t('site.switch')}</span> : <span className="sr-only">{t('site.switch')}</span>}
      <span className="relative inline-flex">
        <MapPin size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-accent" />
        <select
          value={state.site}
          onChange={(e) => dispatch({ type: 'site', site: e.target.value as typeof state.site })}
          aria-label={t('site.switch')}
          className={cn(
            'appearance-none border border-line bg-surface pr-8 pl-8 font-semibold text-fg shadow-sm outline-none transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-accent/25',
            compact ? 'h-10 min-w-[150px] rounded-xl text-sm' : 'h-11 min-w-[164px] rounded-xl text-sm',
          )}
        >
          {SITE_ORDER.map((id) => <option key={id} value={id}>{t(`site.short.${id}`)}</option>)}
        </select>
        <ChevronDown size={15} aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted" />
      </span>
    </label>
  )
}
