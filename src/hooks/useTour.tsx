/**
 * Guided demo state. Steps drive the real UI (layers, panels, selection,
 * focus, the real scenario) — the tour never fakes a screen. Step gating
 * rules live in lib/tour.ts.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { TOUR_STEPS } from '@/lib/tour'

export { TOUR_STEPS, type TourStep } from '@/lib/tour'

interface TourContextValue {
  active: boolean
  step: number
  start: () => void
  next: () => void
  back: () => void
  exit: () => void
}

const TourContext = createContext<TourContextValue | null>(null)

export function TourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)

  const start = useCallback(() => {
    setStep(0)
    setActive(true)
  }, [])
  const next = useCallback(() => setStep((s) => Math.min(TOUR_STEPS.length - 1, s + 1)), [])
  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), [])
  const exit = useCallback(() => setActive(false), [])

  const value = useMemo(() => ({ active, step, start, next, back, exit }), [active, step, start, next, back, exit])
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useTour must be used inside <TourProvider>')
  return ctx
}
