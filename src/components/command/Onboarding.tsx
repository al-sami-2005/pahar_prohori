import { AnimatePresence, motion } from 'motion/react'
import { Compass, X } from 'lucide-react'
import { useMission } from '@/hooks/useMission'
import { useScenario } from '@/hooks/useScenario'
import { setPrefs, usePrefs } from '@/hooks/usePrefs'
import { useTour } from '@/hooks/useTour'
import { useViewport } from '@/hooks/useViewport'
import { cn } from '@/lib/cn'
import { useLang } from '@/lib/i18n'
import { chromeTop } from '@/lib/layout'
import { panelTransition } from '@/lib/motion'

/**
 * First-use help stays intentionally short. It explains the next action, not
 * the full science. Detailed meaning is available through Map key / Method.
 */
export function Onboarding() {
  const { state } = useMission()
  const prefs = usePrefs()
  const tour = useTour()
  const { t } = useLang()
  const { width, mode } = useViewport()
  const scenario = useScenario()

  const visible =
    !prefs.onboardingDismissed && !tour.active && !scenario.active && !state.selectedSlopeId && !state.tool && !state.focus
  const mobile = mode === 'mobile'
  const dismiss = () => setPrefs({ onboardingDismissed: true })

  return (
    <AnimatePresence>
      {visible ? (
        <motion.aside
          key="onboarding"
          aria-labelledby="onboarding-title"
          initial={{ opacity: 0, y: mobile ? 20 : -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: mobile ? 14 : -4, transition: { duration: 0.14 } }}
          transition={panelTransition}
          className={cn(
            'pointer-events-auto absolute z-20 bg-surface shadow-overlay ring-1 ring-line',
            mobile ? 'inset-x-0 bottom-0 rounded-t-[24px] px-5 pt-3 pb-5' : 'right-4 w-[330px] rounded-2xl p-4',
          )}
          style={mobile ? { paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' } : { top: chromeTop(width) + 14 }}
        >
          {mobile ? <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-fg/15" /> : null}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-accent">{t('brand.name')}</p>
              <h2 id="onboarding-title" className="mt-0.5 text-lg font-semibold tracking-[-0.01em] text-fg">
                {t('onboard.title')}
              </h2>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t('onboard.close')}
              className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-elevated hover:text-fg"
            >
              <X size={18} strokeWidth={1.8} aria-hidden />
            </button>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-fg/80">{t('onboard.lead')}</p>

          <div className={cn('mt-4 flex gap-2', mobile ? 'flex-col' : 'grid grid-cols-[1.2fr_.8fr]')}>
            <button
              type="button"
              onClick={() => {
                dismiss()
                tour.start()
              }}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent/90"
            >
              <Compass size={17} strokeWidth={2} aria-hidden />
              {t('onboard.start')}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="h-11 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-fg transition-colors hover:bg-elevated"
            >
              {t('onboard.explore')}
            </button>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}
