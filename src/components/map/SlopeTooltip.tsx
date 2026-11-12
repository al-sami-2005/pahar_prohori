import type { Ref } from 'react'
import type { Slope } from '@/types/domain'
import { cn } from '@/lib/cn'
import { formatIndex } from '@/lib/formatters'
import { useLang } from '@/lib/i18n'
import { RISK_BAND_META } from '@/lib/alertLevels'
import { slopeName } from '@/data/slopes'

interface SlopeTooltipProps {
  ref: Ref<HTMLDivElement>
  slope?: Slope
}

/** Cursor-following hover label; position is written imperatively by the map. */
export function SlopeTooltip({ ref, slope }: SlopeTooltipProps) {
  const { lang, t } = useLang()
  return (
    <div ref={ref} className="pointer-events-none absolute top-0 left-0 z-20 will-change-transform">
      <div className={cn('transition-opacity duration-150', slope ? 'opacity-100' : 'opacity-0')}>
        {slope ? (
          <div className="rounded-md border border-hairline bg-overlay px-2.5 py-2 shadow-overlay">
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <span className="numeric text-2xs text-muted">{slope.id}</span>
              <span className="text-sm font-medium text-fg">{slopeName(slope, lang)}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-xs text-muted">
              <span aria-hidden className={cn('size-2 rounded-[2px]', RISK_BAND_META[slope.riskBand].swatch)} />
              <span>{t('drawer.relativeRisk')}</span>
              <span className="numeric text-fg">{formatIndex(slope.relativeRiskIndex)}</span>
              <span>· {t(`band.${slope.riskBand}`)}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
