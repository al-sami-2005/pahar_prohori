/** Direction of a series over the last ~2 storm hours (80 scenario frames). */
export function trendOf(values: readonly number[], epsilon: number): 'rising' | 'steady' | 'falling' {
  const n = values.length
  if (n < 2) return 'steady'
  const now = values[n - 1]!
  const then = values[Math.max(0, n - 80)]!
  if (now - then > epsilon) return 'rising'
  if (then - now > epsilon) return 'falling'
  return 'steady'
}
