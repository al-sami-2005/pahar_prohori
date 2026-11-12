import { ResidentWarning } from '@/components/alerts/ResidentWarning'
import { FocusBanner } from '@/components/command/FocusBanner'
import { GuidedTour } from '@/components/command/GuidedTour'
import { LocationHeader } from '@/components/command/LocationHeader'
import { Onboarding } from '@/components/command/Onboarding'
import { MapLegend } from '@/components/map/MapLegend'
import { MissionRail } from '@/components/rail/MissionRail'
import { ScenarioBar } from '@/components/scenario/ScenarioBar'
import { IntelligenceDrawer } from '@/components/slope/IntelligenceDrawer'

/**
 * Mission Control overlays. The map itself is mounted once in AppShell and
 * persists across routes; this page only floats controls around it.
 */
export default function MissionControl() {
  return (
    <>
      {/* Soft bottom falloff so the scenario control reads over any terrain. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-32 bg-linear-to-t from-sea/45 to-transparent"
      />
      <LocationHeader />
      <MissionRail />
      <MapLegend />
      <Onboarding />
      <FocusBanner />
      <ScenarioBar />
      <IntelligenceDrawer />
      <ResidentWarning />
      <GuidedTour />
    </>
  )
}
