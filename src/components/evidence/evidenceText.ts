/**
 * Plain-language text for engine output. The engine returns codes; this is
 * the only place they become sentences, in either language.
 */
import type { AlertDecision, EvidenceState } from '@/lib/alertEngine'
import { ALERT_THRESHOLDS } from '@/lib/scenarioConfig'
import type { Lang, Translate as T } from '@/lib/i18n'

export function bandWord(t: T, lang: Lang, decision: AlertDecision): string {
  const word = t(`band.${decision.riskBand}`)
  return lang === 'en' ? word.toLowerCase() : word
}

/** One sentence: why the status is what it is. */
export function reasonText(t: T, lang: Lang, decision: AlertDecision): string {
  return t(`reason.${decision.decisionExplanation}`, {
    band: bandWord(t, lang, decision),
    hold: ALERT_THRESHOLDS.evacuateHoldMin,
  })
}

export function stateLabel(t: T, state: EvidenceState): string {
  return t(`state.${state}`)
}

/** Evidence that is currently feeding the decision. */
export function isActive(state: EvidenceState): boolean {
  return state === 'contributing' || state === 'confirmed'
}
