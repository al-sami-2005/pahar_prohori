import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  BookOpen,
  Compass,
  History,
  Menu,
  RadioTower,
  Radar,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react'
import { hrefFor, type RouteId } from '@/app/routes'
import { useMission } from '@/hooks/useMission'
import { useTour } from '@/hooks/useTour'
import { useViewport } from '@/hooks/useViewport'
import { cn } from '@/lib/cn'
import { useLang, type I18nKey, type Lang } from '@/lib/i18n'
import { panelTransition } from '@/lib/motion'
import { DemoMark, BrandMark } from './Marks'
import { TelemetryRibbon } from './TelemetryRibbon'

const NAV_ITEMS: Array<{ route: RouteId; label: I18nKey; icon: LucideIcon }> = [
  { route: 'mission', label: 'nav.mission', icon: Radar },
  { route: 'replay', label: 'nav.replay', icon: History },
  { route: 'deploy', label: 'nav.deploy', icon: RadioTower },
  { route: 'method', label: 'nav.method', icon: BookOpen },
]

function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useLang()
  const opt = (value: Lang, label: string) => (
    <button
      type="button"
      onClick={() => setLang(value)}
      aria-pressed={lang === value}
      lang={value}
      className={cn(
        'rounded-lg text-sm font-semibold transition-colors',
        compact ? 'h-9 px-2.5' : 'h-10 px-3',
        lang === value ? 'bg-fg text-white' : 'text-muted hover:bg-elevated hover:text-fg',
      )}
    >
      {label}
    </button>
  )
  return (
    <div role="group" aria-label={t('lang.label')} className="flex items-center rounded-xl bg-elevated p-0.5">
      {opt('bn', 'বাংলা')}
      {opt('en', 'EN')}
    </div>
  )
}

function GuidedDemoButton({ compact = false }: { compact?: boolean }) {
  const { t } = useLang()
  const tour = useTour()
  return (
    <button
      type="button"
      onClick={() => {
        if (tour.active) tour.exit()
        else {
          if (window.location.hash !== hrefFor('mission')) window.location.hash = hrefFor('mission')
          tour.start()
        }
      }}
      aria-pressed={tour.active}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-white shadow-sm transition-colors hover:bg-accent/90',
        compact ? 'h-10 px-3 text-sm' : 'h-10 px-4 text-sm',
      )}
    >
      <Compass size={16} strokeWidth={2} aria-hidden />
      {t('tour.open')}
    </button>
  )
}

function NavigationPanel({ route, onClose }: { route: RouteId; onClose: () => void }) {
  const { t } = useLang()
  const { state } = useMission()

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
      transition={panelTransition}
      className="absolute top-[calc(100%+8px)] right-0 w-[min(330px,calc(100vw-24px))] overflow-hidden rounded-2xl bg-surface shadow-overlay ring-1 ring-line"
    >
      <div className="p-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = route === item.route
          return (
            <a
              key={item.route}
              href={hrefFor(item.route)}
              onClick={onClose}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                active ? 'bg-elevated text-fg' : 'text-fg hover:bg-elevated/75',
              )}
            >
              <Icon size={18} className={active ? 'text-accent' : 'text-muted'} aria-hidden />
              <span>{t(item.label)}</span>
            </a>
          )
        })}
      </div>
      <div className="border-t border-line px-3 py-3">
        <TelemetryRibbon embedded />
        <div className="mt-3"><GuidedDemoButton compact /></div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <LanguageSwitch compact />
          <div className="flex items-center gap-2 text-xs text-muted">
            <span aria-hidden className={cn('size-2 rounded-full', state.basemap === 'offline' ? 'bg-faint' : 'bg-healthy')} />
            <span>{state.basemap === 'offline' ? t('health.basemap.offline') : t('health.nominal')}</span>
            <DemoMark />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Humanised app header: one calm bar, not a collection of floating pills.
 * Desktop exposes the primary routes and search. Phones keep only brand,
 * search and menu; everything else is progressively disclosed.
 */
