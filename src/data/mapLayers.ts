/**
 * Operational layers the user can toggle. Order = order in the Layers panel
 * (thesis order: AI → SPACE → ENVIRONMENT → GROUND → history → base).
 */
import type { I18nKey } from '@/lib/i18n'

export type LayerId = 'risk' | 'nisar' | 'gpm' | 'sensors' | 'landslides' | 'terrain'

export interface LayerMeta {
  id: LayerId
  label: I18nKey
  meta: I18nKey
  defaultOn: boolean
  /** Unavailable layers are listed (honest empty state) but cannot be enabled. */
  available: boolean
}

export const LAYERS: readonly LayerMeta[] = [
  { id: 'risk', label: 'layer.risk', meta: 'layer.risk.meta', defaultOn: true, available: true },
  { id: 'nisar', label: 'layer.nisar', meta: 'layer.nisar.meta', defaultOn: true, available: true },
  { id: 'gpm', label: 'layer.gpm', meta: 'layer.gpm.meta', defaultOn: false, available: true },
  { id: 'sensors', label: 'layer.sensors', meta: 'layer.sensors.meta', defaultOn: true, available: true },
  { id: 'landslides', label: 'layer.landslides', meta: 'layer.landslides.meta', defaultOn: false, available: false },
  { id: 'terrain', label: 'layer.terrain', meta: 'layer.terrain.meta.online', defaultOn: true, available: true },
]

export type LayerVisibility = Record<LayerId, boolean>

export const DEFAULT_LAYERS: LayerVisibility = Object.fromEntries(
  LAYERS.map((l) => [l.id, l.defaultOn]),
) as LayerVisibility
