import { useState, type ReactNode } from 'react'
import { CircleHelp, KeyRound } from 'lucide-react'
import { useMission } from '@/hooks/useMission'
import { useScenario } from '@/hooks/useScenario'
import { setPrefs } from '@/hooks/usePrefs'
import { useViewport } from '@/hooks/useViewport'
import { cn } from '@/lib/cn'
import { useLang } from '@/lib/i18n'
import { Tooltip } from '@/components/ui/Tooltip'

const HATCH = {
  backgroundImage: 'repeating-linear-gradient(135deg, rgb(43 120 153 / 0.62) 0 1px, transparent 1px 4px)',
}

function Row({ keyEl, children }: { keyEl: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex w-10 shrink-0 justify-center" aria-hidden>
        {keyEl}
      </span>
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-sm text-fg">{children}</span>
    </li>
  )
}

/** Map key panel — only keys for layers that are on the map right now. */
export function MapLegend() {
  const { state } = useMission()
  const scenario = useScenario()
  const { t } = useLang()
  const { mode, width } = useViewport()
  const [open, setOpen] = useState(false)
  const { layers } = state

  const selected = !!state.selectedSlopeId
  if (mode === 'mobile') return null
  // M8 simple UX: the legend is always one click away instead of permanently occupying map space.
  if (mode === 'desktop' && scenario.active && selected && width < 1280) return null
  const collapsible = true
  const showPanel = open

  const panel = (
    <section
      aria-label={t('key.title')}
      className={cn(
        'pointer-events-auto w-[248px] rounded-[14px] border border-hairline bg-overlay p-3 shadow-overlay backdrop-blur-md transition-opacity duration-300',
        state.focus && 'opacity-60 hover:opacity-100',
      )}
    >
      <header className="mb-2.5 flex items-center justify-between">
        <h2 className="text-sm font-medium text-fg">{t('key.title')}</h2>
        <Tooltip content={t('key.help')} side="top">
          <button
            type="button"
            onClick={() => setPrefs({ onboardingDismissed: false })}
            aria-label={t('key.help')}
            className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg"
          >
            <CircleHelp size={16} strokeWidth={1.8} aria-hidden />
          </button>
        </Tooltip>
      </header>
      <ul className="flex flex-col gap-2">
        {layers.risk ? (
          <Row
            keyEl={
              <span className="flex h-2 w-full overflow-hidden rounded-full">
                <span className="flex-1 bg-risk-low" />
                <span className="flex-1 bg-risk-moderate" />
                <span className="flex-1 bg-risk-high" />
                <span className="flex-1 bg-risk-critical" />
              </span>
            }
          >
            {t('legend.risk')}
            <span className="text-xs text-muted">
              {t('legend.low')} → {t('legend.critical')}
            </span>
          </Row>
        ) : null}
        {layers.nisar ? (
          <Row keyEl={<span className="block h-3 w-5 rounded-[3px] border border-satellite" style={HATCH} />}>
            {t('legend.nisar')}
            <span className="text-xs text-muted">{t('legend.nisar.note')}</span>
          </Row>
        ) : null}
        {layers.gpm ? (
          <Row keyEl={<span className="block h-2 w-full rounded-full bg-linear-to-r from-satellite/10 to-satellite/60" />}>
            {t('legend.gpm')}
            <span className="text-xs text-muted">GPM · sim</span>
          </Row>
        ) : null}
        {layers.sensors ? (
          <Row keyEl={<span className="size-[9px] rounded-full bg-healthy ring-2 ring-canvas" />}>{t('legend.node')}</Row>
        ) : null}
      </ul>
    </section>
  )

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-col items-start gap-2">
      {showPanel ? panel : null}
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="pointer-events-auto flex h-10 items-center gap-2 rounded-xl border border-hairline bg-overlay px-3 text-sm text-fg shadow-overlay backdrop-blur-md"
        >
          <KeyRound size={15} strokeWidth={1.8} aria-hidden className="text-muted" />
          {t('key.title')}
        </button>
      ) : null}
    </div>
  )
}