export function CommandBar({ route }: { route: RouteId }) {
  const { t } = useLang()
  const { mode, width } = useViewport()
  const { dispatch } = useMission()
  const navKey = `${route}:${mode}`
  const [openFor, setOpenFor] = useState<string | null>(null)
  const navOpen = openFor === navKey
  const navRef = useRef<HTMLDivElement>(null)
  const mobile = mode === 'mobile'
  const tablet = mode === 'tablet'
  const compactDesktop = !mobile && !tablet && width < 1180

  useEffect(() => {
    if (!navOpen) return
    const close = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpenFor(null)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [navOpen])

  const openSearch = () => {
    if (route !== 'mission') window.location.hash = hrefFor('mission')
    window.setTimeout(() => dispatch({ type: 'tool', tool: 'search' }), route === 'mission' ? 0 : 30)
  }

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-40">
      <div className="pointer-events-auto flex h-16 items-center border-b border-line bg-surface/96 px-3 shadow-[0_1px_8px_rgb(31_48_40/0.06)] backdrop-blur-xl sm:px-4">
        <a
          href={hrefFor('mission')}
          className="flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg py-1 pr-2"
          aria-label={`${t('brand.name')} — ${t('brand.descriptor')}`}
        >
          <BrandMark size={mobile ? 29 : 31} />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-bold tracking-[-0.015em] text-fg sm:text-base">{t('brand.name')}</span>
            {!mobile && width >= 900 ? <span className="block truncate text-[11px] font-medium text-muted">{t('brand.descriptor')}</span> : null}
          </span>
        </a>

        {!mobile && !tablet && !compactDesktop ? (
          <nav aria-label="Primary" className="ml-5 flex h-full items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = route === item.route
              return (
                <a
                  key={item.route}
                  href={hrefFor(item.route)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex h-full items-center px-3 text-sm font-medium transition-colors',
                    active ? 'text-fg' : 'text-muted hover:text-fg',
                  )}
                >
                  {t(item.label)}
                  {active ? <span aria-hidden className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" /> : null}
                </a>
              )
            })}
          </nav>
        ) : null}

        {route === 'mission' && !mobile && width >= 1180 ? (
          <button
            type="button"
            onClick={openSearch}
            className={cn(
              'ml-4 flex h-10 items-center gap-2.5 rounded-xl border border-line bg-canvas/80 px-3 text-left text-sm text-muted transition-colors hover:border-line-strong hover:bg-surface hover:text-fg',
              tablet ? 'w-[210px]' : 'w-[270px]',
            )}
          >
            <Search size={17} className="shrink-0 text-muted" aria-hidden />
            <span className="truncate">{t('rail.search.hint')}</span>
          </button>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {!mobile && width >= 1280 ? <TelemetryRibbon embedded /> : null}
          {!mobile ? <GuidedDemoButton /> : null}
          {!mobile && width >= 1180 ? <LanguageSwitch compact /> : null}

          {(mobile || tablet || compactDesktop) && route === 'mission' ? (
            <button
              type="button"
              onClick={openSearch}
              aria-label={t('rail.search')}
              className="grid size-10 place-items-center rounded-xl text-fg transition-colors hover:bg-elevated"
            >
              <Search size={21} strokeWidth={1.9} aria-hidden />
            </button>
          ) : null}

          <div ref={navRef} className="relative">
            <button
              type="button"
              onClick={() => setOpenFor((prev) => (prev === navKey ? null : navKey))}
              aria-expanded={navOpen}
              aria-haspopup="menu"
              aria-label={t('nav.menu')}
              className={cn(
                'grid size-10 place-items-center rounded-xl transition-colors',
                navOpen ? 'bg-elevated text-fg' : 'text-fg hover:bg-elevated',
                !mobile && !tablet && !compactDesktop && 'hidden',
              )}
            >
              {navOpen ? <X size={20} aria-hidden /> : <Menu size={21} aria-hidden />}
            </button>
            <AnimatePresence>{navOpen ? <NavigationPanel route={route} onClose={() => setOpenFor(null)} /> : null}</AnimatePresence>
          </div>
        </div>
      </div>


    </header>
  )
}
