import { useHeroLive } from '@/hooks/useLive'
import { useScenario } from '@/hooks/useScenario'
import { ALERT_META } from '@/lib/alertLevels'
import { useLang } from '@/lib/i18n'
import { SCENARIO_SCOPE } from '@/lib/scenarioConfig'
import { reasonText } from '@/components/evidence/evidenceText'
import { getSlope, slopeName } from '@/data/slopes'

/**
 * Screen-reader announcements for the scenario slope's alert transitions.
 * The text is derived from the current decision, so it only changes (and is
 * only announced) when the level or its reason changes. Polite for NORMAL →
 * WARNING, assertive for EVACUATE. Visually hidden.
 */
export function ScenarioAnnouncer() {
  const hero = useHeroLive()
  const { active } = useScenario()
  const { t, lang } = useLang()
  const decision = hero?.decision
  const slope = getSlope(SCENARIO_SCOPE.heroSlopeId)

  let message = ''
  if (active && decision && slope) {
    const meta = ALERT_META[decision.alertLevel]
    message = t('announce.level', {
      slope: slopeName(slope, lang),
      level: lang === 'bn' ? meta.labelBn : meta.label,
      reason: reasonText(t, lang, decision),
    })
  }
  const evacuate = decision?.alertLevel === 'evacuate'

  return (
    <>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {evacuate ? '' : message}
      </p>
      <p aria-live="assertive" aria-atomic="true" className="sr-only">
        {evacuate ? message : ''}
      </p>
    </>
  )
}
