import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import type { Slope } from '@/types/domain'
import { cn } from '@/lib/cn'
import { formatDate, formatNumber } from '@/lib/formatters'
import { useLang } from '@/lib/i18n'
import { ALERT_THRESHOLDS, SCENARIO_FRAME_COUNT, SOURCE_TIMING } from '@/lib/scenarioConfig'
import { useNow } from '@/hooks/useNow'
import { useScenario } from '@/hooks/useScenario'
import { useSlopeHistory } from '@/hooks/useLive'
import { getChangeForSlope, primaryPair } from '@/data/nisar'
import type { SlopeLive } from '@/data/telemetry'
import { Sparkline } from '@/components/telemetry/Sparkline'
import { ProvenanceTag } from '@/components/ui/ProvenanceTag'
import { trendOf } from '@/lib/trend'

const T0 = Date.now()
const day = (iso: string) => formatDate(`${iso}T00:00:00+06:00`).replace(/ \d{4}$/, '')
const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - Date.parse(`${iso}T00:00:00+06:00`)) / 86_400_000))
type Trend = 'rising' | 'steady' | 'falling'

function TrendMark({ trend }: { trend: Trend }) {
  const { t } = useLang()
  const Icon = trend === 'rising' ? ArrowUpRight : trend === 'falling' ? ArrowDownRight : ArrowRight
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs', trend === 'steady' ? 'text-muted' : 'text-fg/85')}>
      <Icon size={13} strokeWidth={2} aria-hidden />
      {t(`trend.${trend}`)}
    </span>
  )
}

function SignalRow({
  label,
  value,
  unit,
  trend,
  chart,
}: {
  label: string
  value: string
  unit?: string
  trend?: Trend
  chart: ReactNode
}) {
  return (
    <section className="border-b border-line py-3.5 last:border-b-0">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-[112px]">
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-0.5 flex items-baseline gap-1.5">
            <span className="numeric text-xl font-semibold text-fg">{value}</span>
            {unit ? <span className="text-xs text-muted">{unit}</span> : null}
          </p>
          {trend ? <div className="mt-0.5"><TrendMark trend={trend} /></div> : null}
        </div>
        <div className="min-w-0 flex-1">{chart}</div>
      </div>
    </section>
  )
}

function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="text-right text-xs text-fg">{v}</dd>
    </div>
  )
}

/**
 * Simple-by-default slope view. The three live signals stay visible; satellite,
 * sensor and threshold metadata are progressively disclosed under More details.
 */
