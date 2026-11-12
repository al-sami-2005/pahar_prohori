import { useMission } from '@/hooks/useMission'
import { cn } from '@/lib/cn'
import { useLang } from '@/lib/i18n'
import { groundNodes } from '@/data/sensors'
import { getSlope, localityName } from '@/data/slopes'
import { PanelHeader } from './PanelHeader'

export function SensorsPanel() {
  const { state, dispatch } = useMission()
  const { t, lang } = useLang()

  return (
    <div>
      <PanelHeader title={t('sensors.title')} subtitle={t('sensors.subtitle')} />
      <ul className="px-1.5 pb-2">
        {groundNodes.map((node) => {
          const slope = getSlope(node.slopeId)
          const selected = state.selectedSlopeId === node.slopeId
          return (
            <li key={node.id}>
              <button
                type="button"
                onClick={() => dispatch({ type: 'select', id: node.slopeId })}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                  selected ? 'bg-fg/[0.05]' : 'hover:bg-fg/[0.04]',
                )}
              >
                <span aria-hidden className="size-[7px] shrink-0 rounded-full bg-healthy ring-[1.5px] ring-healthy/25" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="numeric text-xs text-fg">{node.id}</span>
                    <span className="truncate text-xs text-muted">
                      {slope ? `${localityName(slope.locality, lang)} · ${slope.id}` : node.slopeId}
                    </span>
                  </span>
                  <span className="numeric mt-0.5 block text-2xs text-muted">
                    {t('sensors.ago', { s: node.lastSeenSec })} · {node.batteryPct}% · {node.rssi} dBm
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
