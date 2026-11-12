import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Crosshair, Layers, Menu, RadioTower, Satellite, Search, TrendingUp, type LucideIcon } from 'lucide-react'
import { useMission, type Tool } from '@/hooks/useMission'
import { useViewport } from '@/hooks/useViewport'
import { useTour } from '@/hooks/useTour'
import { cn } from '@/lib/cn'
import { useLang, type I18nKey } from '@/lib/i18n'
import { chromeTop } from '@/lib/layout'
import { panelTransition } from '@/lib/motion'
import { slopes } from '@/data/slopes'
import { Tooltip } from '@/components/ui/Tooltip'
import { LayersPanel } from './LayersPanel'
import { RiskPanel } from './RiskPanel'
import { SatellitePanel } from './SatellitePanel'
import { SearchPanel } from './SearchPanel'
import { SensorsPanel } from './SensorsPanel'

interface ToolDef {
  id: Tool
  icon: LucideIcon
  label: I18nKey
}

const MORE_TOOLS: ToolDef[] = [
  { id: 'search', icon: Search, label: 'rail.search' },
  { id: 'sensors', icon: RadioTower, label: 'rail.sensors' },
  { id: 'risk', icon: TrendingUp, label: 'rail.risk' },
  { id: 'satellite', icon: Satellite, label: 'rail.satellite' },
]

function topSlopeId(site: string): string | undefined {
  return slopes.find((s) => s.site === site)?.id
}

function ToolPanel({ tool }: { tool: Tool }) {
  return (
    <>
      {tool === 'layers' ? <LayersPanel /> : null}
      {tool === 'search' ? <SearchPanel /> : null}
      {tool === 'sensors' ? <SensorsPanel /> : null}
      {tool === 'risk' ? <RiskPanel /> : null}
      {tool === 'satellite' ? <SatellitePanel /> : null}
    </>
  )
}

function MoreMenu({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useMission()
  const { t } = useLang()
  const topId = topSlopeId(state.site)
  const target = state.selectedSlopeId ?? topId
  return (
    <div className="p-2">
      {MORE_TOOLS.map((tool) => {
        const Icon = tool.icon
        const active = state.tool === tool.id
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => {
              dispatch({ type: 'setTool', tool: tool.id })
              onClose()
            }}
            className={cn(
              'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors',
              active ? 'bg-elevated text-fg' : 'text-fg hover:bg-elevated/75',
            )}
          >
            <Icon size={18} className={active ? 'text-accent' : 'text-muted'} aria-hidden />
            {t(tool.label)}
          </button>
        )
      })}
      <div className="my-1 border-t border-line" />
      <button
        type="button"
        disabled={!target}
        onClick={() => {
          if (!target) return
          if (!state.selectedSlopeId) dispatch({ type: 'select', id: target })
          dispatch({ type: 'focus', on: true })
          onClose()
        }}
        className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-fg transition-colors hover:bg-elevated disabled:opacity-50"
      >
        <Crosshair size={18} className="text-muted" aria-hidden />
        {t('rail.focus')}
      </button>
    </div>
  )
}

function DesktopControl({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium shadow-sm transition-colors',
        active ? 'border-accent/25 bg-accent text-white' : 'border-line bg-surface text-fg hover:border-line-strong hover:bg-elevated',
      )}
    >
      <Icon size={17} strokeWidth={1.9} aria-hidden />
      {label}
    </button>
  )
}

function MobileControl({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <Tooltip content={label} side="left">
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          'grid size-11 place-items-center rounded-xl border shadow-float transition-colors',
          active ? 'border-accent/25 bg-accent text-white' : 'border-line bg-surface/97 text-fg hover:bg-elevated',
        )}
      >
        <Icon size={20} strokeWidth={1.9} aria-hidden />
      </button>
    </Tooltip>
  )
}

/**
 * Two familiar map controls stay visible: Layers and Tools. Search lives in the
 * main header. Secondary scientific controls are progressively disclosed.
 */
export function MissionRail() {
  const { state, dispatch } = useMission()
  const { t } = useLang()
  const { width, mode } = useViewport()
  const tour = useTour()
  const [moreOpen, setMoreOpen] = useState(false)
  const mobile = mode === 'mobile'
  const activeMore = state.tool === 'search' || state.tool === 'sensors' || state.tool === 'risk' || state.tool === 'satellite' || state.focus

  const openTool = (tool: Tool) => {
    setMoreOpen(false)
    dispatch({ type: 'tool', tool })
  }

  if (mobile) {
    return (
      <>
        <AnimatePresence>
          {state.tool ? (
            <motion.div
              key={state.tool}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12, transition: { duration: 0.12 } }}
              transition={panelTransition}
              className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 max-h-[52vh] overflow-y-auto rounded-t-[22px] bg-surface shadow-overlay ring-1 ring-line"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <span aria-hidden className="mx-auto mt-2 block h-1 w-10 rounded-full bg-fg/15" />
              <ToolPanel tool={state.tool} />
            </motion.div>
          ) : null}
          {moreOpen ? (
            <motion.div
              key="more"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
              transition={panelTransition}
              className="pointer-events-auto absolute top-[122px] right-3 z-30 w-[250px] overflow-hidden rounded-2xl bg-surface shadow-overlay ring-1 ring-line"
            >
              <MoreMenu onClose={() => setMoreOpen(false)} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {!tour.active ? (
          <div id="map-tools" className="pointer-events-auto absolute top-[78px] right-3 z-20 flex flex-col gap-2">
            <MobileControl icon={Layers} label={t('rail.layers')} active={state.tool === 'layers'} onClick={() => openTool('layers')} />
            <MobileControl
              icon={Menu}
              label={t('nav.menu')}
              active={moreOpen || activeMore}
              onClick={() => {
                dispatch({ type: 'setTool', tool: null })
                setMoreOpen((v) => !v)
              }}
            />
          </div>
        ) : <span id="map-tools" />}
      </>
    )
  }

  const top = chromeTop(width) + 88
  return (
    <div id="map-tools" className="pointer-events-none absolute left-3 z-20 flex items-start gap-2" style={{ top }}>
      <div className="pointer-events-auto flex items-center gap-2">
        <DesktopControl icon={Layers} label={t('rail.layers')} active={state.tool === 'layers'} onClick={() => openTool('layers')} />
        <div className="relative">
          <DesktopControl
            icon={Menu}
            label={t('nav.menu')}
            active={moreOpen || activeMore}
            onClick={() => {
              dispatch({ type: 'setTool', tool: null })
              setMoreOpen((v) => !v)
            }}
          />
          <AnimatePresence>
            {moreOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
                transition={panelTransition}
                className="absolute top-[calc(100%+8px)] left-0 w-[250px] overflow-hidden rounded-2xl bg-surface shadow-overlay ring-1 ring-line"
              >
                <MoreMenu onClose={() => setMoreOpen(false)} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {state.tool ? (
          <motion.div
            key={state.tool}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4, transition: { duration: 0.12 } }}
            transition={panelTransition}
            className="pointer-events-auto w-[310px] overflow-hidden rounded-2xl bg-surface shadow-overlay ring-1 ring-line"
          >
            <ToolPanel tool={state.tool} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
