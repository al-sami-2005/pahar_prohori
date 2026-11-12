import { MotionConfig } from 'motion/react'
import { MissionProvider } from '@/hooks/useMission'
import { ReplayProvider } from '@/hooks/useReplay'
import { ScenarioProvider } from '@/hooks/useScenario'
import { TourProvider } from '@/hooks/useTour'
import { LangProvider } from '@/lib/i18n'
import { AppErrorBoundary } from './AppErrorBoundary'
import { AppShell } from './AppShell'
import { useHashRoute } from './routes'

export function App() {
  const route = useHashRoute()
  return (
    <AppErrorBoundary>
      <MotionConfig reducedMotion="user">
        <LangProvider>
          <MissionProvider>
            <ScenarioProvider>
              <ReplayProvider>
                <TourProvider>
                  <AppShell route={route} />
                </TourProvider>
              </ReplayProvider>
            </ScenarioProvider>
          </MissionProvider>
        </LangProvider>
      </MotionConfig>
    </AppErrorBoundary>
  )
}
