import { useMission } from '@/hooks/useMission'
import { cn } from '@/lib/cn'
import { formatIndex } from '@/lib/formatters'
import { useLang } from '@/lib/i18n'
import { slopeName, slopes } from '@/data/slopes'
import { PanelHeader } from './PanelHeader'

/** Top of the relative ranking for the current area. */
export function RiskPanel() {
  const { state, dispatch } = useMission()
  const { t, lang } = useLang()
  const list = slopes.filter((s) => s.site === state.site).slice(0, 8)

  return (
    <div>
      <PanelHeader title={t('risk.title')} subtitle={t('risk.subtitle')} />
      <ol className="px-1.5 pb-2">
        {list.map((s) => {
          const selected = state.selectedSlopeId === s.id
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => dispatch({ type: 'select', id: s.id })}
                className={cn(
                  'grid w-full grid-cols-[1.75rem_1fr_auto] items-center gap-x-2 rounded-lg px-2.5 py-1.5 text-left transition-colors',
                  selected ? 'bg-fg/[0.05]' : 'hover:bg-fg/[0.04]',
                )}
              >
                <span className="numeric text-2xs text-faint">#{s.rank}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-fg">{slopeName(s, lang)}</span>
                  <span className="mt-1 block h-[3px] overflow-hidden rounded-full bg-fg/[0.06]">
                    <span
                      className="block h-full rounded-full bg-ai/70"
                      style={{ width: `${Math.round(s.relativeRiskIndex * 100)}%` }}
                    />
                  </span>
                </span>
                <span className="numeric text-xs text-fg">{formatIndex(s.relativeRiskIndex)}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
