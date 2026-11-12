import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'
import { useLang } from '@/lib/i18n'
import { BUDGETS, type Budget, type DeployScope } from '@/lib/deployment'
import { SITE_ORDER } from '@/data/sites'

/** Arrow-key radiogroup navigation shared by the budget and scope pickers. */
function useRoving<T>(values: readonly T[], value: T, onChange: (v: T) => void) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = values.length - 1
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = i === last ? 0 : i + 1
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = i === 0 ? last : i - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    if (next === null) return
    e.preventDefault()
    const v = values[next]
    if (v === undefined) return
    onChange(v)
    refs.current[next]?.focus()
  }
  const bind = (i: number) => ({
    ref: (el: HTMLButtonElement | null) => {
      refs.current[i] = el
    },
    tabIndex: values[i] === value ? 0 : -1,
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => onKeyDown(e, i),
  })
  return bind
}

/** 5 / 10 / 25 / 50 node budget. */
export function BudgetControl({ value, onChange }: { value: Budget; onChange: (b: Budget) => void }) {
  const { t } = useLang()
  const bind = useRoving(BUDGETS, value, onChange)
  return (
    <div>
      <p id="budget-label" className="mb-2 text-sm text-muted">
        {t('deploy.budget')}
      </p>
      <div
        role="radiogroup"
        aria-labelledby="budget-label"
        className="grid grid-cols-4 gap-1 rounded-xl border border-hairline bg-canvas/50 p-1"
      >
        {BUDGETS.map((b, i) => {
          const active = b === value
          return (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={active}
              data-budget={b}
              {...bind(i)}
              onClick={() => onChange(b)}
              className={cn(
                'flex h-11 flex-col items-center justify-center rounded-lg transition-colors duration-150',
                active ? 'bg-accent text-white' : 'text-fg hover:bg-fg/[0.06]',
              )}
            >
              <span className="numeric text-base leading-none font-semibold">{b}</span>
              <span className={cn('mt-0.5 text-[10.5px] leading-none', active ? 'text-white/85' : 'text-muted')}>
                {t('deploy.nodes')}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const SCOPES: readonly DeployScope[] = ['all', ...SITE_ORDER]

/** Which slopes compete for the budget: one ranking across both areas, or one area. */
export function ScopeControl({ value, onChange }: { value: DeployScope; onChange: (s: DeployScope) => void }) {
  const { t } = useLang()
  const bind = useRoving(SCOPES, value, onChange)
  return (
    <div>
      <p id="scope-label" className="mb-2 text-sm text-muted">
        {t('deploy.scope')}
      </p>
      <div
        role="radiogroup"
        aria-labelledby="scope-label"
        className="grid grid-cols-3 gap-0.5 rounded-lg border border-hairline bg-canvas/50 p-0.5"
      >
        {SCOPES.map((s, i) => {
          const active = s === value
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={active}
              data-scope={s}
              {...bind(i)}
              onClick={() => onChange(s)}
              className={cn(
                'h-9 truncate rounded-md px-2 text-sm transition-colors duration-150',
                active ? 'bg-fg/[0.08] text-fg' : 'text-muted hover:bg-fg/[0.04] hover:text-fg',
              )}
            >
              {s === 'all' ? t('deploy.scope.all') : t(`site.short.${s}`)}
            </button>
          )
        })}
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {value === 'all' ? t('deploy.scope.note.all') : t('deploy.scope.note.site', { site: t(`site.short.${value}`) })}
      </p>
    </div>
  )
}
