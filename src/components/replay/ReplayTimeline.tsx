import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, CloudRain, Newspaper, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import type { SiteId } from '@/types/domain'
import { useReplay } from '@/hooks/useReplay'
import { cn } from '@/lib/cn'
import { useLang } from '@/lib/i18n'
import { PROVENANCE_META } from '@/lib/provenance'
import { REPLAY_SPEEDS, type ReplaySpeed } from '@/lib/replayClock'
import { ProvenanceTag } from '@/components/ui/ProvenanceTag'
import { EVENT_END, EVENT_START, GAP_START, PEAK_DAY, REPLAY_DAYS, REPLAY_END, phaseOf } from '@/data/replay'
import {
  BACKTEST_CUTOFF,
  markersFor,
  nextKeyDate,
  prevKeyDate,
  type MarkerKind,
  type TimelineMarker,
} from '@/data/replayEvidence'
import { KnowledgeChip } from './KnowledgeChip'
import { dayLong, dayShort, evidenceWindow, knownFrom, markerState, markerTitle } from './evidenceLabel'

const LAST = REPLAY_DAYS.length - 1
/** Position of a date along the track (0–100 %), clamped to the replay window. */
const pct = (iso: string) => {
  const i = REPLAY_DAYS.indexOf(iso)
  if (i >= 0) return (i / LAST) * 100
  return iso > REPLAY_END ? 100 : 0
}

/** Which glyph speaks for a date that carries several items. */
const GLYPH_ORDER: readonly MarkerKind[] = ['footprint', 'pass-post', 'pass-pre', 'impact', 'rain', 'gap']

interface Group {
  /** First date in the group — its key, position and seek target. */
  date: string
  items: TimelineMarker[]
  lead: TimelineMarker
}

/**
 * One marker button per date. On narrow tracks, dates `mergeDays` apart share a
 * button so hit targets never overlap; the tooltip still dates each item.
 */
function groupMarkers(site: SiteId, mergeDays: number): Group[] {
  const groups: Array<{ date: string; last: number; items: TimelineMarker[] }> = []
  for (const m of markersFor(site)) {
    if (m.kind === 'cutoff' || m.date > REPLAY_END) continue
    const i = REPLAY_DAYS.indexOf(m.date)
    const prev = groups.at(-1)
    if (prev && i - prev.last <= mergeDays) {
      prev.items.push(m)
      prev.last = i
    } else {
      groups.push({ date: m.date, last: i, items: [m] })
    }
  }
  return groups.map(({ date, items }) => {
    const lead = [...items].sort((a, b) => GLYPH_ORDER.indexOf(a.kind) - GLYPH_ORDER.indexOf(b.kind))[0]!
    return { date, items, lead }
  })
}

/**
 * Small glyph per marker kind — shape and outline carry meaning, not colour alone.
 * A pre-event acquisition is an outline while its product is processing and fills
 * in once it is conservatively available.
 */
function Glyph({ kind, reached, ready = true }: { kind: MarkerKind; reached: boolean; ready?: boolean }) {
  const dim = reached ? '' : 'opacity-45'
  switch (kind) {
    case 'pass-pre':
      return (
        <span
          aria-hidden
          className={cn('block size-[9px] rotate-45 border border-satellite', ready ? 'bg-satellite' : 'bg-canvas', dim)}
        />
      )
    case 'pass-post':
      return <span aria-hidden className={cn('block size-[9px] rotate-45 border border-dashed border-fg/80 bg-canvas', dim)} />
    case 'footprint':
      return (
        <span
          aria-hidden
          className={cn(
            'block size-[11px] rounded-[2px] border border-dashed border-fg/80 bg-[repeating-linear-gradient(45deg,rgb(70_82_92/0.50)_0_1px,transparent_1px_3px)]',
            dim,
          )}
        />
      )
    case 'rain':
      return <CloudRain size={13} strokeWidth={2} aria-hidden className={cn('text-fg/85', dim)} />
    case 'impact':
      return <Newspaper size={13} strokeWidth={2} aria-hidden className={cn('text-fg/85', dim)} />
    case 'gap':
      return (
        <span
          aria-hidden
          className={cn(
            'block h-[9px] w-[11px] rounded-[2px] border border-line-strong bg-[repeating-linear-gradient(135deg,rgb(88_106_121/0.42)_0_1px,transparent_1px_3px)]',
            dim,
          )}
        />
      )
    default:
      return null
  }
}