export function SlopeOverview({ slope, live }: { slope: Slope; live: SlopeLive }) {
  const { t } = useLang()
  const scenario = useScenario()
  const history = useSlopeHistory(slope.id)
  const now = useNow(1000)
  const { reading, node } = live
  const change = getChangeForSlope(slope.id)
  const pair = change ?? primaryPair(slope.site)
  const running = history.length > 0
  const total = SCENARIO_FRAME_COUNT

  const rainSeries = history.map((h) => h.reading.rainRate)
  const topSeries = history.map((h) => h.reading.soilTop ?? 0)
  const deepSeries = history.map((h) => h.reading.soilDeep ?? 0)
  const tiltSeries = history.map((h) => h.reading.tiltDelta ?? 0)
  const rainTrend = trendOf(rainSeries, 1.5)
  const soilTrend = trendOf(deepSeries, 1.5)
  const tiltTrend = trendOf(tiltSeries, 0.01)
  const packetAge = node ? (node.lastSeenSec + Math.floor((now.getTime() - T0) / 1000)) % SOURCE_TIMING.nodePacketSec : 0

  return (
    <div>
      <div className="border-y border-line">
        <SignalRow
          label={t('drawer.rainfall')}
          value={formatNumber(reading.rainRate, 1)}
          unit="mm/h"
          trend={running ? rainTrend : undefined}
          chart={
            <Sparkline
              total={total}
              min={0}
              max={40}
              height={32}
              label={running ? t('drawer.chart.rain', { v: formatNumber(reading.rainRate, 1), trend: t(`trend.${rainTrend}`) }) : t('drawer.chart.rest')}
              series={[{ values: rainSeries, stroke: 'stroke-satellite', fill: 'fill-satellite/10', rest: reading.rainRate }]}
            />
          }
        />

        {node && reading.soilTop !== undefined ? (
          <>
            <SignalRow
              label={t('drawer.soil')}
              value={`${reading.soilTop}% · ${reading.soilDeep}%`}
              trend={running ? soilTrend : undefined}
              chart={
                <Sparkline
                  total={total}
                  min={30}
                  max={100}
                  height={32}
                  threshold={{ value: ALERT_THRESHOLDS.saturationDeep, label: `${ALERT_THRESHOLDS.saturationDeep}%` }}
                  label={running ? t('drawer.chart.soil', { t: reading.soilTop, d: reading.soilDeep ?? 0, trend: t(`trend.${soilTrend}`) }) : t('drawer.chart.rest')}
                  series={[
                    { values: topSeries, stroke: 'stroke-healthy/40', rest: reading.soilTop, strokeWidth: 1.1 },
                    { values: deepSeries, stroke: 'stroke-healthy', rest: reading.soilDeep },
                  ]}
                />
              }
            />
            <SignalRow
              label={t('drawer.movement')}
              value={`+${formatNumber(reading.tiltDelta, 2)}`}
              unit="°"
              trend={running ? tiltTrend : undefined}
              chart={
                <Sparkline
                  total={total}
                  min={0}
                  max={0.6}
                  height={32}
                  threshold={{ value: ALERT_THRESHOLDS.movementTilt, label: `${ALERT_THRESHOLDS.movementTilt}°` }}
                  label={running ? t('drawer.chart.tilt', { v: formatNumber(reading.tiltDelta, 2), trend: t(`trend.${tiltTrend}`) }) : t('drawer.chart.rest')}
                  series={[{ values: tiltSeries, stroke: 'stroke-healthy', rest: reading.tiltDelta }]}
                />
              }
            />
          </>
        ) : (
          <p className="border-t border-line py-3 text-sm leading-relaxed text-muted">{t('drawer.noNodeBlock')}</p>
        )}
      </div>

      <details className="mt-2 border-b border-line">
        <summary className="cursor-pointer list-none py-3 text-sm font-semibold text-fg marker:hidden">
          {t('common.moreDetails')}
          <span className="ml-2 text-xs font-normal text-muted">{t('common.technicalDetails')}</span>
        </summary>
        <div className="border-t border-line py-2">
          <dl>
            <KV k={t('drawer.rain.1h')} v={<span className="numeric">{formatNumber(reading.rain1h, 1)} mm</span>} />
            <KV k={t('drawer.rain.24h')} v={<span className="numeric">{formatNumber(reading.rain24h, 0)} mm</span>} />
            {node && reading.soilDeep !== undefined ? <KV k={t('drawer.threshold')} v={`${ALERT_THRESHOLDS.saturationDeep}% deep soil`} /> : null}
            {node ? <KV k={t('drawer.tiltRate')} v={<span className="numeric">{formatNumber(reading.tiltRate ?? 0, 2)}°/h</span>} /> : null}
          </dl>

          <div className="mt-2 border-t border-line pt-2">
            <div className="flex items-center justify-between gap-3 py-1.5">
              <span className="text-xs text-muted">{t('drawer.nisar.footprint')}</span>
              <span className="flex items-center gap-1.5 text-xs text-fg">
                {change ? t('drawer.nisar.signal') : t('drawer.nisar.noSignal')}
                <ProvenanceTag label="illustrative" />
              </span>
            </div>
            {pair ? (
              <div className="py-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted">{t('drawer.nisar.pass')}</span>
                  <ProvenanceTag label="nasa" />
                </div>
                <p className="numeric mt-1 text-xs text-fg">{pair.product} · T{pair.track} · {day(pair.before)} → {day(pair.after)}</p>
                <p className="mt-1 text-xs text-muted">{t('drawer.nisar.age', { d: daysSince(pair.after), r: SOURCE_TIMING.nisarRevisitDays })}</p>
              </div>
            ) : null}
          </div>

          {node ? (
            <div className="mt-2 border-t border-line pt-2">
              <KV k={t('drawer.sensor.node')} v={<span className="numeric">{node.id}</span>} />
              <KV k={t('drawer.battery')} v={<span className="numeric">{node.batteryPct}%</span>} />
              <KV k={t('drawer.sensor.link')} v={<span className="numeric">{node.rssi} dBm · {t(`link.${node.link}`)}</span>} />
              <KV k={t('drawer.sensor.last')} v={scenario.active ? t('drawer.sensor.streaming') : t('drawer.sensor.ago', { s: packetAge })} />
            </div>
          ) : null}
        </div>
      </details>
    </div>
  )
}
