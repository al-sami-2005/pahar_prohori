import { useEffect, useState } from 'react'

/** Wall-clock time, refreshed on an interval aligned to the next tick. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer: number
    const schedule = () => {
      const wait = intervalMs - (Date.now() % intervalMs)
      timer = window.setTimeout(() => {
        setNow(new Date())
        schedule()
      }, wait)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [intervalMs])
  return now
}
