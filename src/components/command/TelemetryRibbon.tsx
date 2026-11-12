import { Bell, Play, RadioTower } from 'lucide-react'
import { useScenario } from '@/hooks/useScenario'
import { useViewport } from '@/hooks/useViewport'
import { cn } from '@/lib/cn'
import { useLang } from '@/lib/i18n'
import { ALERT_META } from '@/lib/alertLevels'
import { toneText } from '@/lib/tones'
import { groundNodes } from '@/data/sensors'
import { useAlertLevels } from '@/hooks/useLive'
import type { AlertLevel } from '@/types/domain'

export function TelemetryRibbon({ embedded = false, compact = false }: { embedded?: boolean; compact?: boolean }) {
  const { status } = useScenario()
  const levels = useAlertLevels()
  const { t, lang } = useLang()
  const { mode } = useViewport()
  const online = groundNodes.filter((n) => n.link !== 'offline').length

  const counts = new Map<AlertLevel, number>()
  for (const level of levels.values()) if (level !== 'normal') counts.set(level, (counts.get(level) ?? 0) + 1)
  const ordered = [...counts.entries()].sort((a, b) => ALERT_META[b[0]].severity - ALERT_META[a[0]].severity)
  const top = ordered[0]
  const worst = top?.[0]
  const levelWord = (l: AlertLevel) => (lang === 'bn' ? ALERT_META[l].labelBn : ALERT_META[l].label.toLowerCase())

  return (
    <div
      className={cn(
        'inline-flex items-center text-xs',
        embedded ? 'h-10 text-muted' : 'h-9 rounded-xl bg-surface/95 px-2 shadow-float ring-1 ring-line backdrop-blur-md',
        compact && 'h-8 px-1.5',
      )}
    >
      <dl aria-label={t('ribbon.label')} className="flex items-center">
        <div className="flex items-center gap-1.5 px-2 py-1">
          <RadioTower size={14} className="shrink-0 text-healthy" aria-hidden />
          <dt className="sr-only">{t('ribbon.ground')}</dt>
          <dd className="numeric font-semibold text-fg">{online}/{groundNodes.length}</dd>
        </div>
        <span aria-hidden className="h-4 w-px bg-line" />
        <div className="flex items-center gap-1.5 px-2 py-1">
          <Bell size={14} className={cn('shrink-0', worst ? toneText[ALERT_META[worst].tone] : 'text-muted')} aria-hidden />
          <dt className="sr-only">{t('ribbon.alerts')}</dt>
          <dd>
            {top ? (
              <span className={cn('numeric font-semibold', toneText[ALERT_META[top[0]].tone])}>{top[1]} {levelWord(top[0])}</span>
            ) : (
              <span className="text-fg">{t(mode === 'mobile' ? 'ribbon.alerts.noneShort' : 'ribbon.alerts.none')}</span>
            )}
          </dd>
        </div>
        {!compact && mode === 'desktop' ? (
          <>
            <span aria-hidden className="h-4 w-px bg-line" />
            <div className="flex items-center gap-1.5 px-2 py-1">
              <Play size={14} className={status === 'running' ? 'text-accent' : 'text-muted'} aria-hidden />
              <dt className="sr-only">{t('ribbon.scenario')}</dt>
              <dd className={status === 'running' ? 'font-semibold text-accent' : 'text-fg'}>{t(`scenario.status.${status}`)}</dd>
            </div>
          </>
        ) : null}
      </dl>
    </div>
  )
}
