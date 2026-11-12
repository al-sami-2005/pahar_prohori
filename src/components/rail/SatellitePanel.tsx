import { useMission } from '@/hooks/useMission'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/formatters'
import { useLang } from '@/lib/i18n'
import { NISAR_PAIRS } from '@/data/nisar'
import { PanelHeader } from './PanelHeader'

const day = (iso: string) => formatDate(`${iso}T00:00:00+06:00`).replace(/ \d{4}$/, '')

/** Real catalog metadata (from the team's CMR query) — the one fully "NASA DATA" panel. */
export function SatellitePanel() {
  const { state } = useMission()
  const { t } = useLang()
  const pairs = [...NISAR_PAIRS].sort((a, b) => (a.site === state.site ? -1 : 0) - (b.site === state.site ? -1 : 0))

  return (
    <div>
      <PanelHeader title={t('sat.title')} subtitle={t('sat.subtitle')} />
      <ul className="px-4 pb-1">
        {pairs.map((p) => (
          <li
            key={`${p.site}-${p.track}-${p.product}-${p.after}`}
            className={cn(
              'grid grid-cols-[1fr_auto] gap-x-3 border-t border-hairline py-2 first:border-t-0',
              p.site !== state.site && 'opacity-55',
            )}
          >
            <span className="min-w-0">
              <span className="block text-sm text-fg">{t(`site.short.${p.site}`)}</span>
              <span className="numeric block text-2xs text-muted">
                T{p.track} · {p.direction === 'ascending' ? 'asc' : 'desc'}
              </span>
            </span>
            <span className="text-right">
              <span className="numeric block text-xs text-fg">
                {day(p.before)} → {day(p.after)}
              </span>
              <span className="numeric block text-2xs text-satellite/80">{p.product}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mx-4 mb-3.5 border-t border-hairline pt-2.5 text-2xs leading-relaxed text-muted">
        <p>
          <span className="text-satellite/85">NASA data</span> · {t('sat.source')}
        </p>
        <p className="mt-1">{t('sat.gap')}</p>
      </div>
    </div>
  )
}
