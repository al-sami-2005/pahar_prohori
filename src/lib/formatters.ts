/**
 * Display formatters. All times are shown in Bangladesh time with an explicit
 * offset ("UTC+6") — "BST" is ambiguous with British Summer Time.
 */

const DHAKA_TZ = 'Asia/Dhaka'
const EM_DASH = '—'

function isFiniteNumber(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function formatNumber(v: number | null | undefined, digits = 1): string {
  if (!isFiniteNumber(v)) return EM_DASH
  return v.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** Rainfall in millimetres. */
export function formatMm(v: number | null | undefined, digits = 1): string {
  return isFiniteNumber(v) ? `${formatNumber(v, digits)} mm` : EM_DASH
}

/** Rainfall rate in mm/h. */
export function formatMmPerHour(v: number | null | undefined, digits = 1): string {
  return isFiniteNumber(v) ? `${formatNumber(v, digits)} mm/h` : EM_DASH
}

export function formatPct(v: number | null | undefined, digits = 0): string {
  return isFiniteNumber(v) ? `${formatNumber(v, digits)}%` : EM_DASH
}

/** Angle in degrees, e.g. tilt change or slope angle. */
export function formatDeg(v: number | null | undefined, digits = 2): string {
  return isFiniteNumber(v) ? `${formatNumber(v, digits)}°` : EM_DASH
}

/** Relative Risk Index (0–1). Always two decimals; never rendered as a percentage. */
export function formatIndex(v: number | null | undefined): string {
  return isFiniteNumber(v) ? v.toFixed(2) : EM_DASH
}

export function formatCoord(lat: number, lon: number, digits = 4): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(digits)}° ${ns}, ${Math.abs(lon).toFixed(digits)}° ${ew}`
}

const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: DHAKA_TZ,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: DHAKA_TZ,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: DHAKA_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function parse(iso: string): Date | null {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "07 Jul 2026 · 14:30 UTC+6" */
export function formatTimestamp(iso: string): string {
  const d = parse(iso)
  if (!d) return EM_DASH
  const parts = dateTimeFmt.formatToParts(d)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('day')} ${get('month')} ${get('year')} · ${get('hour')}:${get('minute')} UTC+6`
}

/** "07 Jul 2026" */
export function formatDate(iso: string): string {
  const d = parse(iso)
  return d ? dateFmt.format(d) : EM_DASH
}

/** "14:30" (UTC+6) */
export function formatTime(iso: string): string {
  const d = parse(iso)
  return d ? timeFmt.format(d) : EM_DASH
}

/** "12 min ago", "3 h ago", "4 d ago". Deterministic when `now` is supplied. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const d = parse(iso)
  if (!d) return EM_DASH
  const diffMin = Math.round((now.getTime() - d.getTime()) / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 48) return `${diffH} h ago`
  return `${Math.round(diffH / 24)} d ago`
}

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const

/** Convert ASCII digits to Bengali digits for Bengali-language alerts. */
export function toBengaliDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d)
}
