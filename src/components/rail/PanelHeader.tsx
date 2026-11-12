import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useMission } from '@/hooks/useMission'
import { useLang } from '@/lib/i18n'

/** Shared title row for rail panels: title, optional sub-line, close. */
export function PanelHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  const { dispatch } = useMission()
  const { t } = useLang()
  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2.5">
      <div className="min-w-0">
        <h2 className="text-base font-medium text-fg">{title}</h2>
        {subtitle != null ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => dispatch({ type: 'tool', tool: null })}
        aria-label={t('drawer.close')}
        className="-mr-1.5 grid size-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-fg/[0.05] hover:text-fg"
      >
        <X size={15} strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  )
}
