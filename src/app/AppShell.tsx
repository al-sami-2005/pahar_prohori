import { lazy, Suspense, useEffect } from 'react'
import { CommandBar } from '@/components/command/CommandBar'
import { MissionMap } from '@/components/map/MissionMap'
import { useMission } from '@/hooks/useMission'
import { useTour } from '@/hooks/useTour'
import { useScenario } from '@/hooks/useScenario'
import { useReplay } from '@/hooks/useReplay'
import { ScenarioAnnouncer } from '@/components/alerts/ScenarioAnnouncer'
import { useLang } from '@/lib/i18n'
import DeploymentPlanner from '@/pages/DeploymentPlanner'
import EventReplay from '@/pages/EventReplay'
import Method from '@/pages/Method'
import MissionControl from '@/pages/MissionControl'
import type { RouteId } from './routes'

const DesignSystem = lazy(() => import('@/pages/DesignSystem'))

function SkipLink({ route }: { route: RouteId }) {
  const { t } = useLang()
  return (
    <a
      href="#map-tools"
      onClick={(e) => {
        // Hash routing owns the URL fragment, so move focus manually.
        e.preventDefault()
        const target = route === 'mission'
          ? document.getElementById('map-tools')?.querySelector<HTMLElement>('button, a')
          : document.querySelector<HTMLElement>('h1, [role=main]')
        target?.focus()
      }}
      className="sr-only rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
    >
      {route === 'mission' ? t('skip.toTools') : 'Skip to page content'}
    </a>
  )
}

/**
 * The map is mounted once and never re-initialised; routes only swap what
 * floats above it.
 */
export function AppShell({ route }: { route: RouteId }) {
  const { dispatch } = useMission()
  const tour = useTour()
  const scenario = useScenario()
  const { status: scenarioStatus, pause: pauseScenario } = scenario

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const target = e.target as HTMLElement | null
      if (target?.tagName === 'INPUT' && (target as HTMLInputElement).value) return
      if (tour.active) {
        tour.exit()
        return
      }
      dispatch({ type: 'escape' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch, tour])

  // The storm only plays on Mission Control: leaving pauses it, so nothing runs unseen.
  useEffect(() => {
    if (route !== 'mission' && scenarioStatus === 'running') pauseScenario()
  }, [route, scenarioStatus, pauseScenario])

  // Same for the replay: its date is kept, but autoplay stops off the Replay route.
  const { playing: replayPlaying, pause: pauseReplay } = useReplay()
  useEffect(() => {
    if (route !== 'replay' && replayPlaying) pauseReplay()
  }, [route, replayPlaying, pauseReplay])

  // Route-aware page titles make browser tabs and screen-reader context clearer.
  useEffect(() => {
    const label: Record<RouteId, string> = {
      mission: 'Mission Control',
      replay: 'July 2026 Event Replay',
      deploy: 'Guardian Deployment Planner',
      method: 'Method & Data Provenance',
      system: 'Design System',
    }
    document.title = `${label[route]} · Pahar Prohori`
  }, [route])

  // Each route declares its base map view; pages refine it (e.g. replay date).
  useEffect(() => {
    if (route === 'mission') dispatch({ type: 'view', view: { kind: 'mission' } })
    if (route === 'method') dispatch({ type: 'view', view: { kind: 'method' } })
    if (route !== 'mission' && tour.active) tour.exit()
  }, [route, dispatch, tour])

  if (route === 'system') {
    return (
      <div className="h-full overflow-y-auto">
        <Suspense fallback={<div className="h-full bg-canvas" />}>
          <DesignSystem />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-sea text-fg">
      <SkipLink route={route} />
      <MissionMap />
      {route === 'mission' ? <MissionControl /> : null}
      {route === 'replay' ? <EventReplay /> : null}
      {route === 'deploy' ? <DeploymentPlanner /> : null}
      {route === 'method' ? <Method /> : null}
      <CommandBar route={route} />
      <ScenarioAnnouncer />
    </div>
  )
}
