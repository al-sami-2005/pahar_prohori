import { useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { Maximize2, Minus, Plus, type LucideIcon } from 'lucide-react'
import { useMission } from '@/hooks/useMission'
import { useScenario } from '@/hooks/useScenario'
import { cn } from '@/lib/cn'
import { formatDistance, niceScale } from '@/lib/geo'
import { useLang } from '@/lib/i18n'
import { useViewport } from '@/hooks/useViewport'
import { chromeTop, deployPanelWidth, drawerWidth, sheetEdge } from '@/lib/layout'
import { Tooltip } from '@/components/ui/Tooltip'

interface MapHudProps {
  map: MapLibreMap
}

function HudButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <Tooltip content={label} side="left">
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className="grid size-10 place-items-center text-muted transition-colors duration-150 hover:bg-fg/[0.06] hover:text-fg"
      >
        <Icon size={16} strokeWidth={1.8} aria-hidden />
      </button>
    </Tooltip>
  )
}

/** Bottom-right instrument cluster: zoom, reset, scale, cursor position, attribution. */
export function MapHud({ map }: MapHudProps) {
  const { state, dispatch } = useMission()
  const scenario = useScenario()
  const { t } = useLang()
  const { width, height, mode } = useViewport()
  const [view, setView] = useState(() => ({ zoom: map.getZoom(), lat: map.getCenter().lat }))
  const coordRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    const onMove = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setView({ zoom: map.getZoom(), lat: map.getCenter().lat }))
    }
    const onPointer = (e: { lngLat: { lat: number; lng: number } }) => {
      const el = coordRef.current
      if (el) el.textContent = `${e.lngLat.lat.toFixed(4)}° N  ${e.lngLat.lng.toFixed(4)}° E`
    }
    map.on('move', onMove)
    map.on('mousemove', onPointer)
    return () => {
      cancelAnimationFrame(raf)
      map.off('move', onMove)
      map.off('mousemove', onPointer)
    }
  }, [map])

  const scale = niceScale(view.lat, view.zoom, 88)
  const kind = state.view.kind
  const drawerOpen = kind === 'mission' && !!state.selectedSlopeId
  const dw = drawerWidth(width)
  const online = state.basemap === 'online'
  const center = map.getCenter()
  // Replay and Deployment dock their own panels along the bottom (or right), so the
  // instrument cluster moves to wherever the map is still clear.
  const topAnchored = kind === 'replay' || (kind === 'deploy' && mode !== 'desktop')

  if (kind === 'method') return null

  // Phones: pinch to zoom; keep only the attribution line (above the toolbar).
  if (mode === 'mobile') {
    return (
      <p
        className="pointer-events-none absolute right-3 z-10 text-right text-[10px] leading-snug text-muted/80 [text-shadow:0_0_4px_var(--color-sea)]"
        style={topAnchored ? { top: chromeTop(width) + 8 } : { bottom: 10 }}
      >
        geoBoundaries · Natural Earth{online ? ' · © OSM' : ''}
      </p>
    )
  }

  // Tablet with the slope sheet (and maybe the scenario bar) up: if the cluster no longer fits
  // between the capsule and the bar, keep only the attribution — pinch-zoom still works.
  const sheetBase = drawerOpen && dw === 0 ? sheetEdge(width, height) + (scenario.active ? 82 : 12) : 0
  const cramped = sheetBase > 0 && height - sheetBase - chromeTop(width) - 16 < 230
  if (cramped) {
    return (
      <p
        className="pointer-events-none absolute right-3 z-10 max-w-[240px] text-right text-[10px] leading-snug text-muted/80 [text-shadow:0_0_4px_var(--color-sea)]"
        style={{ bottom: sheetBase - 6 }}
      >
        geoBoundaries · Natural Earth{online ? ' · © OSM' : ''}
      </p>
    )
  }

  const pos = topAnchored
    ? { right: 12, top: chromeTop(width) + 12 }
    : {
        right: kind === 'deploy' ? deployPanelWidth(width) + 24 : drawerOpen && dw > 0 ? dw + 24 : 12,
        // Tablet sheet: sit above it — and above the scenario bar while a run is on screen.
        bottom: drawerOpen && dw === 0 ? sheetEdge(width, height) + (scenario.active ? 82 : 12) : 12,
      }
  // Cursor readout is a pointer feature: desktop Mission only.
  // (Hidden while the drawer is open: the centred scenario bar needs that width.)
  const showReadout = kind === 'mission' && mode === 'desktop' && !drawerOpen && !scenario.active

  return (
    <div
      className="pointer-events-none absolute z-10 flex flex-col items-end gap-3 transition-[right,bottom] duration-200 ease-out"
      style={pos}
    >
      <div className="pointer-events-auto flex flex-col overflow-hidden rounded-[12px] border border-hairline bg-overlay shadow-overlay backdrop-blur-md">
        <HudButton icon={Plus} label={t('controls.zoomIn')} onClick={() => map.zoomIn({ duration: 250 })} />
        <span className="h-px bg-hairline" aria-hidden />
        <HudButton icon={Minus} label={t('controls.zoomOut')} onClick={() => map.zoomOut({ duration: 250 })} />
        <span className="h-px bg-hairline" aria-hidden />
        <HudButton icon={Maximize2} label={t('controls.reset')} onClick={() => dispatch({ type: 'resetView' })} />
      </div>

      <div className="flex items-end gap-4 text-2xs text-fg/80 [text-shadow:0_0_6px_var(--color-sea)]">
        {showReadout ? (
          <span ref={coordRef} className="numeric tabular-nums">
            {`${center.lat.toFixed(4)}° N  ${center.lng.toFixed(4)}° E`}
          </span>
        ) : null}
        <span className="flex flex-col items-end gap-1">
          <span className="numeric">{formatDistance(scale.meters)}</span>
          <span
            aria-hidden
            className="block h-1.5 border-x border-b border-fg/60"
            style={{ width: `${Math.round(scale.px)}px` }}
          />
        </span>
      </div>

      <p
        className={cn(
          'text-right text-[10.5px] leading-snug text-muted [text-shadow:0_0_6px_var(--color-sea)]',
          mode === 'desktop' ? 'max-w-[420px]' : 'max-w-[200px]',
        )}
      >
        <span className={cn(online ? 'text-healthy' : 'text-fg/85')}>{online ? t('map.online') : t('map.offline')}</span>
        {' · '}geoBoundaries (CC BY 4.0) · Natural Earth
        {online ? ' · © OpenMapTiles © OpenStreetMap contributors' : ''}
        {state.terrain === 'online' ? ' · Terrain: Mapzen/AWS' : ''}
      </p>
    </div>
  )
}