function IconButton({
  label,
  onClick,
  children,
  disabled,
  className,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-lg border border-hairline text-fg/85 transition-colors duration-150 hover:bg-fg/[0.06] hover:text-fg disabled:opacity-35 disabled:hover:bg-transparent',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Tooltip body for one timeline date: what it is, where it comes from, and whether it was known then. */
function MarkerDetail({ group, day, isCutoff }: { group: Group | null; day: string; isCutoff: boolean }) {
  const { t } = useLang()
  const items: TimelineMarker[] = isCutoff
    ? [markersFor('chattogram').find((m) => m.kind === 'cutoff')!]
    : (group?.items ?? [])
  const date = isCutoff ? BACKTEST_CUTOFF : (group?.date ?? day)
  const multiDate = new Set(items.map((m) => m.date)).size > 1
  return (
    <div>
      {multiDate ? null : <p className="numeric text-xs text-muted">{dayLong(date)}</p>}
      <ul className="mt-1.5 flex flex-col gap-2.5">
        {items.map((m) => {
          const state = markerState(m, day)
          const locked = state === 'not-yet'
          const tags = m.provenance.filter((p) => !(p === 'post-event' && state === 'post-event'))
          return (
            <li key={m.id}>
              {multiDate ? <p className="numeric text-xs text-muted">{dayLong(m.date)}</p> : null}
              <p className="text-sm leading-snug font-medium text-fg">{markerTitle(t, m, day)}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {m.kind === 'cutoff' ? null : <KnowledgeChip state={state} />}
                {tags.map((p) => (
                  <ProvenanceTag key={p} label={p} />
                ))}
              </div>
              {m.evidence && !locked && evidenceWindow(t, m.evidence) ? (
                <p className="mt-1 text-2xs leading-relaxed text-fg/80 tabular-nums" data-window>
                  {evidenceWindow(t, m.evidence)}
                </p>
              ) : null}
              <p className="mt-1 text-xs leading-relaxed text-fg/80">{t(m.why, m.vars)}</p>
              {m.evidence?.acquiredAt && !locked && state !== 'available' && state !== 'post-event' ? (
                <p className="mt-1 text-2xs leading-relaxed text-muted">{t('rev.latency')}</p>
              ) : null}
              {locked ? (
                <p className="mt-1 text-xs text-muted">{t('rev.locked', { date: dayShort(m.evidence ? knownFrom(m.evidence) : m.date) })}</p>
              ) : null}
              <p className="mt-1 text-2xs text-muted" title={PROVENANCE_META[m.provenance[0] ?? 'nasa'].description}>
                {m.source}
              </p>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 border-t border-hairline pt-1.5 text-2xs text-muted">
        {t('replay.tip.known', {
          date: dayShort(day),
          state: isCutoff ? t(day >= BACKTEST_CUTOFF ? 'replay.boundary.post' : 'replay.boundary.pre') : t(`kstate.${markerState(items[0]!, day)}`),
        })}
      </p>
    </div>
  )
}

interface ReplayTimelineProps {
  site: SiteId
  /** dock = desktop bottom dock; sheet = sticky header of the tablet/phone sheet. */
  variant: 'dock' | 'sheet'
  /** Phone width: icon-only play button, short boundary label, merged adjacent markers. */
  compact?: boolean
}

/**
 * The replay's single control surface. Every input — play, scrub, keyboard,
 * key-date jumps, marker taps — dispatches into the one replay clock.
 */
export function ReplayTimeline({ site, variant, compact = false }: ReplayTimelineProps) {
  const { t } = useLang()
  const r = useReplay()
  const { date, playing, speed } = r
  const groups = useMemo(() => groupMarkers(site, compact ? 1 : 0), [site, compact])
  const [open, setOpen] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const sheet = variant === 'sheet'
  const post = date >= BACKTEST_CUTOFF
  const phase = phaseOf(date)

  // A subtle one-off pulse on the cutoff flag when playback or scrubbing crosses it forwards.
  const [pulse, setPulse] = useState(0)
  const prevDate = useRef(date)
  useEffect(() => {
    if (prevDate.current < BACKTEST_CUTOFF && date >= BACKTEST_CUTOFF) setPulse((p) => p + 1)
    prevDate.current = date
  }, [date])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
    }
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(null)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const openGroup = open && open !== 'cutoff' ? (groups.find((g) => g.date === open) ?? null) : null
  const openPct = open === 'cutoff' ? pct(BACKTEST_CUTOFF) : openGroup ? pct(openGroup.date) : 0
  // Weekly (fortnightly on sheets) ticks; the last one gives way to the end label.
  const ticks = REPLAY_DAYS.filter((_, i) => i % (sheet ? 14 : 7) === 0 && i <= LAST - 5)
  const index = REPLAY_DAYS.indexOf(date)

  const playButton = (
    <button
      type="button"
      onClick={r.toggle}
      aria-label={playing ? t('replay.pauseBtn') : t('replay.play')}
      data-replay-play={playing ? 'playing' : 'paused'}
      className={cn(
        'flex h-10 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-colors duration-150',
        playing ? 'border border-line-strong bg-fg/[0.06] text-fg hover:bg-fg/[0.08]' : 'bg-accent text-white hover:bg-accent/90',
      )}
    >
      {playing ? <Pause size={15} strokeWidth={2.2} aria-hidden /> : <Play size={15} strokeWidth={2.2} aria-hidden className="fill-current" />}
      <span className={cn(compact && 'sr-only')}>{playing ? t('replay.pauseBtn') : t('replay.play')}</span>
    </button>
  )

  const stepButtons = (
    <div className="flex items-center gap-1">
      <IconButton label={t('replay.prevKey')} onClick={() => r.seekDate(prevKeyDate(site, date))} disabled={index <= 0}>
        <SkipBack size={15} strokeWidth={2} aria-hidden />
      </IconButton>
      <IconButton label={t('replay.prevDay')} onClick={() => r.step(-1)} disabled={index <= 0}>
        <ChevronLeft size={16} strokeWidth={2} aria-hidden />
      </IconButton>
      <IconButton label={t('replay.nextDay')} onClick={() => r.step(1)} disabled={index >= LAST}>
        <ChevronRight size={16} strokeWidth={2} aria-hidden />
      </IconButton>
      <IconButton label={t('replay.nextKey')} onClick={() => r.seekDate(nextKeyDate(site, date))} disabled={index >= LAST}>
        <SkipForward size={15} strokeWidth={2} aria-hidden />
      </IconButton>
    </div>
  )

  const speedControl = (
    <div role="radiogroup" aria-label={t('replay.speed')} className="flex shrink-0 items-center gap-0.5 rounded-lg border border-hairline bg-canvas/50 p-0.5">
      {REPLAY_SPEEDS.map((s: ReplaySpeed) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={s === speed}
          onClick={() => r.setSpeed(s)}
          className={cn(
            'numeric h-8 min-w-9 rounded-md px-1.5 text-xs transition-colors',
            s === speed ? 'bg-fg/[0.08] text-fg' : 'text-muted hover:text-fg',
          )}
        >
          {t('replay.speedValue', { n: s })}
        </button>
      ))}
    </div>
  )

  const readout = (
    <div className="min-w-0">
      <p className="flex items-baseline gap-2.5">
        <span className="numeric text-xl leading-none font-medium whitespace-nowrap text-fg" data-replay-date={date}>
          {dayLong(date)}
        </span>
        {compact ? null : <span className="text-xs whitespace-nowrap text-muted">{t('replay.dayOf', { n: index + 1, total: LAST + 1 })}</span>}
      </p>
      <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
            phase === 'during' ? 'bg-warning/15 text-warning' : 'bg-fg/[0.07] text-fg/85',
          )}
        >
          {t(`replay.phase.${phase}`)}
        </span>
        <span
          data-replay-boundary={post ? 'post' : 'pre'}
          className={cn(
            'rounded-md border px-1.5 py-[1px] text-xs whitespace-nowrap transition-colors duration-300',
            post ? 'border-dashed border-fg/35 text-fg/85' : 'border-satellite/35 text-satellite',
          )}
        >
          {compact ? t(post ? 'replay.boundary.post.short' : 'replay.boundary.pre.short') : t(post ? 'replay.boundary.post' : 'replay.boundary.pre')}
        </span>
      </p>
    </div>
  )

  return (
    <div ref={wrapRef} className="relative" data-replay-timeline>
      {/* Controls */}
      {sheet ? (
        <>
          <div className="flex items-start justify-between gap-3">
            {readout}
            {speedControl}
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            {playButton}
            <IconButton label={t('replay.restart')} onClick={r.restart}>
              <RotateCcw size={15} strokeWidth={2} aria-hidden />
            </IconButton>
            <span aria-hidden className="mx-0.5 h-6 w-px bg-hairline" />
            {stepButtons}
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5">
            {playButton}
            <IconButton label={t('replay.restart')} onClick={r.restart}>
              <RotateCcw size={15} strokeWidth={2} aria-hidden />
            </IconButton>
          </div>
          <div className="min-w-0 flex-1">{readout}</div>
          <div className="flex items-center gap-2">
            {stepButtons}
            {speedControl}
          </div>
        </div>
      )}

      {/* Track */}
      <div className="relative mt-3 select-none" data-replay-track>
        {/* Marker lane */}
        <div className="relative mx-[10px] h-[46px]" role="group" aria-label={t('replay.markers')}>
          {/* Cutoff flag */}
          <button
            type="button"
            data-marker="cutoff"
            aria-label={`${t('rev.cutoff')} · ${dayLong(BACKTEST_CUTOFF)}`}
            aria-expanded={open === 'cutoff'}
            onMouseEnter={() => setOpen('cutoff')}
            onMouseLeave={() => setOpen((o) => (o === 'cutoff' ? null : o))}
            onFocus={() => setOpen('cutoff')}
            onBlur={() => setOpen((o) => (o === 'cutoff' ? null : o))}
            onClick={() => {
              r.seekDate(BACKTEST_CUTOFF)
              setOpen('cutoff')
            }}
            className={cn(
              'absolute top-0 flex h-[19px] -translate-x-1/2 items-center gap-1 rounded-md border px-1.5 text-[10.5px] leading-none font-medium whitespace-nowrap transition-colors duration-300',
              post ? 'border-fg/30 bg-canvas text-fg/85' : 'border-accent/60 bg-canvas text-accent',
            )}
            style={{ left: `${pct(BACKTEST_CUTOFF)}%` }}
          >
            {pulse > 0 ? <span key={pulse} aria-hidden className="cutoff-pulse absolute inset-0 rounded-md" /> : null}
            {sheet ? dayShort(BACKTEST_CUTOFF) : `${t('rev.cutoff')} · ${dayShort(BACKTEST_CUTOFF)}`}
          </button>

          {groups.map((g) => {
            const reached = g.date <= date
            const more = g.items.length - 1
            return (
              <button
                key={g.date}
                type="button"
                data-marker={g.lead.kind}
                data-marker-date={g.date}
                data-state={markerState(g.lead, date)}
                aria-label={`${dayLong(g.date)} · ${g.items.map((m) => markerTitle(t, m, date)).join(' · ')} · ${t(`kstate.${markerState(g.lead, date)}`)}`}
                aria-expanded={open === g.date}
                onMouseEnter={() => setOpen(g.date)}
                onMouseLeave={() => setOpen((o) => (o === g.date ? null : o))}
                onFocus={() => setOpen(g.date)}
                onBlur={() => setOpen((o) => (o === g.date ? null : o))}
                onClick={() => {
                  r.seekDate(g.date)
                  setOpen(g.date)
                }}
                className={cn(
                  'absolute top-[21px] grid h-6 min-w-6 -translate-x-1/2 place-items-center rounded-md transition-colors hover:bg-fg/[0.07]',
                  open === g.date && 'bg-fg/[0.08]',
                )}
                style={{ left: `${pct(g.date)}%` }}
              >
                <span className="relative flex items-center">
                  <Glyph kind={g.lead.kind} reached={reached} ready={markerState(g.lead, date) === 'available'} />
                  {more > 0 ? (
                    <span className="numeric absolute -top-2 -right-2.5 text-[9px] leading-none text-muted">{t('replay.more', { n: more })}</span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>

        {/* Visual rail + scrubber */}
        <div className="relative h-7">
          <div aria-hidden className="absolute inset-x-[10px] inset-y-0.5 overflow-hidden rounded-md border border-hairline bg-canvas/50">
            {/* Pre-cutoff: the only period that may feed the prediction */}
            <span className="absolute inset-y-0 left-0 bg-satellite/[0.07]" style={{ width: `${pct(BACKTEST_CUTOFF)}%` }} />
            {/* Event window */}
            <span
              className="absolute inset-y-0 border-x border-warning/35 bg-warning/[0.1]"
              style={{ left: `${pct(EVENT_START)}%`, right: `${100 - pct(EVENT_END)}%` }}
            />
            {/* NISAR data gap */}
            <span
              className="absolute inset-y-0 right-0 bg-[repeating-linear-gradient(135deg,rgb(88_106_121/0.14)_0_1px,transparent_1px_6px)]"
              style={{ left: `${pct(GAP_START)}%` }}
            />
            {/* Reported rainfall: the one value we have, shown only once it is part of the record */}
            <span
              className={cn(
                'absolute bottom-0 w-[3px] -translate-x-1/2 rounded-t-sm',
                date >= PEAK_DAY ? 'h-[80%] bg-satellite/85' : 'h-[35%] border border-dashed border-muted/50',
              )}
              style={{ left: `${pct(PEAK_DAY)}%` }}
            />
            {/* Elapsed */}
            <span className="absolute bottom-0 left-0 h-[2px] bg-accent/70" style={{ width: `${pct(date)}%` }} />
          </div>
          {/* Cutoff line (through the rail) */}
          <span
            aria-hidden
            className={cn('pointer-events-none absolute -top-[27px] bottom-0 w-px', post ? 'bg-fg/40' : 'bg-accent/80')}
            style={{ left: `calc(10px + (100% - 20px) * ${pct(BACKTEST_CUTOFF) / 100})` }}
          />
          <input
            type="range"
            min={0}
            max={LAST}
            step={1}
            value={Math.max(0, index)}
            onChange={(e) => r.seek(Number(e.target.value))}
            onPointerDown={() => {
              if (playing) r.pause()
            }}
            aria-label={t('replay.scrub')}
            aria-valuetext={`${dayLong(date)} · ${t(`replay.phase.${phase}`)}`}
            className="replay-range absolute inset-x-0 top-0 w-full"
            data-replay-range
          />
        </div>

        {/* Axis */}
        <div className="relative mx-[10px] mt-0.5 h-4 text-2xs text-muted">
          {ticks.map((d, i) => (
            <span key={d} className={cn('numeric absolute whitespace-nowrap', i > 0 && '-translate-x-1/2')} style={{ left: `${pct(d)}%` }}>
              {dayShort(d)}
            </span>
          ))}
          <span className="numeric absolute right-0 whitespace-nowrap">{dayShort(REPLAY_END)}</span>
        </div>

        {/* Marker detail */}
        {open ? (
          <div
            role="tooltip"
            data-marker-tip={open}
            className={cn(
              'absolute z-30 w-[min(300px,100%)] rounded-xl border border-hairline bg-overlay p-3 shadow-overlay',
              sheet ? 'top-8' : 'bottom-[calc(100%-4px)]',
            )}
            style={{ left: `clamp(0px, calc(${openPct}% - 150px), calc(100% - min(300px, 100%)))` }}
          >
            <MarkerDetail group={openGroup} day={date} isCutoff={open === 'cutoff'} />
          </div>
        ) : null}
      </div>

      {sheet ? null : <Legend />}
    </div>
  )
}

function Legend() {
  const { t } = useLang()
  const item = (glyph: ReactNode, label: string) => (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      {glyph}
      {label}
    </span>
  )
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted" data-replay-legend>
      {item(<span aria-hidden className="h-2.5 w-3.5 rounded-[2px] bg-gradient-to-r from-risk-moderate to-risk-critical" />, t('replay.legend.ranking'))}
      {item(<Glyph kind="footprint" reached />, t('replay.legend.footprint'))}
      {item(<Glyph kind="pass-pre" reached />, t('replay.legend.prePass'))}
      {item(<Glyph kind="pass-post" reached />, t('replay.legend.postPass'))}
      {item(<span aria-hidden className="h-3 w-px bg-accent" />, t('replay.legend.cutoff'))}
      {item(<span aria-hidden className="h-2.5 w-3.5 rounded-[2px] border border-warning/40 bg-warning/15" />, t('replay.legend.event'))}
      {item(<span aria-hidden className="h-3 w-[3px] rounded-sm bg-satellite/85" />, t('replay.legend.rain'))}
    </div>
  )
}
