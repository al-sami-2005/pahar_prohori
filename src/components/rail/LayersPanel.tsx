import type { ReactNode } from 'react'
import { useMission } from '@/hooks/useMission'
import { cn } from '@/lib/cn'
import { useLang, type I18nKey } from '@/lib/i18n'
import { formatDate } from '@/lib/formatters'
import { LAYERS, type LayerId } from '@/data/mapLayers'
import { primaryPair } from '@/data/nisar'
import { PanelHeader } from './PanelHeader'

/** Tiny visual key that mirrors how the layer draws on the map. */
function LayerKey({ id }: { id: LayerId }) {
  const keys: Record<LayerId, ReactNode> = {
    risk: (
      <span className="flex h-2.5 w-4 overflow-hidden rounded-[2px]">
        <span className="flex-1 bg-risk-low" />
        <span className="flex-1 bg-risk-moderate" />
        <span className="flex-1 bg-risk-high" />
        <span className="flex-1 bg-risk-critical" />
      </span>
    ),
    nisar: (
      <span
        className="block h-2.5 w-4 rounded-[2px] border border-satellite/80"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgb(43 120 153 / 0.58) 0 1px, transparent 1px 4px)',
        }}
      />
    ),
    gpm: <span className="block h-2.5 w-4 rounded-[2px] bg-linear-to-r from-satellite/5 to-satellite/40" />,
    sensors: (
      <span className="grid h-2.5 w-4 place-items-center">
        <span className="size-[7px] rounded-full bg-healthy ring-[1.5px] ring-canvas" />
      </span>
    ),
    landslides: (
      <span className="grid h-2.5 w-4 place-items-center">
        <span className="size-[7px] rotate-45 border border-muted/60" />
      </span>
    ),
    terrain: (
      <span className="block h-2.5 w-4 rounded-[2px] bg-linear-to-br from-muted/50 via-muted/10 to-transparent" />
    ),
  }
  return <span aria-hidden>{keys[id]}</span>
}

function MiniToggle({ on, disabled }: { on: boolean; disabled: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex h-3 w-[22px] shrink-0 items-center rounded-full transition-colors duration-150',
        disabled ? 'bg-fg/[0.04]' : on ? 'bg-satellite/85' : 'bg-fg/[0.12]',
      )}
    >
      <span
        className={cn(
          'absolute size-2 rounded-full transition-transform duration-150 ease-out',
          on && !disabled ? 'translate-x-[12px] bg-canvas' : 'translate-x-[2px] bg-muted/80',
          disabled && 'bg-faint/60',
        )}
      />
    </span>
  )
}

export function LayersPanel() {
  const { state, dispatch } = useMission()
  const { t } = useLang()

  const pair = primaryPair(state.site)
  const day = (iso: string) => formatDate(`${iso}T00:00:00+06:00`).replace(/ \d{4}$/, '')
  const metaVars = (id: LayerId) => (id === 'nisar' && pair ? { a: day(pair.before), b: day(pair.after) } : undefined)

  const metaFor = (id: LayerId, fallback: I18nKey): I18nKey => {
    if (id !== 'terrain') return fallback
    if (state.terrain === 'online') return 'layer.terrain.meta.online'
    if (state.terrain === 'offline') return 'layer.terrain.meta.offline'
    return 'layer.terrain.meta.loading'
  }

  return (
    <div>
      <PanelHeader title={t('rail.layers')} />
      <ul className="px-1.5 pb-1.5">
        {LAYERS.map((layer) => {
          const unavailable = !layer.available || (layer.id === 'terrain' && state.terrain === 'offline')
          const on = state.layers[layer.id] && !unavailable
          return (
            <li key={layer.id}>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-disabled={unavailable || undefined}
                onClick={() => !unavailable && dispatch({ type: 'layer', id: layer.id, on: !state.layers[layer.id] })}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors duration-150',
                  unavailable ? 'cursor-default' : 'hover:bg-fg/[0.04]',
                )}
              >
                <LayerKey id={layer.id} />
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-sm', on ? 'text-fg' : 'text-muted')}>{t(layer.label)}</span>
                  <span className={cn('block truncate text-2xs', unavailable ? 'text-faint' : 'text-muted')}>
                    {t(metaFor(layer.id, layer.meta), metaVars(layer.id))}
                  </span>
                </span>
                <MiniToggle on={on} disabled={unavailable} />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
